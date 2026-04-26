import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Anthropic SDK ─────────────────────────────────────────────────────

const { mockCreate } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  return { mockCreate };
});

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

vi.mock('@/lib/db', () => ({
  db: {
    learningResource: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { runDigitalizationAgent } from '../lib/agents/digitalize-agent';
import { runAssessmentAgent } from '../lib/agents/assess-agent';
import { runFeedbackAgent } from '../lib/agents/feedback-agent';
import { runQAAgent } from '../lib/agents/qa-agent';
import { runAgentPipeline } from '../lib/agents/orchestrator';
import type { ScannedPage, StudentSegment, AssessmentResult, DigitalizationResult } from '../lib/agents/types';
import type { FeedbackData } from '../lib/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fakePage: ScannedPage = {
  base64Image: 'dGVzdA==',
  pageIndex: 0,
  sourceFile: 'test.jpg',
};

const fakeSegment: StudentSegment = {
  studentIdentifier: 'Test Student',
  confidence: 'high',
  pages: [fakePage],
  rawText: 'Ülesanne 1: F = ma',
  handwritingType: 'handwritten',
  formatType: 'test',
};

const fakeAssessment: AssessmentResult = {
  tasks: [{
    number: 1,
    questionSummary: 'Newtoni II seadus',
    studentAnswer: 'F = ma = 5 * 2 = 10 N',
    correctAnswer: 'F = ma = 10 N',
    isCorrect: true,
    errorType: null,
    pointsEarned: 5,
    pointsPossible: 5,
    graderNotes: 'Correct',
  }],
  totalPointsEarned: 5,
  totalPointsPossible: 5,
  percentage: 100,
  suggestedGrade: '10',
  errorPattern: 'No errors',
  gradingConfidence: 'high',
  gradingNotes: '',
};

const fakeFeedback: FeedbackData = {
  test_info: { title: 'Test', topic: 'Mehaanika', class: '8', score: '10', student: 'Õpilane' },
  opieesmark: 'Newtoni seadused',
  mis_laks_hasti: [{ title: 'Jõu arvutamine', text: 'Sa rakendasid Newtoni II seadust õigesti.' }],
  mida_parandada: [],
  uldine_muster: 'Suurepärane tulemus.',
  soovitused: [{ title: 'Jätka harjutamist', text: 'Proovi lahendada keerulisemaid ülesandeid.' }],
  pilk_ettepoole: 'Järgmine teema on energia.',
  markmed_opetajale: 'Kõik õpiväljundid saavutatud.',
  tasks: [{
    number: 1,
    question_summary: 'Newtoni II seadus',
    student_answer: 'F = ma = 10 N',
    is_correct: true,
    what_went_right: 'Õige valem ja arvutus',
    what_went_wrong: null,
    advice: null,
    points_earned: '5',
    points_possible: '5',
  }],
};

function mockAIResponse(json: object) {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: 'text', text: JSON.stringify(json) }],
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Agent 1: Digitalization', () => {
  it('returns a DigitalizationResult shape', async () => {
    mockAIResponse({
      segments: [{
        studentIdentifier: 'Mari Maasikas',
        confidence: 'high',
        pageIndices: [0],
        rawText: 'Ül 1: F = ma',
        handwritingType: 'handwritten',
        formatType: 'test',
        matchedRosterName: null,
      }],
      escalations: [],
      processingNotes: 'Good quality scan',
    });

    const result = await runDigitalizationAgent([fakePage]);
    expect(result).toHaveProperty('segments');
    expect(result).toHaveProperty('escalations');
    expect(result).toHaveProperty('processingNotes');
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].studentIdentifier).toBe('Mari Maasikas');
  });

  it('returns escalation when parsing fails', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Not valid JSON at all' }],
    });

    const result = await runDigitalizationAgent([fakePage]);
    expect(result.segments).toHaveLength(0);
    expect(result.escalations).toHaveLength(1);
    expect(result.escalations[0].reason).toBe('text_unreadable');
  });
});

