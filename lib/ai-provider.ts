/**
 * Multi-provider AI abstraction layer.
 *
 * Supports Anthropic (Claude), OpenAI (GPT), and Google (Gemini).
 * Resolves which provider + model + API key to use based on:
 *   1. School's AIProviderConfig (if school has configured their own key)
 *   2. Teacher's personal preference (from user.preferences)
 *   3. System default (env ANTHROPIC_API_KEY + claude-sonnet-4-6)
 *
 * Also handles usage tracking and limit enforcement.
 */

import { db } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | AIContentBlock[];
}

export interface AIContentBlock {
  type: 'text' | 'image' | 'document';
  text?: string;
  // For images:
  mediaType?: string;
  data?: string; // base64
  // For documents (PDF):
  source?: { type: 'base64'; media_type: string; data: string };
}

export interface AIResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
  durationMs: number;
}

export interface AIProviderInfo {
  provider: string;
  model: string;
  apiKey: string;
  schoolId: string | null;
}

// ── Provider catalogue ───────────────────────────────────────────────────────

export const AI_PROVIDERS = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4-6',  label: 'Claude Sonnet 4.6',  maxTokens: 8192 },
      { id: 'claude-opus-4-6',    label: 'Claude Opus 4.6',    maxTokens: 4096 },
      { id: 'claude-haiku-4-5',   label: 'Claude Haiku 4.5',   maxTokens: 8192 },
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o',       label: 'GPT-4o',       maxTokens: 4096 },
      { id: 'gpt-4o-mini',  label: 'GPT-4o Mini',  maxTokens: 4096 },
      { id: 'o3',           label: 'o3',            maxTokens: 4096 },
    ],
  },
  google: {
    id: 'google',
    name: 'Google',
    models: [
      { id: 'gemini-2.5-pro',   label: 'Gemini 2.5 Pro',   maxTokens: 8192 },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', maxTokens: 8192 },
    ],
  },
} as const;

export type ProviderKey = keyof typeof AI_PROVIDERS;

export function getProviderForModel(modelId: string): ProviderKey {
  for (const [key, prov] of Object.entries(AI_PROVIDERS)) {
    if (prov.models.some(m => m.id === modelId)) return key as ProviderKey;
  }
  return 'anthropic'; // fallback
}

// ── Simple encryption for API keys at rest ───────────────────────────────────

const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_SECRET || 'opetaja-tagasiside-default-key-change-me';

export function encryptApiKey(plainKey: string): string {
  // Simple XOR + base64 — in production, use AES-256-GCM via Node crypto
  const keyBytes = Buffer.from(ENCRYPTION_KEY, 'utf8');
  const input = Buffer.from(plainKey, 'utf8');
  const output = Buffer.alloc(input.length);
  for (let i = 0; i < input.length; i++) {
    output[i] = input[i] ^ keyBytes[i % keyBytes.length];
  }
  return output.toString('base64');
}

export function decryptApiKey(encrypted: string): string {
  const keyBytes = Buffer.from(ENCRYPTION_KEY, 'utf8');
  const input = Buffer.from(encrypted, 'base64');
  const output = Buffer.alloc(input.length);
  for (let i = 0; i < input.length; i++) {
    output[i] = input[i] ^ keyBytes[i % keyBytes.length];
  }
  return output.toString('utf8');
}

// ── Resolve provider for a given teacher ─────────────────────────────────────

