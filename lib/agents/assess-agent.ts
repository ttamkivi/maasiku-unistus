// lib/agents/assess-agent.ts

import Anthropic from '@anthropic-ai/sdk';
import { StudentSegment, AssessmentResult } from './types';
import { ESTONIAN_GRADING_RULES } from '../brain/grading';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildAssessmentPrompt(rubric?: string | null, answerKey?: string | null): string {
  return `You are an objective grader for Estonian school tests. Your ONLY job is to:
1. Read each task/question from the student's work
2. Compare the student's answer to the correct answer (if provided)
3. Assign points and classify error types
4. Identify patterns across all errors

You do NOT write feedback. You do NOT address the student. You do NOT make suggestions.
You ONLY evaluate and score — like a marking machine.

${rubric ? `RUBRIC PROVIDED BY TEACHER:\n${rubric}\n` : 'No rubric provided — use your subject knowledge to assess correctness.'}
${answerKey ? `ANSWER KEY:\n${answerKey}\n` : ''}

GRADING STANDARDS:
${ESTONIAN_GRADING_RULES}

ERROR CLASSIFICATION (use these exact terms):
- vaararusaam — conceptual misunderstanding (wrong mental model)
- valemisegadus — formula confusion (wrong formula selected)
- arvutusviga — calculation error (correct approach, wrong arithmetic)
- uhikuviga — unit error (missing or wrong unit)
- poolik_arutlus — incomplete reasoning (correct direction, unfinished)
- vaaritimõistmine — task misread (solved a different problem)

OUTPUT FORMAT — respond in valid JSON only:
{
  "tasks": [
    {
      "number": 1,
      "questionSummary": "Brief description of what task 1 asked (1 sentence)",
      "studentAnswer": "What the student wrote, summarized faithfully",
      "correctAnswer": "The correct answer (from rubric or your knowledge)",
      "isCorrect": true,
      "errorType": null,
      "pointsEarned": 5,
      "pointsPossible": 5,
      "graderNotes": "Internal note: why this is correct/incorrect (for teacher)"
    }
  ],
  "totalPointsEarned": 32,
  "totalPointsPossible": 50,
  "percentage": 64,
  "suggestedGrade": "5",
  "errorPattern": "2-3 sentence summary of what the errors collectively reveal about the student's understanding",
  "gradingConfidence": "high|medium|low",
  "gradingNotes": "Any grader uncertainty, rubric ambiguities, or notes for the teacher"
}

RULES:
1. List EVERY numbered task you find — never skip one
2. isCorrect = true (fully correct), false (wrong), null (partial credit)
3. For partial credit: explain in graderNotes what was right and what was wrong
4. If no rubric and you're unsure: note in gradingNotes and set gradingConfidence to "low"
5. errorType is null for correct answers
6. suggestedGrade uses the 10-point Estonian scale
7. Output raw JSON — no markdown fences, no explanation`;
}

export async function runAssessmentAgent(
  segment: StudentSegment,
  rubric?: string | null,
  answerKey?: string | null,
  rubricImages?: string[]
): Promise<AssessmentResult> {
  const imageContent = segment.pages.map(p => ({
    type: 'image' as const,
    source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: p.base64Image },
  }));

  // Add rubric images if provided
  const rubricImageContent = (rubricImages || []).map(img => ({
    type: 'image' as const,
    source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: img },
  }));

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: buildAssessmentPrompt(rubric, answerKey),
    messages: [
      {
        role: 'user',
        content: [
          ...imageContent,
          ...(rubricImageContent.length > 0 ? [{ type: 'text' as const, text: 'Rubric/marking scheme images follow:' }, ...rubricImageContent] : []),
          {
            type: 'text',
            text: 'Please assess this student test paper. Grade each task and identify error types.',
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

  try {
    const { jsonrepair } = await import('jsonrepair');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonrepair(jsonMatch?.[0] || '{}'));
    return parsed as AssessmentResult;
  } catch {
    return {
      tasks: [],
      totalPointsEarned: null,
      totalPointsPossible: null,
      percentage: null,
      suggestedGrade: null,
      errorPattern: 'Assessment agent could not parse the test.',
      gradingConfidence: 'low',
      gradingNotes: 'Parsing failed — teacher review required.',
    };
  }
}
