// lib/agents/orchestrator.ts

import { runDigitalizationAgent } from './digitalize-agent';
import { runAssessmentAgent } from './assess-agent';
import { runFeedbackAgent } from './feedback-agent';
import { runQAAgent } from './qa-agent';
import { AgentPipelineInput, AgentPipelineResult } from './types';
import { FeedbackData } from '../types';

export async function runAgentPipeline(input: AgentPipelineInput): Promise<AgentPipelineResult> {
  const start = Date.now();

  // ── Agent 1: Digitalization ──────────────────────────────────────────────
  console.log('[Pipeline] Agent 1: Digitalization starting...');
  const digitalization = await runDigitalizationAgent(input.pages, input.classRoster);

  // Collect all escalations — these need teacher attention
  const allEscalations = digitalization.escalations;

  // If no segments identified at all — cannot proceed
  if (digitalization.segments.length === 0) {
    throw new Error('Agent 1: No student segments identified. All pages require human review.');
  }

  // Process first (or only) segment — orchestrator processes one student at a time
  const segment = digitalization.segments[0];

  // ── Agent 2: Assessment ──────────────────────────────────────────────────
  console.log('[Pipeline] Agent 2: Assessment starting...');
  const assessment = await runAssessmentAgent(
    segment,
    input.rubric,
    input.answerKey,
  );

  // ── Agent 3: Feedback ────────────────────────────────────────────────────
  console.log('[Pipeline] Agent 3: Feedback starting...');
  // Load curated resources from DB (reuse existing logic)
  const { loadCuratedResourcesForAgent } = await import('../claude');
  const curatedResources = await loadCuratedResourcesForAgent(input.klass);

  const feedback = await runFeedbackAgent(
    input.klass,
    input.teema,
    assessment,
    input.studentHistory,
    curatedResources
  );

  // ── Agent 4: QA ──────────────────────────────────────────────────────────
  console.log('[Pipeline] Agent 4: QA starting...');
  const qa = await runQAAgent(digitalization, assessment, feedback);

  // Apply QA corrections to feedback
  const finalFeedback: FeedbackData = qa.correctedFeedback
    ? { ...feedback, ...qa.correctedFeedback }
    : feedback;

  console.log(`[Pipeline] Complete in ${Date.now() - start}ms. QA score: ${qa.qaScore}. Approved: ${qa.approved}`);

  return {
    digitalization,
    assessment,
    feedback,
    qa,
    finalFeedback,
    escalations: allEscalations,
    processingTimeMs: Date.now() - start,
  };
}
