import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.cookies.get('mu_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.teacherProfile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const assignment = await db.assignment.findUnique({ where: { id } });
  if (!assignment || assignment.teacherId !== session.user.teacherProfile.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const allowed = ['title', 'description', 'grade', 'dueDate', 'status'];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  await db.assignment.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
