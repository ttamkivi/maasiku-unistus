import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getTeacherSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.teacherProfile) return null;
  return session;
}

// GET /api/tests/[id]/roster
// Returns the student list for the test's class (if classId is set)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await getTeacherSession(token);
    if (!session) return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });

    const teacherProfile = session.user.teacherProfile!;
    const { id } = await params;

    const test = await db.test.findFirst({
      where: { id, teacherId: teacherProfile.id, deletedAt: null },
      select: { classId: true },
    });
    if (!test) return NextResponse.json({ error: 'Testi ei leitud' }, { status: 404 });

    if (!test.classId) {
      return NextResponse.json({ students: [] });
    }

    const students = await db.studentProfile.findMany({
      where: { classId: test.classId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: 'asc' } },
    });

    return NextResponse.json({
      students: students.map((s) => ({ id: s.id, name: s.user.name })),
    });
  } catch (error) {
    console.error('GET /api/tests/[id]/roster error:', error);
    return NextResponse.json({ error: 'Serveri viga' }, { status: 500 });
  }
}
