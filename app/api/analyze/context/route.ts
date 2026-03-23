import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

// GET /api/analyze/context
// Returns schools the teacher is linked to, and optionally students for a given schoolId+class
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('mu_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const className = searchParams.get('class');

    // Get teacher's schools
    const teacherProfile = await db.teacherProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        schools: { include: { school: true } },
        subjects: { include: { subject: true } },
      },
    });

    const schools = teacherProfile?.schools.map((ts) => ({
      id: ts.school.id,
      name: ts.school.name,
      city: ts.school.city,
    })) ?? [];

    // If schoolId provided, return classes in that school
    if (schoolId) {
      // Get distinct classes in this school
      const allClassesInSchool = await db.schoolClass.findMany({
        where: { schoolId },
        select: { name: true },
        orderBy: { name: 'asc' },
      });
      const classes = allClassesInSchool.map((c) => c.name);

      // Find the classId if filtering by class name
      let classIdFilter: string | undefined;
      if (className) {
        const sc = await db.schoolClass.findFirst({
          where: { schoolId, name: className },
          select: { id: true },
        });
        classIdFilter = sc?.id;
      }

      const students = await db.studentProfile.findMany({
        where: {
          schoolId,
          ...(classIdFilter ? { classId: classIdFilter } : {}),
        },
        include: {
          user: { select: { name: true, email: true } },
          class: { select: { name: true, gradeLevel: true } },
        },
        orderBy: { user: { name: 'asc' } },
      });

      return NextResponse.json({
        schools,
        classes,
        students: students.map((s) => ({
          id: s.id,
          userId: s.userId,
          name: s.user.name,
          email: s.user.email,
          class: s.class?.name ?? null,
          grade: s.class?.gradeLevel?.toString() ?? null,
        })),
      });
    }

    return NextResponse.json({ schools, classes: [], students: [] });
  } catch (error) {
    console.error('GET /api/analyze/context error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
