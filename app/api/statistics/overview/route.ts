import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return NextResponse.json({ error: 'Logi sisse' }, { status: 401 });

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true, adminProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Sessioon aegunud' }, { status: 401 });
  }
  const user = session.user;
  if (user.role !== 'TEACHER' && user.role !== 'SUPERADMIN' && user.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Ainult õpetajatele' }, { status: 403 });
  }

  // Build a safe filter:
  // - TEACHER: see all tests (demo mode)
  // - SCHOOL_ADMIN: see all tests in their school (never unscoped)
  // - SUPERADMIN: see everything
  let teacherFilter: Record<string, unknown>;
  if (user.role === 'TEACHER') {
    teacherFilter = {};
  } else if (user.role === 'SCHOOL_ADMIN') {
    const schoolId = user.adminProfile?.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'Kooli seotus puudub' }, { status: 403 });
    }
    teacherFilter = { teacher: { schools: { some: { schoolId } } } };
  } else {
    // SUPERADMIN sees all
    teacherFilter = {};
  }

  // Gather overview stats
  const [totalTests, totalResults, scoreAgg, totalPatterns, recentCorrections] = await Promise.all([
    db.test.count({ where: { ...teacherFilter, deletedAt: null } }),
    db.testResult.count({
      where: { test: { ...teacherFilter, deletedAt: null } },
    }),
    db.testResult.aggregate({
      where: {
        test: { ...teacherFilter, deletedAt: null },
        score: { not: null },
        maxScore: { not: null, gt: 0 },
      },
      _avg: { score: true, maxScore: true },
    }),
    db.feedbackPattern.count({ where: { active: true } }),
    db.feedbackPattern.count({
      where: {
        updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const avgScore =
    scoreAgg._avg.score !== null && scoreAgg._avg.maxScore !== null && scoreAgg._avg.maxScore > 0
      ? (scoreAgg._avg.score / scoreAgg._avg.maxScore) * 100
      : null;

  return NextResponse.json({
    totalTests,
    totalResults,
    avgScore,
    totalPatterns,
    recentCorrections,
  });
}
