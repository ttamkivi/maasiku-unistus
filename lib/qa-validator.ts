/**
 * QA Validator — Pass 2 of the feedback pipeline.
 *
 * Takes the raw AI feedback (pass 1) + original test images and validates:
 * 1. Task count — does the number of tasks match what's visible in the photos?
 * 2. Factual accuracy — are physics explanations correct?
 * 3. Scoring consistency — do points add up, does is_correct match the explanation?
 * 4. Curriculum alignment — does feedback reference the right curriculum objectives?
 * 5. Tone & assessment science — follows the 12 rules from ASSESSMENT_RULES?
 * 6. Completeness — are all required fields filled (uldine_muster, tasks, etc.)?
 *
 * Returns: corrected feedback JSON + QA audit log.
 */

import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import { FeedbackData } from './types';
import { CURRICULUM } from './curriculum';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface QAResult {
  /** The corrected/improved feedback — replaces rawFeedback as what teacher sees */
  correctedFeedback: FeedbackData;
  /** Overall quality score 0-100 */
  score: number;
  /** Structured log of what was checked and changed */
  log: QALogEntry[];
  /** Whether any corrections were made */
  hadCorrections: boolean;
}

export interface QALogEntry {
  dimension: 'task_count' | 'accuracy' | 'scoring' | 'curriculum' | 'tone' | 'completeness';
  severity: 'critical' | 'important' | 'minor' | 'ok';
  finding: string;
  correction: string | null;
}

function buildQAPrompt(klass: string, teema: string): string {
  return `You are a senior QA reviewer for an Estonian physics education feedback system. You receive:
1. The original test paper photos (same images the AI analysed)
2. The AI-generated feedback JSON from pass 1

Your job: validate, correct, and improve the feedback BEFORE a teacher sees it.

Context:
- Class: ${klass}
- Topic: ${teema}

CURRICULUM REFERENCE:
${CURRICULUM}

## What to check and fix:

### 1. TASK COUNT (critical)
- Count the numbered tasks/questions visible in the test paper photos
- Compare to tasks[] array length in the feedback
- If tasks are MISSING: add them with what you can determine from the photos
- If extra tasks exist that aren't in the photos: remove them

### 2. FACTUAL ACCURACY (critical)
- Verify physics explanations are correct
- Check formulas, units, and calculations mentioned in the feedback
- Fix any incorrect physics claims
- Verify error classifications (väärarusaam, arvutusviga, etc.) match the actual error

### 3. SCORING CONSISTENCY (important)
- Check that is_correct matches what_went_right / what_went_wrong
- Verify points_earned vs points_possible make sense
- Check that task assessments align with uldine_muster (summary)

### 4. CURRICULUM ALIGNMENT (important)
- Verify the feedback references curriculum objectives appropriate for the class level
- Check that pilk_ettepoole correctly describes what comes next in the curriculum
- Verify opieesmark matches the actual learning objectives for this topic

### 5. TONE & ASSESSMENT SCIENCE (important)
- Must use "Sa" (capitalised) when addressing student
- Must be mastery-framed, never performance-framed
- Must use task/process level feedback, never self-level ("Tubli!" is banned)
- Must use informational language ("Pane tähele...", "Proovi...")
- Must never compare to other students
- Fix any violations

### 6. COMPLETENESS (important)
- uldine_muster must not be empty
- tasks[] must have at least 1 entry
- mis_laks_hasti must have at least 1 entry (find genuine strength even in weak work)
- soovitused must have concrete, actionable steps
- resources should have real URLs (flag any that look fabricated)

## OUTPUT FORMAT

Return valid JSON with exactly this structure:
{
  "corrected_feedback": { <the full corrected FeedbackData JSON — same schema as input> },
  "score": <0-100 overall quality score>,
  "log": [
    {
      "dimension": "task_count|accuracy|scoring|curriculum|tone|completeness",
      "severity": "critical|important|minor|ok",
      "finding": "What was found (in Estonian)",
      "correction": "What was changed, or null if OK"
    }
  ]
}

RULES:
- Return the COMPLETE corrected_feedback, not just the changes
- If everything is perfect, return the original feedback unchanged with score 90+
- Fix issues in-place — the corrected version should be ready for the teacher
- All feedback text must remain in Estonian
- Be conservative: only change things you're confident are wrong
- Log EVERYTHING you checked, even if it was fine (severity "ok")`;
}

export async function validateFeedback(
  rawFeedback: FeedbackData,
  images: string[],
  klass: string,
  teema: string
): Promise<QAResult> {
  const imageBlocks = images.map((base64) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: base64,
    },
  }));

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    metadata: { user_id: 'qa-validator' },
    system: buildQAPrompt(klass, teema),
    messages: [
      {
        role: 'user',
        content: [
          ...imageBlocks,
          {
            type: 'text',
            text: `Here is the AI-generated feedback from pass 1. Please validate and correct it:\n\n${JSON.stringify(rawFeedback, null, 2)}`,
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from QA validator');
  }

  let jsonText = content.text.trim();

  // Strip markdown code fences if present
  const jsonMatch = jsonText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  } else {
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      jsonText = jsonText.slice(start, end + 1);
    }
  }

  let parsed: {
    corrected_feedback: FeedbackData;
    score: number;
    log: QALogEntry[];
  };

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    const repaired = jsonrepair(jsonText);
    parsed = JSON.parse(repaired);
  }

  const hadCorrections = parsed.log.some(
    (entry) => entry.correction !== null && entry.severity !== 'ok'
  );

  return {
    correctedFeedback: parsed.corrected_feedback,
    score: parsed.score,
    log: parsed.log,
    hadCorrections,
  };
}
