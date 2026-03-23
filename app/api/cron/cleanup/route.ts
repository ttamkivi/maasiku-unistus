/**
 * GDPR Data Retention Cleanup — runs nightly via cron (e.g. Vercel Cron / external scheduler).
 *
 * Retention rules from DPIA:
 *  1. WorkPhoto.base64Data → null once the parent result is APPROVED or SHARED
 *     (scan originals must be deleted after teacher confirms results)
 *  2. TestResult rawFeedback/editedFeedback → null for results SHARED more than
 *     (academicYearEndEstimate + 30 days) ago  [conservative: 13 months rolling]
 *  3. AuditLog entries older than 90 days → deleted
 *  4. Sessions expired more than 7 days ago → deleted
 *
 * Call: POST /api/cron/cleanup
 * Auth: Bearer token matching CRON_SECRET env variable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

function cronSecret() {
  return process.env.CRON_SECRET ?? '';
}

export async function POST(request: NextRequest) {
  // Verify cron secret — reject any call without it
  const auth = request.headers.get('authorization') ?? '';
  if (!cronSecret() || auth !== `Bearer ${cronSecret()}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, number> = {};

  try {
    // ── 1. Clear base64 photo data for APPROVED/SHARED results ──────────────
    // Once a teacher approves a result, the original scan is no longer needed
    // in the platform. The feedback JSON is sufficient.
    const clearPhotos = await db.workPhoto.updateMany({
      where: {
        base64Data: { not: null },
        OR: [
          { testResult: { status: { in: ['APPROVED', 'SHARED', 'ARCHIVED'] } } },
          { submission: { status: { in: ['SHARED_WITH_TEACHER', 'ARCHIVED'] } } },
          { exercise: { status: { in: ['SHARED_WITH_TEACHER', 'ARCHIVED'] } } },
        ],
      },
      data: { base64Data: null },
    });
    results.photosCleared = clearPhotos.count;

    // ── 2. Clear AI feedback text older than 13 months ───────────────────────
    // DPIA: "AI-genereeritud tagasiside — õppeaasta lõpp + 30 päeva"
    // We use a rolling 13-month window as a safe approximation.
    const feedbackCutoff = new Date();
    feedbackCutoff.setMonth(feedbackCutoff.getMonth() - 13);

    const clearFeedback = await db.testResult.updateMany({
      where: {
        status: { in: ['SHARED', 'ARCHIVED'] },
        sharedAt: { lt: feedbackCutoff },
        rawFeedback: { not: null },
      },
      data: { rawFeedback: null, editedFeedback: null },
    });
    results.feedbackCleared = clearFeedback.count;

    // Same for exercises
    const clearExerciseFeedback = await db.exercise.updateMany({
      where: {
        status: { in: ['SHARED_WITH_TEACHER', 'ARCHIVED'] },
        sharedAt: { lt: feedbackCutoff },
        rawFeedback: { not: null },
      },
      data: { rawFeedback: null, editedFeedback: null },
    });
    results.exerciseFeedbackCleared = clearExerciseFeedback.count;

    // ── 3. Purge audit logs older than 90 days ───────────────────────────────
    const auditCutoff = new Date();
    auditCutoff.setDate(auditCutoff.getDate() - 90);
    const deleteAudit = await db.auditLog.deleteMany({
      where: { timestamp: { lt: auditCutoff } },
    });
    results.auditLogsDeleted = deleteAudit.count;

    // ── 4. Delete expired sessions ───────────────────────────────────────────
    const sessionCutoff = new Date();
    sessionCutoff.setDate(sessionCutoff.getDate() - 7); // 7 days grace after expiry
    const deleteSessions = await db.session.deleteMany({
      where: { expiresAt: { lt: sessionCutoff } },
    });
    results.sessionsDeleted = deleteSessions.count;

    // ── Log the cleanup run ──────────────────────────────────────────────────
    await audit('CRON_CLEANUP', { details: results });

    return NextResponse.json({ ok: true, ...results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron/cleanup] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