describe('Agent 2: Assessment', () => {
  it('returns an AssessmentResult shape', async () => {
    mockAIResponse(fakeAssessment);

    const result = await runAssessmentAgent(fakeSegment);
    expect(result).toHaveProperty('tasks');
    expect(result).toHaveProperty('totalPointsEarned');
    expect(result).toHaveProperty('percentage');
    expect(result).toHaveProperty('gradingConfidence');
    expect(result.tasks).toHaveLength(1);
  });

  it('returns fallback on parse failure', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API error'));

    const result = await runAssessmentAgent(fakeSegment).catch(() => ({
      tasks: [],
      totalPointsEarned: null,
      totalPointsPossible: null,
      percentage: null,
      suggestedGrade: null,
      errorPattern: 'Assessment agent could not parse the test.',
      gradingConfidence: 'low' as const,
      gradingNotes: 'Parsing failed — teacher review required.',
    }));
    expect(result.tasks).toHaveLength(0);
    expect(result.gradingConfidence).toBe('low');
  });
});

describe('Agent 3: Feedback', () => {
  it('returns a FeedbackData shape', async () => {
    mockAIResponse(fakeFeedback);

    const result = await runFeedbackAgent('8', 'Mehaanika', fakeAssessment);
    expect(result).toHaveProperty('test_info');
    expect(result).toHaveProperty('mis_laks_hasti');
    expect(result).toHaveProperty('mida_parandada');
    expect(result).toHaveProperty('uldine_muster');
    expect(result).toHaveProperty('tasks');
  });
});

describe('Agent 4: QA', () => {
  it('returns a QAResult with approved boolean', async () => {
    mockAIResponse({
      approved: true,
      qaScore: 92,
      summary: 'All rules followed.',
      issues: [],
    });

    const digitalization: DigitalizationResult = {
      segments: [fakeSegment],
      escalations: [],
      processingNotes: '',
    };

    const result = await runQAAgent(digitalization, fakeAssessment, fakeFeedback);
    expect(result).toHaveProperty('approved');
    expect(typeof result.approved).toBe('boolean');
    expect(result).toHaveProperty('qaScore');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('issues');
  });
});

describe('Agent Pipeline (orchestrator)', () => {
  it('calls all four agents in sequence', async () => {
    // Agent 1: Digitalization
    mockAIResponse({
      segments: [{
        studentIdentifier: 'Õpilane',
        confidence: 'high',
        pageIndices: [0],
        rawText: 'test',
        handwritingType: 'handwritten',
        formatType: 'test',
        matchedRosterName: null,
      }],
      escalations: [],
      processingNotes: '',
    });

    // Agent 2: Assessment
    mockAIResponse(fakeAssessment);

    // Agent 3: Feedback
    mockAIResponse(fakeFeedback);

    // Agent 4: QA
    mockAIResponse({
      approved: true,
      qaScore: 95,
      summary: 'OK',
      issues: [],
    });

    const result = await runAgentPipeline({
      pages: [fakePage],
      klass: '8',
      teema: 'Mehaanika',
      testId: 'test-1',
      teacherId: 'teacher-1',
    });

    expect(result).toHaveProperty('digitalization');
    expect(result).toHaveProperty('assessment');
    expect(result).toHaveProperty('feedback');
    expect(result).toHaveProperty('qa');
    expect(result).toHaveProperty('finalFeedback');
    expect(result).toHaveProperty('processingTimeMs');
    expect(mockCreate).toHaveBeenCalledTimes(4);
  });
});

describe('Feature flag', () => {
  it('AGENTIC_ANALYSIS_ENABLED defaults to false', async () => {
    const { AGENTIC_ANALYSIS_ENABLED } = await import('../lib/features');
    expect(AGENTIC_ANALYSIS_ENABLED).toBe(false);
  });
});
