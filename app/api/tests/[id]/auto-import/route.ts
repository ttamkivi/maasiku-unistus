import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import { uploadPhotoToBlob } from '@/lib/blob';
import { captureServerEvent } from '@/lib/posthog-server';
import { resolveProvider, checkUsageLimit, logUsage } from '@/lib/ai-provider';

// Fallback client for when school has no custom provider configured
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getTeacherSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.teacherProfile && session.user.role !== 'SUPERADMIN') return null;
  return session;
}

// ── Fuzzy matching (server-side copy) ────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

type Confidence = 'high' | 'medium' | 'low' | 'none';

interface RosterStudent {
  id: string;
  name: string;
  hasConsent: boolean;
}

function fuzzyMatch(
  rawName: string | null,
  roster: RosterStudent[]
): { studentId: string | null; confidence: Confidence } {
  if (!rawName || roster.length === 0) return { studentId: null, confidence: 'none' };

  const query = normalize(rawName);
  const queryParts = query.split(/\s+/);
  const queryFirst = queryParts[0] ?? '';
  const queryLastInitial = queryParts.length > 1 ? queryParts[queryParts.length - 1][0] : null;

  let bestId: string | null = null;
  let bestScore = Infinity;
  let bestConfidence: Confidence = 'none';

  for (const s of roster) {
    const norm = normalize(s.name);
    if (norm === query) return { studentId: s.id, confidence: 'high' };

    const parts = norm.split(/\s+/);
    const first = parts[0] ?? '';
    const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] : null;

    if (queryFirst && first === queryFirst && queryLastInitial && lastInitial === queryLastInitial) {
      if (bestConfidence !== 'high') { bestId = s.id; bestConfidence = 'high'; bestScore = 0; }
      continue;
    }

    if (queryFirst && first === queryFirst && queryParts.length === 1) {
      if (bestConfidence === 'none' || bestConfidence === 'low') { bestId = s.id; bestConfidence = 'medium'; bestScore = 0; }
      continue;
    }

    const dist = levenshtein(query, norm);
    const maxLen = Math.max(query.length, norm.length);
    const ratio = dist / maxLen;

    if (ratio < 0.3 && dist < bestScore) {
      bestScore = dist; bestId = s.id; bestConfidence = ratio < 0.15 ? 'high' : 'medium';
    } else if (ratio < 0.5 && bestConfidence === 'none' && dist < bestScore) {
      bestScore = dist; bestId = s.id; bestConfidence = 'low';
    }
  }

  return { studentId: bestId, confidence: bestConfidence };
}

