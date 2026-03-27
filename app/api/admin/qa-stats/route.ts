import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { adminProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!['SUPERADMIN', 'SCHOOL_ADMIN'].includes(session.user.role)) return null;
  return { user: session.user, schoolId: session.user.adminProfile?.schoolId || null };
}

/**
 * GET /api/admin/qa-stats — QA value analysis
 *
 * Returns:
 * - Total results analyzed, how many had QA, how many QA made corrections
 * - Average QA score
 * - Cost saved if QA were disabled
 * - Most common correction types
 * - Correction rate trend (is pass 1 improving over time?)
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Pole õigust' }, { status: 403 });

  const schoolFilter = admin.user.role === 'SUPERADMIN'
    ? {}
    : { test: { teacher: { schools: { some: { schoolId: admin.schoolId! } } } } };

  // Get all analyzed results with QA data
  const results = await db.testResult.findMany({
    where: { ...schoolFilter, analyzedAt: { not: null } },
    select: {
      id: true,
      qaScore: true,
      qaLog: true,
      qaCompletedAt: true,
      analyzedAt: true,
      rawFeedback: true,
      qaFeedback: true,
    },
    orderBy: { analyzedAt: 'desc' },
    take: 500,
  });

  const totalAnalyzed = results.length;
  const withQa = results.filter(r => (r as Record<string, unknown>).qaCompletedAt !== null);
  const qaCount = withQa.length;

  // Parse QA logs to find corrections
  let totalCorrections = 0;
  let resultsWithCorrections = 0;
  const correctionsByDimension: Record<string, number> = {};
  const correctionsBySeverity: Record<string, number> = {};
  const qaScores: number[] = [];

  for (const r of withQa) {
    const score = (r as Record<string, unknown>).qaScore as number | null;
    if (score !== null) qaScores.push(score);

    const logStr = (r as Record<string, unknown>).qaLog as string | null;
    if (!logStr) continue;

    try {
      const log = JSON.parse(logStr) as { dimension: string; severity: string; correction: string | null }[];
      const corrections = log.filter(e => e.correction !== null && e.severity !== 'ok');

      if (corrections.length > 0) {
        resultsWithCorrections++;
        totalCorrections += corrections.length;

        for (const c of corrections) {
          correctionsByDimension[c.dimension] = (correctionsByDimension[c.dimension] || 0) + 1;
          correctionsBySeverity[c.severity] = (correctionsBySeverity[c.severity] || 0) + 1;
        }
      }
    } catch {
      // malformed log, skip
    }
  }

  // Average QA score
  const avgQaScore = qaScores.length > 0
    ? Math.round(qaScores.reduce((a, b) => a + b, 0) / qaScores.length)
    : null;

  // Correction rate
  const correctionRate = qaCount > 0 ? resultsWithCorrections / qaCount : 0;

  // Did rawFeedback and qaFeedback actually differ?
  let actualChanges = 0;
  for (const r of withQa) {
    if (r.rawFeedback && r.qaFeedback && r.rawFeedback !== r.qaFeedback) {
      actualChanges++;
    }
  }
  const actualChangeRate = qaCount > 0 ? actualChanges / qaCount : 0;

  // Cost analysis
  const qaCostPerSheet = 0.09; // ~$0.09 per sheet for QA pass
  const totalQaCost = qaCount * qaCostPerSheet;
  const costPerCorrection = resultsWithCorrections > 0
    ? totalQaCost / resultsWithCorrections
    : null;

  // Trend: split results into two halves and compare correction rates
  const halfIdx = Math.floor(withQa.length / 2);
  const recentHalf = withQa.slice(0, halfIdx);
  const olderHalf = withQa.slice(halfIdx);

  function correctionRateFor(subset: typeof withQa) {
    let corrected = 0;
    for (const r of subset) {
      const logStr = (r as Record<string, unknown>).qaLog as string | null;
      if (!logStr) continue;
      try {
        const log = JSON.parse(logStr) as { correction: string | null; severity: string }[];
        if (log.some(e => e.correction !== null && e.severity !== 'ok')) corrected++;
      } catch { /* skip */ }
    }
    return subset.length > 0 ? corrected / subset.length : 0;
  }

  const recentCorrectionRate = correctionRateFor(recentHalf);
  const olderCorrectionRate = correctionRateFor(olderHalf);
  const isImproving = recentCorrectionRate < olderCorrectionRate;

  // Top correction dimensions sorted by count
  const topDimensions = Object.entries(correctionsByDimension)
    .sort((a, b) => b[1] - a[1])
    .map(([dimension, count]) => ({ dimension, count }));

  return NextResponse.json({
    totalAnalyzed,
    qaCount,
    resultsWithCorrections,
    totalCorrections,
    correctionRate: Math.round(correctionRate * 100),
    actualChangeRate: Math.round(actualChangeRate * 100),
    avgQaScore,
    totalQaCost: Math.round(totalQaCost * 100) / 100,
    costPerCorrection: costPerCorrection ? Math.round(costPerCorrection * 100) / 100 : null,
    topDimensions,
    correctionsBySeverity,
    trend: {
      isImproving,
      recentCorrectionRate: Math.round(recentCorrectionRate * 100),
      olderCorrectionRate: Math.round(olderCorrectionRate * 100),
    },
  });
}
