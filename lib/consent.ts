import { db } from './db';

/**
 * Check whether AI analysis is permitted for a given student + subject.
 *
 * Returns true when an ACTIVE ConsentGrant exists for the student that covers
 * the given subject (or all subjects when subjectId is null on the grant).
 *
 * Returns false when no grant exists, the grant is REVOKED, or it has EXPIRED.
 *
 * Note: if studentId is unknown (result not yet matched to a profile) this
 * returns false — callers must ensure the student is matched before calling.
 */
export async function hasAIConsent(
  studentId: string,
  subjectId: string | null
): Promise<boolean> {
  const grant = await db.consentGrant.findFirst({
    where: {
      studentId,
      status: 'ACTIVE',
      OR: [
        { subjectId: null },           // all-subjects grant
        { subjectId: subjectId ?? undefined }, // specific subject match
      ],
    },
  });
  return grant !== null;
}

/**
 * Check consent by student name (fallback when studentId not yet resolved).
 * Matches the student profile by name within the teacher's schools.
 * Returns null if no match found (can't verify consent — block by default).
 */
export async function hasAIConsentByName(
  studentName: string,
  subjectId: string | null,
  teacherId: string
): Promise<boolean | null> {
  // Find teacher's schools
  const teacherSchools = await db.teacherSchool.findMany({
    where: { teacherId },
    select: { schoolId: true },
  });
  const schoolIds = teacherSchools.map((ts) => ts.schoolId);

  // Find student profile by name in those schools
  const profile = await db.studentProfile.findFirst({
    where: {
      schoolId: { in: schoolIds },
      user: { name: { equals: studentName.trim() } },
    },
    select: { id: true },
  });

  if (!profile) return null; // unknown student — can't verify

  return hasAIConsent(profile.id, subjectId);
}
