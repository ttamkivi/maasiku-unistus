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

export async function GET() {
  try {
    const profile = await getTeacherProfile();
    if (!profile) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const links = await db.teacherSubject.findMany({
      where: { teacherId: profile.id },
      include: { subject: true },
    });
    const subjects = links.map((l) => l.subject);
    return NextResponse.json(subjects);
  } catch (error) {
    console.error('GET /api/teacher/subjects error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getTeacherProfile();
    if (!profile) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const body = await request.json() as { subjectId?: string };
    const subjectId = body.subjectId;
    if (!subjectId) return NextResponse.json({ error: 'subjectId on kohustuslik' }, { status: 400 });

    const subject = await db.subject.findUnique({ where: { id: subjectId } });
    if (!subject) return NextResponse.json({ error: 'Ainet ei leitud' }, { status: 400 });

    const existing = await db.teacherSubject.findUnique({
      where: { teacherId_subjectId: { teacherId: profile.id, subjectId } },
    });
    if (!existing) {
      await db.teacherSubject.create({
        data: { teacherId: profile.id, subjectId },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/teacher/subjects error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
