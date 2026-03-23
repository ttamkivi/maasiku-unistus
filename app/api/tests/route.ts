import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { CreateTestSchema, parseBody } from '@/lib/validation';
import { captureServerEvent } from '@/lib/posthog-server';

async function getTeacherSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.teacherProfile) return null;
  return session;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('mu_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await getTeacherSession(token);
    if (!session) return NextResponse.json({ error: 'Kehtetu sessioon või puudub õpetaja profiil' }, { status: 401 });

    const teacherProfile = session.user.teacherProfile!;

    const tests = await db.test.findMany({
      where: { teacherId: teacherProfile.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        subject: true,
        _count: { select: { results: true } },
      },
    });

    return NextResponse.json(tests);
  } catch (error) {
    console.error('GET /api/tests error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('mu_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await getTeacherSession(token);
    if (!session) return NextResponse.json({ error: 'Kehtetu sessioon või puudub õpetaja profiil' }, { status: 401 });

    const teacherProfile = session.user.teacherProfile!;
    const raw = await request.json();
    const parsed = parseBody(CreateTestSchema, raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { title, topic, rubric, answerKey } = parsed.data;
    // Preserve non-schema fields from raw body
    const { grade, subjectId, plannedDate, notes } = raw as {
      grade?: string;
      subjectId?: string;
      plannedDate?: string;
      notes?: string;
    };

    const test = await db.test.create({
      data: {
        teacherId: teacherProfile.id,
        title,
        topic: topic ?? null,
        grade: grade || null,
        subjectId: subjectId || null,
        plannedDate: plannedDate ? new Date(plannedDate) : null,
        notes: notes?.trim() || null,
        rubric: rubric ?? null,
        answerKey: answerKey ?? null,
        status: 'PREPARING',
      },
    });

    captureServerEvent(session.user.id, 'test_created', { testId: test.id, title });
    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    console.error('POST /api/tests error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
