import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('mu_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.user.teacherProfile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { title, description, subjectId, grade, dueDate, status } = await req.json();
  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Pealkiri ja kirjeldus on kohustuslikud' }, { status: 400 });
  }

  const assignment = await db.assignment.create({
    data: {
      teacherId: session.user.teacherProfile.id,
      title: title.trim(),
      description: description.trim(),
      subjectId: subjectId || null,
      grade: grade || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
    },
  });

  return NextResponse.json({ id: assignment.id });
}
