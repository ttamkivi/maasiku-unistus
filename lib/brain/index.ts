import { PHYSICS_CURRICULUM } from './physics';
import { MATHEMATICS_CURRICULUM } from './mathematics';
import { ASSESSMENT_SCIENCE } from './assessment';
import { ESTONIAN_GRADING_RULES } from './grading';
import { SCHOOL_SYSTEM_CONTEXT } from './school-system';
import { PEDAGOGY_PRINCIPLES } from './pedagogy';

export type Subject = 'physics' | 'mathematics' | 'biology' | 'chemistry' | 'history' | 'estonian' | 'english' | 'unknown';

export interface BrainContext {
  curriculum: string;
  assessmentScience: string;
  gradingRules: string;
  schoolContext: string;
  pedagogyPrinciples: string;
  subject: Subject;
  grade: string;
}

export function detectSubject(teema: string, _klass: string): Subject {
  const lower = teema.toLowerCase();
  if (lower.includes('füüsika') || lower.includes('jõud') || lower.includes('energia') ||
      lower.includes('elekter') || lower.includes('magneti') || lower.includes('mehaanika') ||
      lower.includes('optika') || lower.includes('termodünaamika')) return 'physics';
  if (lower.includes('matemaat') || lower.includes('algebra') || lower.includes('geomeetria') ||
      lower.includes('trigonomeetria') || lower.includes('funktsioon') || lower.includes('tõenäosus')) return 'mathematics';
  if (lower.includes('bioloogia') || lower.includes('organism') || lower.includes('rakk')) return 'biology';
  if (lower.includes('keemia') || lower.includes('element') || lower.includes('reaktsioon')) return 'chemistry';
  if (lower.includes('ajalugu') || lower.includes('sõda') || lower.includes('revolutsioon')) return 'history';
  if (lower.includes('eesti keel') || lower.includes('grammatika') || lower.includes('kirjand')) return 'estonian';
  if (lower.includes('english') || lower.includes('inglise')) return 'english';
  return 'unknown';
}

export function loadBrain(teema: string, klass: string, curriculumCodes?: string[]): BrainContext {
  const subject = detectSubject(teema, klass);

  let curriculum = '';
  switch (subject) {
    case 'physics':
      curriculum = PHYSICS_CURRICULUM;
      break;
    case 'mathematics':
      curriculum = MATHEMATICS_CURRICULUM;
      break;
    default:
      curriculum = `No specific curriculum loaded for subject "${subject}". Apply general Estonian school assessment principles.`;
  }

  return {
    curriculum,
    assessmentScience: ASSESSMENT_SCIENCE,
    gradingRules: ESTONIAN_GRADING_RULES,
    schoolContext: SCHOOL_SYSTEM_CONTEXT,
    pedagogyPrinciples: PEDAGOGY_PRINCIPLES,
    subject,
    grade: klass,
  };
}

export { PHYSICS_CURRICULUM, MATHEMATICS_CURRICULUM, ASSESSMENT_SCIENCE, ESTONIAN_GRADING_RULES, SCHOOL_SYSTEM_CONTEXT, PEDAGOGY_PRINCIPLES };