// ── POST /api/tests/[id]/auto-import ─────────────────────────────────────────
// One-shot: receives page images, identifies names, matches roster, creates results.
// Returns a summary with any issues (unmatched names, missing consent).

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await getTeacherSession(token);
    if (!session) return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });

    const teacherProfile = session.user.teacherProfile!;
    const { id } = await params;

    const test = await db.test.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, classId: true, subjectId: true },
    });
    if (!test) return NextResponse.json({ error: 'Testi ei leitud' }, { status: 404 });

    const body = await request.json();
    const { pages } = body as { pages: string[] };

    if (!pages || pages.length === 0) {
      return NextResponse.json({ error: 'Lehed puuduvad' }, { status: 400 });
    }
    if (pages.length > 50) {
      return NextResponse.json({ error: 'Maksimaalselt 50 lehte korraga' }, { status: 400 });
    }

    // ── Step 1: Get roster + consent ──
    let roster: RosterStudent[] = [];
    if (test.classId) {
      const students = await db.studentProfile.findMany({
        where: { classId: test.classId },
        include: {
          user: { select: { id: true, name: true } },
          consentGrants: {
            where: {
              status: 'ACTIVE',
              ...(test.subjectId ? {
                OR: [
                  { scope: 'ALL_SUBJECTS' },
                  { scope: 'SPECIFIC_SUBJECT', subjectId: test.subjectId },
                ],
              } : {}),
            },
            take: 1,
          },
        },
        orderBy: { user: { name: 'asc' } },
      });
      roster = students.map(s => ({
        id: s.id,
        name: s.user.name,
        hasConsent: s.consentGrants.length > 0,
      }));
    }

    // ── Step 2: AI name identification (batched) ──
    // Resolve which AI provider + model to use for this teacher's school
    const providerInfo = await resolveProvider(teacherProfile.id);

    // Check usage limits before making any AI calls
    const usageCheck = await checkUsageLimit(providerInfo.schoolId, teacherProfile.id);
    if (!usageCheck.allowed) {
      return NextResponse.json({ error: usageCheck.reason || 'Kasutuslimiit täis' }, { status: 429 });
    }

    const nameMap = new Map<number, string | null>();
    const BATCH = 20;

    for (let start = 0; start < pages.length; start += BATCH) {
      const slice = pages.slice(start, start + BATCH);
      const imageBlocks: Anthropic.ImageBlockParam[] = slice.map((b64) => ({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
      }));

      const textBlock: Anthropic.TextBlockParam = {
        type: 'text',
        text: `These are scanned pages from student test papers. There are ${slice.length} images (numbered 1 to ${slice.length} in the order provided).

For each image, find the student's full name. The name is usually at the top of the page (e.g., "Nimi:", "Õpilane:", or written in a header field). If you cannot find a name, use null.

Return ONLY valid JSON in this exact format, no other text:
{
  "pages": [
    {"index": 0, "name": "Eesnimi Perenimi"},
    {"index": 1, "name": null},
    ...
  ]
}`,
      };

      // Use school's configured provider or system default
      const aiStartTime = Date.now();
      let rawText = '{}';
      let inputTokens = 0;
      let outputTokens = 0;
      try {
        if (providerInfo.provider === 'anthropic') {
          const client = new Anthropic({ apiKey: providerInfo.apiKey });
          const response = await client.messages.create({
            model: providerInfo.model,
            max_tokens: 1024,
            messages: [{ role: 'user', content: [...imageBlocks, textBlock] }],
          });
          rawText = response.content.find((b) => b.type === 'text')?.text ?? '{}';
          inputTokens = response.usage.input_tokens;
          outputTokens = response.usage.output_tokens;
        } else {
          // For OpenAI / Google, use the callAI helper
          const { callAI } = await import('@/lib/ai-provider');
          const aiResp = await callAI({
            providerInfo,
            systemPrompt: '',
            messages: [{ role: 'user', content: [...imageBlocks, textBlock] as Anthropic.ContentBlockParam[] }],
            maxTokens: 1024,
          });
          rawText = aiResp.text;
          inputTokens = aiResp.inputTokens;
          outputTokens = aiResp.outputTokens;
        }

        // Log usage
        await logUsage({
          schoolId: providerInfo.schoolId,
          teacherProfileId: teacherProfile.id,
          provider: providerInfo.provider,
          model: providerInfo.model,
          operation: 'auto_import',
          inputTokens,
          outputTokens,
          durationMs: Date.now() - aiStartTime,
          success: true,
        });
      } catch (aiError) {
        await logUsage({
          schoolId: providerInfo.schoolId,
          teacherProfileId: teacherProfile.id,
          provider: providerInfo.provider,
          model: providerInfo.model,
          operation: 'auto_import',
          inputTokens: 0,
          outputTokens: 0,
          durationMs: Date.now() - aiStartTime,
          success: false,
          errorMessage: aiError instanceof Error ? aiError.message : 'Unknown error',
        });
        throw aiError;
      }

      let parsed: { pages: Array<{ index: number; name: string | null }> };
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : { pages: [] };
      }

      for (const p of parsed.pages ?? []) {
        nameMap.set(start + p.index, p.name ?? null);
      }
    }

    // ── Step 3: Fuzzy match + group pages by student ──
    interface PageAssignment {
      index: number;
      aiName: string | null;
      matchedStudentId: string | null;
      matchedStudentName: string | null;
      confidence: Confidence;
      hasConsent: boolean;
    }

    const pageAssignments: PageAssignment[] = pages.map((_, i) => {
      const aiName = nameMap.get(i) ?? null;
      const { studentId, confidence } = fuzzyMatch(aiName, roster);
      const matchedStudent = roster.find(s => s.id === studentId);
      return {
        index: i,
        aiName,
        matchedStudentId: studentId,
        matchedStudentName: matchedStudent?.name ?? null,
        confidence,
        hasConsent: matchedStudent?.hasConsent ?? false,
      };
    });

    // Group pages by resolved student name
    const grouped: Array<{
      studentName: string;
      studentId: string | null;
      photos: string[];
      confidence: Confidence;
      hasConsent: boolean;
    }> = [];

    for (const pa of pageAssignments) {
      const name = pa.matchedStudentName ?? pa.aiName ?? `Tundmatu leht ${pa.index + 1}`;
      const existing = grouped.find(g => g.studentName === name);
      if (existing) {
        existing.photos.push(pages[pa.index]);
      } else {
        grouped.push({
          studentName: name,
          studentId: pa.matchedStudentId,
          photos: [pages[pa.index]],
          confidence: pa.confidence,
          hasConsent: pa.hasConsent,
        });
      }
    }

    // ── Step 4: Deduplicate — skip students that already have a result in this test ──
    const existingResults = await db.testResult.findMany({
      where: { testId: id },
      select: { studentName: true },
    });
    const existingNames = new Set(
      existingResults.map((r) => (r.studentName ?? '').trim().toLowerCase())
    );

    const newGrouped = grouped.filter(
      (g) => !existingNames.has(g.studentName.trim().toLowerCase())
    );
    const skippedDuplicates = grouped.length - newGrouped.length;

    // ── Step 5: Identify issues ──
    const issues: string[] = [];
    const lowConfidence = newGrouped.filter(g => g.confidence === 'low' || g.confidence === 'none');
    const noConsent = newGrouped.filter(g => !g.hasConsent);

    if (skippedDuplicates > 0) {
      issues.push(`${skippedDuplicates} õpilast juba olemas — jäetud vahele`);
    }
    if (lowConfidence.length > 0) {
      issues.push(`${lowConfidence.length} õpilast, keda ei suudetud kindlalt tuvastada: ${lowConfidence.map(g => g.studentName).join(', ')}`);
    }
    if (noConsent.length > 0) {
      issues.push(`${noConsent.length} õpilasel puudub lapsevanema nõusolek: ${noConsent.map(g => g.studentName).join(', ')}`);
    }

    // ── Step 6: Create TestResult records (for new students only) ──
    const created = await Promise.all(
      newGrouped.map(async (g, studentIdx) => {
        const photoRecords = await Promise.all(
          g.photos.map(async (photo, pageIdx) => {
            const blobResult = await uploadPhotoToBlob(
              photo,
              `auto-${Date.now()}-s${studentIdx}-p${pageIdx}.jpg`
            );
            return blobResult
              ? { storageMode: 'blob', storageKey: blobResult.url, base64Data: null as string | null }
              : { storageMode: 'local_only', base64Data: photo };
          })
        );

        return db.testResult.create({
          data: {
            testId: id,
            studentName: g.studentName.trim(),
            studentId: g.studentId || null,
            status: 'UPLOADED',
            storageMode: photoRecords.some(p => p.storageMode === 'blob') ? 'blob' : 'local_only',
            uploadedAt: new Date(),
            photos: { create: photoRecords },
          },
          select: { id: true, studentName: true },
        });
      })
    );

    captureServerEvent(session.user.id, 'auto_import_completed', {
      testId: id,
      studentCount: created.length,
      pageCount: pages.length,
      issueCount: issues.length,
    });

    return NextResponse.json({
      created: created.map(c => ({ id: c.id, studentName: c.studentName })),
      summary: {
        studentsCreated: created.length,
        pagesProcessed: pages.length,
        issues,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/tests/[id]/auto-import error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
