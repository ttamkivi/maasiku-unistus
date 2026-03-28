import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return NextResponse.json({ error: 'Logi sisse' }, { status: 401 });

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Sessioon aegunud' }, { status: 401 });
  }
  const user = session.user;
  if (user.role !== 'TEACHER' && user.role !== 'SUPERADMIN' && user.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Ainult õpetajatele' }, { status: 403 });
  }

  const teacherFilter = {};

  const results = await db.testResult.findMany({
    where: {
      test: { ...teacherFilter, deletedAt: null },
      status: { in: ['DRAFT', 'REVIEWED', 'EDITED', 'APPROVED', 'SHARED'] },
    },
    orderBy: { analyzedAt: 'desc' },
    take: 30,
    include: {
      test: { select: { title: true } },
    },
  });

  return NextResponse.json({
    results: results.map(r => ({
      id: r.id,
      testTitle: r.test.title,
      studentName: r.studentName,
      score: r.score,
      maxScore: r.maxScore,
      status: r.status,
      analyzedAt: r.analyzedAt?.toISOString() || null,
      qaScore: r.qaScore,
      hasTeacherEdits: !!r.editedFeedback,
    })),
  });
}
