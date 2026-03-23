import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    consentGrant: { findFirst: vi.fn() },
    teacherSchool: { findMany: vi.fn() },
    studentProfile: { findFirst: vi.fn() },
  },
}));

import { hasAIConsent, hasAIConsentByName } from '@/lib/consent';
import { db } from '@/lib/db';

const mockGrantFindFirst   = vi.mocked(db.consentGrant.findFirst);
const mockSchoolFindMany   = vi.mocked(db.teacherSchool.findMany);
const mockProfileFindFirst = vi.mocked(db.studentProfile.findFirst);

beforeEach(() => vi.clearAllMocks());

// ─── hasAIConsent ─────────────────────────────────────────────────────────────

describe('hasAIConsent()', () => {
  it('returns true when an ACTIVE grant exists', async () => {
    mockGrantFindFirst.mockResolvedValueOnce({ id: 'g-1' } as never);
    expect(await hasAIConsent('s-1', 'subj-1')).toBe(true);
  });

  it('returns false when no grant exists', async () => {
    mockGrantFindFirst.mockResolvedValueOnce(null);
    expect(await hasAIConsent('s-1', 'subj-1')).toBe(false);
  });

  it('queries with correct studentId and ACTIVE status', async () => {
    mockGrantFindFirst.mockResolvedValueOnce(null);
    await hasAIConsent('student-xyz', 'subj-1');

    const call = mockGrantFindFirst.mock.calls[0]?.[0];
    const where = call?.where as Record<string, unknown> | undefined;
    expect(where?.studentId).toBe('student-xyz');
    expect(where?.status).toBe('ACTIVE');
  });

  it('includes OR for null subjectId (all-subjects grant)', async () => {
    mockGrantFindFirst.mockResolvedValueOnce(null);
    await hasAIConsent('s-1', 'subj-fizika');

    const call = mockGrantFindFirst.mock.calls[0]?.[0];
    const where = call?.where as Record<string, unknown> | undefined;
    expect(where?.OR).toEqual(
      expect.arrayContaining([{ subjectId: null }])
    );
  });

  it('handles null subjectId argument (any-subject lookup)', async () => {
    mockGrantFindFirst.mockResolvedValueOnce({ id: 'g-2' } as never);
    expect(await hasAIConsent('s-1', null)).toBe(true);
  });
});

// ─── hasAIConsentByName ───────────────────────────────────────────────────────

describe('hasAIConsentByName()', () => {
  it('returns null when student not found in teacher schools', async () => {
    mockSchoolFindMany.mockResolvedValueOnce([{ schoolId: 'sch-1' }] as never);
    mockProfileFindFirst.mockResolvedValueOnce(null);

    const result = await hasAIConsentByName('Unknown Õpilane', 'subj-1', 'teacher-1');
    expect(result).toBeNull();
  });

  it('returns true when student found and has ACTIVE grant', async () => {
    mockSchoolFindMany.mockResolvedValueOnce([{ schoolId: 'sch-1' }] as never);
    mockProfileFindFirst.mockResolvedValueOnce({ id: 'student-found' } as never);
    mockGrantFindFirst.mockResolvedValueOnce({ id: 'g-1' } as never);

    const result = await hasAIConsentByName('Mari Mägi', null, 'teacher-1');
    expect(result).toBe(true);
  });

  it('returns false when student found but no grant', async () => {
    mockSchoolFindMany.mockResolvedValueOnce([{ schoolId: 'sch-1' }] as never);
    mockProfileFindFirst.mockResolvedValueOnce({ id: 'student-found' } as never);
    mockGrantFindFirst.mockResolvedValueOnce(null);

    const result = await hasAIConsentByName('Jaan Tamm', 'subj-1', 'teacher-1');
    expect(result).toBe(false);
  });

  it('returns null when teacher has no schools', async () => {
    mockSchoolFindMany.mockResolvedValueOnce([] as never);
    mockProfileFindFirst.mockResolvedValueOnce(null);

    const result = await hasAIConsentByName('Mari Mägi', null, 'teacher-no-school');
    expect(result).toBeNull();
  });

  it('passes teacherId to school lookup', async () => {
    mockSchoolFindMany.mockResolvedValueOnce([] as never);
    mockProfileFindFirst.mockResolvedValueOnce(null);

    await hasAIConsentByName('Anyone', null, 'teacher-abc');
    const schoolCall = mockSchoolFindMany.mock.calls[0]?.[0] as { where: Record<string, unknown> } | undefined;
    expect(schoolCall?.where.teacherId).toBe('teacher-abc');
  });

  it('passes all found schoolIds to student profile lookup', async () => {
    mockSchoolFindMany.mockResolvedValueOnce([
      { schoolId: 'sch-1' },
      { schoolId: 'sch-2' },
    ] as never);
    mockProfileFindFirst.mockResolvedValueOnce(null);

    await hasAIConsentByName('Mari', null, 'teacher-1');
    const profileCall = mockProfileFindFirst.mock.calls[0]?.[0] as { where: Record<string, unknown> } | undefined;
    const where = profileCall?.where;
    expect((where as Record<string, unknown> | undefined)?.schoolId).toEqual({ in: ['sch-1', 'sch-2'] });
  });
});
