import { describe, it, expect } from 'vitest';
import { isGradeActive, isSubjectActive, getActiveGrades } from '../../lib/teacher-preferences';
import type { TeacherPreferences } from '../../lib/teacher-preferences';

describe('teacher-preferences', () => {
  describe('getActiveGrades', () => {
    it('returns empty array when preferences is null', () => {
      expect(getActiveGrades(null)).toEqual([]);
    });

    it('returns empty array when no activeGrades set', () => {
      const prefs: TeacherPreferences = {};
      expect(getActiveGrades(prefs)).toEqual([]);
    });

    it('returns the configured grades', () => {
      const prefs: TeacherPreferences = { activeGrades: [8, 9, 10] };
      expect(getActiveGrades(prefs)).toEqual([8, 9, 10]);
    });
  });

  describe('isGradeActive', () => {
    it('returns true when no preferences (all grades active)', () => {
      expect(isGradeActive(null, 9)).toBe(true);
    });

    it('returns true when activeGrades is empty (all grades active)', () => {
      const prefs: TeacherPreferences = { activeGrades: [] };
      expect(isGradeActive(prefs, 9)).toBe(true);
    });

    it('returns true when grade is in activeGrades', () => {
      const prefs: TeacherPreferences = { activeGrades: [8, 9] };
      expect(isGradeActive(prefs, 9)).toBe(true);
    });

    it('returns false when grade is NOT in activeGrades', () => {
      const prefs: TeacherPreferences = { activeGrades: [8, 9] };
      expect(isGradeActive(prefs, 12)).toBe(false);
    });
  });

  describe('isSubjectActive', () => {
    it('returns true when no preferences', () => {
      expect(isSubjectActive(null, 'subj123')).toBe(true);
    });

    it('returns true when activeSubjectIds is empty', () => {
      const prefs: TeacherPreferences = { activeSubjectIds: [] };
      expect(isSubjectActive(prefs, 'subj123')).toBe(true);
    });

    it('returns true when subject is in activeSubjectIds', () => {
      const prefs: TeacherPreferences = { activeSubjectIds: ['subj123', 'subj456'] };
      expect(isSubjectActive(prefs, 'subj123')).toBe(true);
    });

    it('returns false when subject is NOT in activeSubjectIds', () => {
      const prefs: TeacherPreferences = { activeSubjectIds: ['subj123'] };
      expect(isSubjectActive(prefs, 'subj999')).toBe(false);
    });
  });
});
