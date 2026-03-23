import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { studentProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const exercise = await db.exercise.findUnique({ where: { id } });

  if (!exercise) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const studentId = session.user.studentProfile?.id;
  if (exercise.studentId !== studentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.exercise.update({
    where: { id },
    data: { status: 'SHARED_WITH_TEACHER', sharedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
