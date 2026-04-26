// lib/agents/feedback-agent.ts

import Anthropic from '@anthropic-ai/sdk';
import { AssessmentResult } from './types';
import { FeedbackData } from '../types';
import { loadBrain } from '../brain/index';
import { jsonrepair } from 'jsonrepair';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildFeedbackPrompt(
  klass: string,
  teema: string,
  assessment: AssessmentResult,
  studentHistory?: string | null,
  curatedResources?: string
): string {
  const brain = loadBrain(teema, klass);

  return `You are an expert Estonian teacher and educational assessment specialist — the most empathetic, evidence-based feedback writer in Estonia.

You have received the GRADED assessment from an objective grader. Your job is to transform this into rich, personalized academic feedback following all evidence-based rules. You write in Estonian using "Sa" (capitalised, formal).

CLASS: ${klass}
TOPIC: ${teema}
SUBJECT: ${brain.subject}

GRADED ASSESSMENT RESULTS:
${JSON.stringify(assessment, null, 2)}

${studentHistory ? `STUDENT HISTORY (prior tests in this subject):\n${studentHistory}\n` : ''}

CURRICULUM REFERENCE (${brain.subject}, ${klass}):
${brain.curriculum}

ASSESSMENT SCIENCE RULES (MANDATORY — ALL 12):
${brain.assessmentScience}

ESTONIAN GRADING CONTEXT:
${brain.gradingRules}

PEDAGOGY PRINCIPLES:
${brain.pedagogyPrinciples}

${curatedResources ? `CURATED MATERIALS LIBRARY:\n${curatedResources}\n` : ''}

OUTPUT FORMAT — full FeedbackData JSON:
{
  "test_info": { ... },
  "opieesmark": "...",
  "mis_laks_hasti": [ { "title": "...", "text": "..." } ],
  "mida_parandada": [ { "title": "...", "text": "..." } ],
  "uldine_muster": "...",
  "soovitused": [ { "title": "...", "text": "..." } ],
  "pilk_ettepoole": "...",
  "markmed_opetajale": "...",
  "resources": [ ... ],
  "tasks": [ ... ]
}

CRITICAL RULES:
1. ALL student-facing text in Estonian
2. Use "Sa" (capitalised)
3. NEVER mention the grade/score in the narrative text — it's in test_info.score only
4. MASTERY FRAMING throughout — learning journey, not verdict
5. PROCESS OVER PERSON — task-level and process-level only
6. START FROM STRENGTH — find what the student DID understand
7. CONCRETE NEXT STEPS — specific actions, not "study more"
8. NO COMPARISON to other students
9. tasks[] array must include every task from the assessment
10. resources[] must use only curated URLs if library was provided`;
}

export async function runFeedbackAgent(
  klass: string,
  teema: string,
  assessment: AssessmentResult,
  studentHistory?: string | null,
  curatedResources?: string
): Promise<FeedbackData> {
  const systemPrompt = buildFeedbackPrompt(klass, teema, assessment, studentHistory, curatedResources);

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Generate comprehensive academic feedback based on the graded assessment above. Write in Estonian, follow all 12 assessment science rules. Be thorough — this is the feedback the student will use to grow.`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonrepair(jsonMatch?.[0] || '{}')) as FeedbackData;
  } catch {
    throw new Error('Feedback agent failed to produce valid JSON');
  }
}
