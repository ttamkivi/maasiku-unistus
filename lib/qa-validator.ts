/**
 * QA Validator — Pass 2 of the feedback pipeline.
 *
 * TEXT-ONLY — does NOT re-read the test photos. Trusts pass 1's reading of
 * the paper. Instead validates the educational quality of the feedback:
 *
 * 1. Physics accuracy — are explanations, formulas, units correct?
 * 2. Error classification — do väärarusaam/arvutusviga/etc labels match?
 * 3. Scoring consistency — do points, is_correct, and narrative agree?
 * 4. Curriculum alignment — right objectives for this class/topic?
 * 5. Tone & assessment science — mastery framing, no self-level, "Sa" etc.
 * 6. Completeness — no empty fields, real resources, actionable advice?
 *
 * Returns: corrected feedback JSON + QA audit log.
 */

import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import { FeedbackData } from './types';
import { CURRICULUM } from './curriculum';
import { ASSESSMENT_RULES } from './assessment-rules';

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
  dimension: 'accuracy' | 'classification' | 'scoring' | 'curriculum' | 'tone' | 'completeness';
  severity: 'critical' | 'important' | 'minor' | 'ok';
  finding: string;
  correction: string | null;
}

function buildQAPrompt(klass: string, teema: string): string {
  return `You are a senior educational QA reviewer for an Estonian physics feedback system. You receive the AI-generated feedback JSON from pass 1 (which read a student's test paper).

You do NOT have the original test photos. Trust that pass 1 correctly read the student's answers. Your job is to validate the EDUCATIONAL QUALITY of the feedback — are the physics explanations correct? Are the conclusions sound? Is the tone appropriate?

Context:
- Class: ${klass}
- Topic: ${teema}

CURRICULUM REFERENCE:
${CURRICULUM}

ASSESSMENT SCIENCE RULES:
${ASSESSMENT_RULES}

## What to check and fix:

### 1. PHYSICS ACCURACY (critical)
- Are the physics explanations in mis_laks_hasti and mida_parandada factually correct?
- Are formulas, units, and physical relationships described correctly?
- If the feedback says "Ohmi seadus: U = I/R" — that's WRONG (should be U = IR). Fix it.
- If the feedback says gravitational acceleration is 10 m/s² — acceptable for school level
- Check that "what_went_right" and "what_went_wrong" in tasks[] contain correct physics

### 2. ERROR CLASSIFICATION (important)
- Each error in mida_parandada should be classified: väärarusaam (misconception), valemisegadus (formula mix-up), arvutusviga (calculation), ühikuviga (units), poolik arutlus (incomplete reasoning), ülesande vääritimõistmine (misread task)
- Verify the classification matches the described error
- A calculation mistake labelled as "väärarusaam" is wrong — fix the label

### 3. SCORING CONSISTENCY (important)
- Does is_correct in each task match the what_went_right / what_went_wrong content?
- If all tasks are correct but uldine_muster sounds negative — fix the tone
- If most tasks are wrong but feedback is overly positive — balance it
- Do points_earned / points_possible make sense for the described performance?

### 4. CURRICULUM ALIGNMENT (important)
- Does opieesmark match the actual learning objectives for ${teema} in class ${klass}?
- Does pilk_ettepoole correctly describe what follows in the curriculum?
- Are curriculum references accurate for the school level (põhikool III kooliaste)?
- Fix any misaligned curriculum references

### 5. TONE & ASSESSMENT SCIENCE (important)
- Must use "Sa" (capitalised) when addressing student — fix lowercase "sa"
- Must be mastery-framed ("Sa oled õppimas..."), NEVER performance-framed
- Must use task/process level feedback, NEVER self-level ("Tubli!" → remove)
- Must use informational language ("Pane tähele...", "Proovi...")
- Must NEVER compare to other students or class averages
- Must NOT repeat the grade/score in narrative text (it belongs in test_info only)
- Fix any violations

### 6. COMPLETENESS (important)
- uldine_muster must not be empty — if it is, write a proper summary from the tasks
- tasks[] must have at least 1 entry
- mis_laks_hasti must have at least 1 genuine strength (not empty praise)
- soovitused must have concrete, actionable steps (not "study more")
- resources[] URLs — flag any that look fabricated (e.g. made-up paths on real domains)
- markmed_opetajale should contain diagnostic teacher notes, not repeat student feedback

## OUTPUT FORMAT

Return valid JSON with exactly this structure:
{
  "corrected_feedback": { <the full corrected FeedbackData JSON — same schema as input> },
  "score": <0-100 overall quality score>,
  "log": [
    {
      "dimension": "accuracy|classification|scoring|curriculum|tone|completeness",
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
- Log EVERYTHING you checked, even if it was fine (severity "ok")
- Do NOT invent new tasks or change the student's answers — those come from pass 1`;
}

export async function validateFeedback(
  rawFeedback: FeedbackData,
  klass: string,
  teema: string
): Promise<QAResult> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    metadata: { user_id: 'qa-validator' },
    system: buildQAPrompt(klass, teema),
    messages: [
      {
        role: 'user',
        content: `Here is the AI-generated feedback from pass 1. Please validate the educational quality and correct any issues:\n\n${JSON.stringify(rawFeedback, null, 2)}`,
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
