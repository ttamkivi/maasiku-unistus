export interface TestInfo {
  title: string;
  topic: string;
  class: string;
  score: string | null;
  student: string;
  course?: string;
}

export interface FeedbackItem {
  title: string;
  text: string;
}

export type PhotoStorageChoice = 'local_only' | 'store_centrally';

export interface FeedbackDrawing {
  title: string;
  description: string;
  caption: string;
}

export interface ResourceItem {
  type: 'reading' | 'video' | 'exercise';
  title: string;
  url: string;
  description: string;
  topic: string;
}

export interface TaskFeedback {
  number: number;
  question_summary: string;   // brief description of what the task asked
  student_answer: string;     // what the student wrote (summarised)
  is_correct: boolean | null; // null if partial
  what_went_right: string | null;
  what_went_wrong: string | null;
  advice: string | null;
  points_earned?: string | null;
  points_possible?: string | null;
}

export interface FeedbackData {
  test_info: TestInfo;
  // New field: the learning objective this test assessed (added Task 8)
  opieesmark?: string;
  mis_laks_hasti: FeedbackItem[];
  mida_parandada: FeedbackItem[];
  uldine_muster: string;
  soovitused: FeedbackItem[];
  pilk_ettepoole: string;
  markmed_opetajale: string;
  drawings?: FeedbackDrawing[];
  resources?: ResourceItem[];
  tasks?: TaskFeedback[];
}

export interface AnalyzeRequest {
  klass: string;
  teema: string;
  opilane: string;
  images: string[];
}
