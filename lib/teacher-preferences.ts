/**
 * Teacher Preferences Helper
 *
 * Loads and provides teacher preferences for use in API routes.
 * Preferences are stored as JSON in User.preferences field.
 */

import { db } from './db';

export interface TeacherPreferences {
  aiModel?: string;
  language?: string;
  feedbackTone?: string;
  scoringStrictness?: string;
  autoAnalyze?: boolean;
  showAiBadge?: boolean;
  emailNotifications?: boolean;
  feedbackLanguage?: string;
  maxPointsRounding?: 'none' | 'half' | 'full';
  // Teaching profile
  activeSubjectIds?: string[];
  activeClassIds?: string[];
  activeGrades?: number[];
}

/**
 * Load a teacher's preferences from the database.
 * Returns null if the teacher has no preferences set.
 */
export async function getTeacherPreferences(userId: string): Promise<TeacherPreferences | null> {
  try {
    const rows = await db.$queryRaw<{ preferences: string | null }[]>`
      SELECT preferences FROM "User" WHERE id = ${userId}
    `;
    const raw = rows[0]?.preferences;
    if (!raw) return null;
    return JSON.parse(raw) as TeacherPreferences;
  } catch {
    return null;
  }
}

/**
 * Get the teacher's active grade levels.
 * Returns empty array if no grades are configured (meaning "all grades").
 */
export function getActiveGrades(prefs: TeacherPreferences | null): number[] {
  return prefs?.activeGrades || [];
}

/**
 * Check if a specific grade is active for this teacher.
 * Returns true if no grades are configured (all grades are active).
 */
export function isGradeActive(prefs: TeacherPreferences | null, grade: number): boolean {
  const activeGrades = getActiveGrades(prefs);
  if (activeGrades.length === 0) return true; // no filter = all active
  return activeGrades.includes(grade);
}

/**
 * Check if a specific subject is active for this teacher.
 * Returns true if no subjects are configured (all subjects are active).
 */
export function isSubjectActive(prefs: TeacherPreferences | null, subjectId: string): boolean {
  const activeSubjects = prefs?.activeSubjectIds || [];
  if (activeSubjects.length === 0) return true;
  return activeSubjects.includes(subjectId);
}
