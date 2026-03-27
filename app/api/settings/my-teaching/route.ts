import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

/**
 * GET /api/settings/my-teaching
 *
 * Returns the teacher's available subjects and class assignments.
 * Used by the settings page to let teachers select their active subjects/classes.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Logi sisse' }, { status: 401 });

  const teacherProfile = user.teacherProfile;
  if (!teacherProfile) {
    return NextResponse.json({ mySubjects: [], myClasses: [], allSubjects: [], uniqueClasses: [] });
  }

  // Fetch teacher's subjects
  const teacherSubjects = await db.teacherSubject.findMany({
    where: { teacherId: teacherProfile.id },
    include: { subject: true },
  });

  // Fetch teacher's class assignments
  // TeacherClassAssignment has gradeLevel + parallel (e.g., 9 + "B"), not a schoolClass FK
  const teacherClasses = await db.teacherClassAssignment.findMany({
    where: { teacherId: teacherProfile.id },
    include: { subject: true },
  });

  // Also fetch all available subjects
  const allSubjects = await db.subject.findMany({
    orderBy: { name: 'asc' },
  });

  // Build unique "classes" from the gradeLevel + parallel combinations
  const classMap = new Map<string, { id: string; name: string; gradeLevel: number }>();
  for (const tc of teacherClasses) {
    const classKey = `${tc.gradeLevel}${tc.parallel || ''}`;
    if (!classMap.has(classKey)) {
      classMap.set(classKey, {
        id: classKey,                          // Use the composite key as ID
        name: `${tc.gradeLevel}.${tc.parallel || ''}`,
        gradeLevel: tc.gradeLevel,
      });
    }
  }

  return NextResponse.json({
    // Teacher's linked subjects
    mySubjects: teacherSubjects.map(ts => ({
      id: ts.subject.id,
      name: ts.subject.name,
      category: ts.subject.category,
    })),
    // Teacher's class assignments (with subject info)
    myClasses: teacherClasses.map(tc => ({
      id: tc.id,
      classId: `${tc.gradeLevel}${tc.parallel || ''}`,
      className: `${tc.gradeLevel}.${tc.parallel || ''}`,
      gradeLevel: tc.gradeLevel,
      subjectId: tc.subjectId,
      subjectName: tc.subject.name,
    })),
    // All available subjects (for adding new ones)
    allSubjects: allSubjects.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      gradeLevels: s.gradeLevels,
    })),
    // Unique classes derived from assignments
    uniqueClasses: Array.from(classMap.values()).sort((a, b) =>
      a.gradeLevel === b.gradeLevel ? a.name.localeCompare(b.name) : a.gradeLevel - b.gradeLevel
    ),
  });
}