export async function resolveProvider(
  teacherProfileId: string,
  preferredModel?: string | null,
): Promise<AIProviderInfo> {
  // 1. Find teacher's school
  const teacherSchool = await db.teacherSchool.findFirst({
    where: { teacherId: teacherProfileId },
    select: { schoolId: true },
  });
  const schoolId = teacherSchool?.schoolId || null;

  // 2. Check if school has configured providers
  if (schoolId) {
    // If teacher has a preferred model, find matching school provider
    if (preferredModel) {
      const providerKey = getProviderForModel(preferredModel);
      const config = await db.aIProviderConfig.findFirst({
        where: { schoolId, provider: providerKey, isActive: true },
      });
      if (config) {
        // Check model is in allowed list
        const allowed: string[] = JSON.parse(config.allowedModels || '[]');
        const model = allowed.includes(preferredModel) ? preferredModel : config.defaultModel;
        return {
          provider: providerKey,
          model,
          apiKey: decryptApiKey(config.apiKeyEncrypted),
          schoolId,
        };
      }
    }

    // Fall back to school's default provider
    const defaultConfig = await db.aIProviderConfig.findFirst({
      where: { schoolId, isDefault: true, isActive: true },
    });
    if (defaultConfig) {
      return {
        provider: defaultConfig.provider,
        model: defaultConfig.defaultModel,
        apiKey: decryptApiKey(defaultConfig.apiKeyEncrypted),
        schoolId,
      };
    }

    // Fall back to any active school provider
    const anyConfig = await db.aIProviderConfig.findFirst({
      where: { schoolId, isActive: true },
    });
    if (anyConfig) {
      return {
        provider: anyConfig.provider,
        model: anyConfig.defaultModel,
        apiKey: decryptApiKey(anyConfig.apiKeyEncrypted),
        schoolId,
      };
    }
  }

  // 3. System default: configurable via AI_DEFAULT_PROVIDER env var.
  // Defaults to 'anthropic'. Set to 'openai' for hackathons (organizer credits)
  // or 'google' for Gemini. Each provider's API key read from its own env var.
  const defaultProvider = (process.env.AI_DEFAULT_PROVIDER as ProviderKey) || 'anthropic';
  const defaultModelByProvider: Record<ProviderKey, string> = {
    anthropic: 'claude-sonnet-4-6',
    openai: 'gpt-4o',
    google: 'gemini-2.5-pro',
  };
  const apiKeyEnvByProvider: Record<ProviderKey, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_API_KEY',
  };
  // If teacher prefers a model from a non-default provider, honour that.
  const useProvider = preferredModel
    ? getProviderForModel(preferredModel)
    : defaultProvider;
  const useModel = preferredModel
    ? preferredModel
    : (process.env.AI_DEFAULT_MODEL || defaultModelByProvider[defaultProvider]);
  return {
    provider: useProvider,
    model: useModel,
    apiKey: process.env[apiKeyEnvByProvider[useProvider]] || '',
    schoolId,
  };
}

// ── Usage limit check ────────────────────────────────────────────────────────

export async function checkUsageLimit(
  schoolId: string | null,
  teacherProfileId: string,
): Promise<{ allowed: boolean; reason?: string; used?: number; limit?: number }> {
  if (!schoolId) return { allowed: true }; // no school = no limits

  // Find teacher-specific limit, or school-wide default
  const limit = await db.teacherUsageLimit.findFirst({
    where: {
      schoolId,
      isActive: true,
      OR: [
        { teacherProfileId },
        { teacherProfileId: null }, // school-wide default
      ],
    },
    orderBy: { teacherProfileId: 'desc' }, // teacher-specific takes priority (non-null first)
  });

  if (!limit) return { allowed: true }; // no limit set

  // Count usage this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthUsage = await db.aIUsageLog.aggregate({
    where: {
      schoolId,
      teacherProfileId,
      createdAt: { gte: monthStart },
      success: true,
    },
    _sum: { inputTokens: true, outputTokens: true },
    _count: true,
  });

  const totalTokens = (monthUsage._sum.inputTokens || 0) + (monthUsage._sum.outputTokens || 0);
  const requestCount = monthUsage._count || 0;

  if (totalTokens >= limit.monthlyTokenLimit) {
    return {
      allowed: false,
      reason: `Kuu tokenite limiit täis (${totalTokens.toLocaleString()} / ${limit.monthlyTokenLimit.toLocaleString()})`,
      used: totalTokens,
      limit: limit.monthlyTokenLimit,
    };
  }

  if (requestCount >= limit.monthlyRequestLimit) {
    return {
      allowed: false,
      reason: `Kuu päringute limiit täis (${requestCount} / ${limit.monthlyRequestLimit})`,
      used: requestCount,
      limit: limit.monthlyRequestLimit,
    };
  }

  return { allowed: true, used: totalTokens, limit: limit.monthlyTokenLimit };
}

