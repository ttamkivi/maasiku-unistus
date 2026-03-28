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

  // Get all tests with results for this teacher
  const tests = await db.test.findMany({
    where: { ...teacherFilter, deletedAt: null },
    include: {
      results: {
        where: { status: { in: ['DRAFT', 'REVIEWED', 'EDITED', 'APPROVED', 'SHARED'] } },
        select: {
          id: true,
          studentName: true,
          studentId: true,
          score: true,
          maxScore: true,
          rawFeedback: true,
          qaFeedback: true,
        },
      },
      subject: { select: { name: true } },
      class: { select: { id: true, name: true } },
    },
  });

  // === TOPIC STATS ===
  const topicMap = new Map<string, { testCount: number; results: { score: number | null; maxScore: number | null; feedback: string | null }[] }>();
  for (const test of tests) {
    const topic = test.topic || test.subject?.name || 'Määramata';
    if (!topicMap.has(topic)) topicMap.set(topic, { testCount: 0, results: [] });
    const entry = topicMap.get(topic)!;
    entry.testCount++;
    for (const r of test.results) {
      entry.results.push({
        score: r.score,
        maxScore: r.maxScore,
        feedback: r.qaFeedback || r.rawFeedback,
      });
    }
  }

  const topicStats = Array.from(topicMap.entries()).map(([topic, data]) => {
    const scored = data.results.filter(r => r.score !== null && r.maxScore !== null && r.maxScore > 0);
    const avgScore = scored.length > 0
      ? (scored.reduce((sum, r) => sum + (r.score! / r.maxScore!) * 100, 0) / scored.length)
      : null;

    // Try to extract weak areas from feedback JSON
    const weakAreas = extractWeakAreas(data.results.map(r => r.feedback).filter(Boolean) as string[]);

    return {
      topic,
      testCount: data.testCount,
      resultCount: data.results.length,
      avgScore,
      weakAreas,
    };
  }).sort((a, b) => (a.avgScore ?? 100) - (b.avgScore ?? 100)); // worst first

  // === CLASS STATS ===
  const classMap = new Map<string, { className: string; studentIds: Set<string>; results: { score: number | null; maxScore: number | null }[] }>();
  for (const test of tests) {
    const classKey = test.class?.id || 'none';
    const className = test.class?.name || (test.grade ? `Klass ${test.grade}` : 'Määramata');
    if (!classMap.has(classKey)) classMap.set(classKey, { className, studentIds: new Set(), results: [] });
    const entry = classMap.get(classKey)!;
    for (const r of test.results) {
      if (r.studentId) entry.studentIds.add(r.studentId);
      else if (r.studentName) entry.studentIds.add(r.studentName); // fallback uniqueness
      entry.results.push({ score: r.score, maxScore: r.maxScore });
    }
  }

  const classStats = Array.from(classMap.entries()).map(([classId, data]) => {
    const scored = data.results.filter(r => r.score !== null && r.maxScore !== null && r.maxScore > 0);
    const avgScore = scored.length > 0
      ? (scored.reduce((sum, r) => sum + (r.score! / r.maxScore!) * 100, 0) / scored.length)
      : null;
    return {
      classId: classId === 'none' ? null : classId,
      className: data.className,
      studentCount: data.studentIds.size,
      resultCount: data.results.length,
      avgScore,
    };
  }).sort((a, b) => (a.avgScore ?? 100) - (b.avgScore ?? 100));

  // === STUDENT STATS ===
  const studentMap = new Map<string, { studentName: string; results: { score: number | null; maxScore: number | null; topic: string }[] }>();
  for (const test of tests) {
    const testTopic = test.topic || test.subject?.name || 'Määramata';
    for (const r of test.results) {
      const key = r.studentId || r.studentName || 'Tundmatu';
      const name = r.studentName || 'Tundmatu';
      if (!studentMap.has(key)) studentMap.set(key, { studentName: name, results: [] });
      studentMap.get(key)!.results.push({ score: r.score, maxScore: r.maxScore, topic: testTopic });
    }
  }

  const studentStats = Array.from(studentMap.entries()).map(([studentId, data]) => {
    const scored = data.results.filter(r => r.score !== null && r.maxScore !== null && r.maxScore > 0);
    const avgScore = scored.length > 0
      ? (scored.reduce((sum, r) => sum + (r.score! / r.maxScore!) * 100, 0) / scored.length)
      : null;

    // Find weak topics (below 50%)
    const topicScores = new Map<string, { total: number; count: number }>();
    for (const r of scored) {
      const pct = (r.score! / r.maxScore!) * 100;
      if (!topicScores.has(r.topic)) topicScores.set(r.topic, { total: 0, count: 0 });
      const ts = topicScores.get(r.topic)!;
      ts.total += pct;
      ts.count++;
    }
    const weakTopics = Array.from(topicScores.entries())
      .filter(([, v]) => v.total / v.count < 50)
      .map(([topic]) => topic);

    return {
      studentId: studentId === 'Tundmatu' ? null : studentId,
      studentName: data.studentName,
      resultCount: data.results.length,
      avgScore,
      weakTopics,
    };
  }).sort((a, b) => (a.avgScore ?? 100) - (b.avgScore ?? 100));

  // === WEAK SPOTS (from FeedbackPatterns + low-scoring topics) ===
  const patterns = await db.feedbackPattern.findMany({
    where: { active: true },
    orderBy: { frequency: 'desc' },
    take: 20,
  });

  const weakSpots = patterns.map(p => ({
    topic: p.topic || p.dimension,
    issue: p.pattern,
    count: p.frequency,
  }));

  // Add low-scoring topics as weak spots
  for (const ts of topicStats) {
    if (ts.avgScore !== null && ts.avgScore < 50 && ts.resultCount >= 2) {
      weakSpots.push({
        topic: ts.topic,
        issue: `Keskmine tulemus ainult ${ts.avgScore.toFixed(0)}% (${ts.resultCount} tulemust)`,
        count: ts.resultCount,
      });
    }
  }

  weakSpots.sort((a, b) => b.count - a.count);

  return NextResponse.json({
    topicStats,
    classStats,
    studentStats: studentStats.slice(0, 50), // limit for performance
    weakSpots: weakSpots.slice(0, 30),
  });
}

/**
 * Extract common weak areas from AI feedback JSON strings.
 * Looks for "nõrkused", "vajab harjutamist", low scores in sections.
 */
function extractWeakAreas(feedbacks: string[]): string[] {
  const weakSet = new Set<string>();
  for (const raw of feedbacks) {
    try {
      const data = JSON.parse(raw);
      // Look for common feedback JSON structures
      if (data.sections) {
        for (const section of data.sections) {
          if (section.score !== undefined && section.maxScore !== undefined) {
            const pct = (section.score / section.maxScore) * 100;
            if (pct < 40 && section.title) {
              weakSet.add(section.title);
            }
          }
        }
      }
      if (data.weakAreas && Array.isArray(data.weakAreas)) {
        for (const w of data.weakAreas) {
          if (typeof w === 'string') weakSet.add(w);
          else if (w.topic) weakSet.add(w.topic);
        }
      }
      if (data.improvementAreas && Array.isArray(data.improvementAreas)) {
        for (const area of data.improvementAreas) {
          if (typeof area === 'string') weakSet.add(area);
          else if (area.topic) weakSet.add(area.topic);
        }
      }
    } catch {
      // Not valid JSON, skip
    }
  }
  return Array.from(weakSet).slice(0, 5);
}
