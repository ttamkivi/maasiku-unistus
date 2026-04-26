// lib/agents/types.ts

export interface ScannedPage {
  base64Image: string;       // base64-encoded image
  pageIndex: number;         // 0-indexed page number in upload
  sourceFile: string;        // original filename
}

// ── Agent 1 output ──────────────────────────────────────────────────────────

export interface StudentSegment {
  studentIdentifier: string;    // name/initials detected by AI
  confidence: 'high' | 'medium' | 'low' | 'none';
  matchedStudentId?: string;    // matched against class roster (if available)
  matchedStudentName?: string;
  pages: ScannedPage[];         // the pages belonging to this student
  rawText?: string;             // extracted text content
  handwritingType: 'handwritten' | 'printed' | 'mixed' | 'unknown';
  formatType: 'test' | 'homework' | 'essay' | 'unknown';
}

export interface DigitalizationResult {
  segments: StudentSegment[];
  escalations: DigitalizationEscalation[];
  processingNotes: string;
}

export interface DigitalizationEscalation {
  pageIndices: number[];
  reason: 'name_not_found' | 'text_unreadable' | 'ambiguous_student' | 'multiple_students_unclear' | 'damaged_scan';
  description: string;
  requiresHumanReview: boolean;
}

// ── Agent 2 output ──────────────────────────────────────────────────────────

export interface TaskAssessment {
  number: number;
  questionSummary: string;
  studentAnswer: string;         // what the student wrote (summarized)
  correctAnswer?: string;        // from rubric/answer key, if provided
  isCorrect: boolean | null;     // null = partial
  errorType?: 'vaararusaam' | 'valemisegadus' | 'arvutusviga' | 'uhikuviga' | 'poolik_arutlus' | 'vaaritimõistmine' | null;
  pointsEarned: number | null;
  pointsPossible: number | null;
  graderNotes: string;           // internal grader observation, NOT feedback
}

export interface AssessmentResult {
  tasks: TaskAssessment[];
  totalPointsEarned: number | null;
  totalPointsPossible: number | null;
  percentage: number | null;
  suggestedGrade: string | null;   // from grading scale, or null if rubric insufficient
  errorPattern: string;             // overall pattern of errors for Agent 3
  gradingConfidence: 'high' | 'medium' | 'low';
  gradingNotes: string;             // for teacher (not student)
}

// ── Agent 3 output ──────────────────────────────────────────────────────────

// Re-uses FeedbackData from lib/types.ts — Agent 3 produces a full FeedbackData object

// ── Agent 4 output ──────────────────────────────────────────────────────────

export type AgentId = 'digitalization' | 'assessment' | 'feedback' | 'qa';

export interface QAIssue {
  agent: AgentId;
  severity: 'critical' | 'warning' | 'suggestion';
  rule?: string;              // which rule was violated (e.g., "RULE 3: PROCESS OVER PERSON")
  description: string;
  originalText?: string;      // the problematic text
  suggestedFix?: string;      // corrected text
}

export interface QAResult {
  approved: boolean;
  issues: QAIssue[];
  correctedFeedback?: Partial<import('../types').FeedbackData>;  // Agent 4 corrections applied
  qaScore: number;            // 0–100 confidence score
  summary: string;            // one-sentence QA verdict
}

// ── Orchestrator ────────────────────────────────────────────────────────────

export interface AgentPipelineInput {
  pages: ScannedPage[];
  klass: string;
  teema: string;
  rubric?: string | null;
  answerKey?: string | null;
  classRoster?: { id: string; name: string }[];
  studentHistory?: string | null;    // prior test results summary for this student
  testId: string;
  teacherId: string;
}

export interface AgentPipelineResult {
  digitalization: DigitalizationResult;
  assessment: AssessmentResult;
  feedback: import('../types').FeedbackData;
  qa: QAResult;
  finalFeedback: import('../types').FeedbackData;  // QA-corrected final version
  escalations: DigitalizationEscalation[];
  processingTimeMs: number;
}