// ── Log usage ────────────────────────────────────────────────────────────────

export async function logUsage(params: {
  schoolId: string | null;
  teacherProfileId: string;
  provider: string;
  model: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
}) {
  if (!params.schoolId) return; // no school = no tracking (system default)
  await db.aIUsageLog.create({
    data: {
      schoolId: params.schoolId,
      teacherProfileId: params.teacherProfileId,
      provider: params.provider,
      model: params.model,
      operation: params.operation,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      durationMs: params.durationMs,
      success: params.success,
      errorMessage: params.errorMessage || null,
    },
  });
}

// ── Universal AI call ────────────────────────────────────────────────────────

/**
 * Send a message to any supported AI provider.
 * Currently fully implements Anthropic. OpenAI and Google use the same
 * Anthropic SDK format since the backend converts — in production you'd
 * use each provider's native SDK.
 */
export async function callAI(params: {
  providerInfo: AIProviderInfo;
  systemPrompt: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | Anthropic.ContentBlockParam[];
  }>;
  maxTokens?: number;
  temperature?: number;
}): Promise<AIResponse> {
  const { providerInfo, systemPrompt, messages, maxTokens = 4096, temperature } = params;
  const startTime = Date.now();

  // Currently all providers route through Anthropic SDK format.
  // In production, OpenAI and Google would use their own SDKs.
  // For the demo, the school admin enters their API key, and we
  // call whichever provider's API using the appropriate SDK.

  if (providerInfo.provider === 'anthropic') {
    const client = new Anthropic({ apiKey: providerInfo.apiKey });
    const response = await client.messages.create({
      model: providerInfo.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages as Anthropic.MessageParam[],
      ...(temperature !== undefined ? { temperature } : {}),
    });

    const text = response.content.find(b => b.type === 'text')?.text ?? '';
    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: providerInfo.model,
      provider: 'anthropic',
      durationMs: Date.now() - startTime,
    };
  }

  if (providerInfo.provider === 'openai') {
    // OpenAI-compatible call via fetch (avoids adding openai SDK as dependency)
    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content.map(b => {
          if (b.type === 'text') return { type: 'text' as const, text: (b as Anthropic.TextBlockParam).text };
          if (b.type === 'image') {
            const img = b as Anthropic.ImageBlockParam;
            return {
              type: 'image_url' as const,
              image_url: { url: `data:${(img.source as { media_type: string; data: string }).media_type};base64,${(img.source as { data: string }).data}` },
            };
          }
          return { type: 'text' as const, text: '[unsupported block]' };
        }),
      })),
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerInfo.apiKey}`,
      },
      body: JSON.stringify({
        model: providerInfo.model,
        messages: openaiMessages,
        max_tokens: maxTokens,
        ...(temperature !== undefined ? { temperature } : {}),
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'OpenAI API error');

    return {
      text: data.choices?.[0]?.message?.content || '',
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
      model: providerInfo.model,
      provider: 'openai',
      durationMs: Date.now() - startTime,
    };
  }

  if (providerInfo.provider === 'google') {
    // Google Gemini API via fetch
    const geminiContents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: typeof m.content === 'string'
        ? [{ text: m.content }]
        : m.content.map(b => {
            if (b.type === 'text') return { text: (b as Anthropic.TextBlockParam).text };
            if (b.type === 'image') {
              const img = b as Anthropic.ImageBlockParam;
              return { inline_data: { mime_type: (img.source as { media_type: string }).media_type, data: (img.source as { data: string }).data } };
            }
            return { text: '[unsupported block]' };
          }),
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${providerInfo.model}:generateContent?key=${providerInfo.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiContents,
          generationConfig: {
            maxOutputTokens: maxTokens,
            ...(temperature !== undefined ? { temperature } : {}),
          },
        }),
      },
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Google API error');

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      text,
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
      model: providerInfo.model,
      provider: 'google',
      durationMs: Date.now() - startTime,
    };
  }

  // Unknown provider fallback
  throw new Error(`Tundmatu AI pakkuja: ${providerInfo.provider}`);
}
