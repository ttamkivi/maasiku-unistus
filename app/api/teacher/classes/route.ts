import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getTeacherProfile() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user.teacherProfile;
}

// GET — returns all class assignments for the teacher, optionally filtered by academicYearId
export async function GET(request: NextRequest) {
  try {
    const profile = await getTeacherProfile();
    if (!profile) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const yearId = request.nextUrl.searchParams.get('academicYearId');

    const assignments = await db.teacherClassAssignment.findMany({
      where: {
        teacherId: profile.id,
        ...(yearId ? { academicYearId: yearId } : {}),
      },
      include: { subject: true, academicYear: true },
      orderBy: [{ gradeLevel: 'asc' }, { parallel: 'asc' }],
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('GET /api/teacher/classes error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

// POST — bulk save class assignments for a given academic year
// Body: { academicYearId: string, assignments: Array<{ subjectId: string, gradeLevel: number, parallel: string }> }
export async function POST(request: NextRequest) {
  try {
    const profile = await getTeacherProfile();
    if (!profile) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const body = await request.json() as {
      academicYearId?: string;
      assignments?: Array<{ subjectId: string; gradeLevel: number; parallel: string }>;
    };

    if (!body.academicYearId || !Array.isArray(body.assignments)) {
      return NextResponse.json({ error: 'academicYearId ja assignments on kohustuslikud' }, { status: 400 });
    }

    // Validate academic year exists
    const year = await db.academicYear.findUnique({ where: { id: body.academicYearId } });
    if (!year) return NextResponse.json({ error: 'Õppeaastat ei leitud' }, { status: 400 });

    // Validate all subjects exist and belong to this teacher
    const teacherSubjects = await db.teacherSubject.findMany({
      where: { teacherId: profile.id },
    });
    const teacherSubjectIds = new Set(teacherSubjects.map((ts) => ts.subjectId));

    for (const a of body.assignments) {
      if (!teacherSubjectIds.has(a.subjectId)) {
        return NextResponse.json({ error: `Aine ${a.subjectId} ei ole sinu ainete hulgas` }, { status: 400 });
      }
      if (a.gradeLevel < 1 || a.gradeLevel > 12) {
        return NextResponse.json({ error: 'Klass peab olema 1-12' }, { status: 400 });
      }
      if (!a.parallel || a.parallel.length > 5) {
        return NextResponse.json({ error: 'Paralleel on kohustuslik' }, { status: 400 });
      }
    }

    // Delete existing assignments for this teacher + year, then re-create
    await db.teacherClassAssignment.deleteMany({
      where: { teacherId: profile.id, academicYearId: body.academicYearId },
    });

    if (body.assignments.length > 0) {
      await db.teacherClassAssignment.createMany({
        data: body.assignments.map((a) => ({
          teacherId: profile.id,
          subjectId: a.subjectId,
          academicYearId: body.academicYearId!,
          gradeLevel: a.gradeLevel,
          parallel: a.parallel,
        })),
      });
    }

    return NextResponse.json({ ok: true, count: body.assignments.length });
  } catch (error) {
    console.error('POST /api/teacher/classes error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
