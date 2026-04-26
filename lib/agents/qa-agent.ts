// lib/agents/qa-agent.ts

import Anthropic from '@anthropic-ai/sdk';
import { DigitalizationResult, AssessmentResult, QAResult } from './types';
import { FeedbackData } from '../types';
import { ASSESSMENT_SCIENCE } from '../brain/assessment';
import { jsonrepair } from 'jsonrepair';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const QA_SYSTEM_PROMPT = `You are a quality assurance specialist for an AI-generated student feedback system. You check whether three AI agents did their work correctly.

Your job is to:
1. Verify Agent 1 (Digitalization) identified students correctly
2. Verify Agent 2 (Assessment) graded consistently and correctly
3. Verify Agent 3 (Feedback) followed all 12 assessment science rules
4. Flag any violations, suggest corrections, and give an overall approval decision

THE 12 ASSESSMENT SCIENCE RULES TO CHECK:
${ASSESSMENT_SCIENCE}

ADDITIONAL QA CHECKS:
- Does the feedback contain any student name? (should be "Sa" only — privacy violation if real name)
- Does the feedback compare to other students? (Rule 11 violation)
- Does the feedback include grade/score in the narrative text? (Rule 1 violation)
- Does feedback address the student at a self level? ("Tubli!" / "Sa oled nõrk") (Rule 3 violation)
- Does each mida_parandada item have a concrete next step? (Rule 9 violation)
- Are ALL tasks from the assessment present in feedback.tasks[]? (completeness check)
- Are grade percentages consistent (assessment.percentage ≈ what's implied in feedback)?

OUTPUT FORMAT — respond in valid JSON:
{
  "approved": true,
  "qaScore": 87,
  "summary": "One-sentence QA verdict",
  "issues": [
    {
      "agent": "digitalization|assessment|feedback|qa",
      "severity": "critical|warning|suggestion",
      "rule": "RULE 3: PROCESS OVER PERSON",
      "description": "What is wrong",
      "originalText": "The problematic text",
      "suggestedFix": "Corrected version"
    }
  ],
  "correctedFeedback": {
    "uldine_muster": "corrected text if needed",
    "mida_parandada": [ ... ]
  }
}

approved = true if no CRITICAL issues. warnings and suggestions still allow approval.
correctedFeedback = only include fields that need correction — partial object is fine.`;

export async function runQAAgent(
  digitalization: DigitalizationResult,
  assessment: AssessmentResult,
  feedback: FeedbackData
): Promise<QAResult> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',  // QA can use a faster/cheaper model
    max_tokens: 4096,
    system: QA_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Please QA check these three agent outputs:

AGENT 1 DIGITALIZATION OUTPUT:
${JSON.stringify(digitalization, null, 2)}

AGENT 2 ASSESSMENT OUTPUT:
${JSON.stringify(assessment, null, 2)}

AGENT 3 FEEDBACK OUTPUT:
${JSON.stringify(feedback, null, 2)}

Check for all rule violations, consistency issues, and quality problems. Be thorough.`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonrepair(jsonMatch?.[0] || '{}')) as QAResult;
  } catch {
    return {
      approved: false,
      issues: [{ agent: 'qa', severity: 'critical', description: 'QA agent itself failed to produce valid output' }],
      qaScore: 0,
      summary: 'QA agent failed — manual review required',
    };
  }
}
