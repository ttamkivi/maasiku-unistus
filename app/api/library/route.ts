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

// GET /api/library — browse public tests
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await getTeacherSession(token);
    if (!session) return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });

    const url = new URL(req.url);
    const grade = url.searchParams.get('grade');
    const subjectId = url.searchParams.get('subjectId');
    const search = url.searchParams.get('q');

    const tests = await db.test.findMany({
      where: {
        visibility: 'PUBLIC',
        deletedAt: null,
        ...(grade ? { grade } : {}),
        ...(subjectId ? { subjectId } : {}),
      },
      include: {
        subject: true,
        teacher: { include: { user: { select: { name: true } } } },
        _count: { select: { results: true, derivedTests: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Client-side search filter (Prisma/LibSQL doesn't support full-text)
    let filtered = tests;
    if (search) {
      const q = search.toLowerCase();
      filtered = tests.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.topic || '').toLowerCase().includes(q) ||
        (t.subject?.name || '').toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      tests: filtered.map(t => ({
        id: t.id,
        title: t.title,
        topic: t.topic,
        grade: t.grade,
        subject: t.subject?.name || null,
        rubric: t.rubric ? t.rubric.substring(0, 200) + (t.rubric.length > 200 ? '...' : '') : null,
        authorName: t.teacher.user.name,
        resultsCount: t._count.results,
        cloneCount: t._count.derivedTests,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('GET /api/library error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
