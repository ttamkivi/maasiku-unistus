import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { analyzeTest } from '@/lib/claude';
import { validateFeedback } from '@/lib/qa-validator';
import { hasAIConsentByName } from '@/lib/consent';
import { audit } from '@/lib/audit';
import { captureServerEvent } from '@/lib/posthog-server';

/**
 * Resolve a photo record to base64 data.
 * If stored in blob, fetch the image from its URL and convert to base64.
 * If stored locally, return the base64Data directly.
 */
async function resolvePhotoBase64(photo: {
  storageMode: string;
  storageKey: string | null;
  base64Data: string | null;
}): Promise<string | null> {
  // Local storage: base64 is already present
  if (photo.base64Data) return photo.base64Data;

  // Blob storage: fetch from URL and convert to base64
  if (photo.storageMode === 'blob' && photo.storageKey) {
    try {
      const res = await fetch(photo.storageKey);
      if (!res.ok) {
        console.error(`Failed to fetch blob photo: ${photo.storageKey} (${res.status})`);
        return null;
      }
      const buffer = await res.arrayBuffer();
      return Buffer.from(buffer).toString('base64');
    } catch (err) {
      console.error('Error fetching blob photo:', err);
      return null;
    }
  }

  return null;
}

async function getTeacherSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.teacherProfile) return null;
  return session;
}

// GET /api/tests/[id]/bulk-analyze
// Returns all UPLOADED results with photos for bulk processing
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await getTeacherSession(token);
    if (!session) return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });

    const teacherProfile = session.user.teacherProfile!;
    const { id } = await params;

    const test = await db.test.findFirst({
      where: { id, teacherId: teacherProfile.id, deletedAt: null },
      include: { subject: true },
    });
    if (!test) return NextResponse.json({ error: 'Testi ei leitud' }, { status: 404 });

    const results = await db.testResult.findMany({
      where: { testId: id, status: 'UPLOADED' },
      include: { photos: { select: { base64Data: true, storageMode: true, storageKey: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Resolve blob-stored photos to base64 for the client
    const resolvedResults = await Promise.all(
      results.map(async (r) => {
        const photos = await Promise.all(r.photos.map(resolvePhotoBase64));
        return {
          id: r.id,
          studentName: r.studentName,
          photos: photos.filter((d): d is string => d !== null),
        };
      })
    );

    return NextResponse.json({
      testId: id,
      grade: test.grade,
      topic: test.topic || test.title,
      subject: test.subject?.name || 'Füüsika',
      rubric: test.rubric,
      answerKey: test.answerKey,
      results: resolvedResults,
    });
  } catch (error) {
    console.error('GET /api/tests/[id]/bulk-analyze error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

// POST /api/tests/[id]/bulk-analyze
// Analyze a single result (called per-result from the client to show progress)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await getTeacherSession(token);
    if (!session) return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });

    const teacherProfile = session.user.teacherProfile!;
    const { id } = await params;

    const test = await db.test.findFirst({
      where: { id, teacherId: teacherProfile.id, deletedAt: null },
      include: { subject: true },
    });
    if (!test) return NextResponse.json({ error: 'Testi ei leitud' }, { status: 404 });

    const body = await request.json();
    const { resultId } = body as { resultId: string };

    const result = await db.testResult.findFirst({
      where: { id: resultId, testId: id, status: 'UPLOADED' },
      include: { photos: { select: { base64Data: true, storageMode: true, storageKey: true } } },
    });
    if (!result) return NextResponse.json({ error: 'Tulemust ei leitud' }, { status: 404 });

    if (result.photos.length === 0) {
      return NextResponse.json({ error: 'Tulemusel pole fotosid' }, { status: 400 });
    }

    // GDPR: verify AI consent before sending to Anthropic.
    // If the student is matched by ID, use that; otherwise fall back to name lookup.
    if (result.studentId) {
      const { hasAIConsent } = await import('@/lib/consent');
      const allowed = await hasAIConsent(result.studentId, test.subjectId ?? null);
      if (!allowed) {
        await audit('AI_ANALYSIS_BLOCKED_NO_CONSENT', {
          userId: session.user.id,
          targetType: 'TestResult',
          targetId: resultId,
          details: { studentId: result.studentId, testId: id },
        });
        captureServerEvent(session.user.id, 'ai_analysis_blocked_no_consent', { resultId, testId: id, reason: 'studentId' });
        return NextResponse.json({ error: 'AI analüüs pole lubatud — nõusolek puudub' }, { status: 403 });
      }
    } else if (result.studentName) {
      const allowed = await hasAIConsentByName(result.studentName, test.subjectId ?? null, teacherProfile.id);
      if (allowed === false) {
        await audit('AI_ANALYSIS_BLOCKED_NO_CONSENT', {
          userId: session.user.id,
          targetType: 'TestResult',
          targetId: resultId,
          details: { studentName: result.studentName, testId: id },
        });
        captureServerEvent(session.user.id, 'ai_analysis_blocked_no_consent', { resultId, testId: id, reason: 'name' });
        return NextResponse.json({ error: 'AI analüüs pole lubatud — nõusolek puudub' }, { status: 403 });
      }
      // allowed === null means student not found in system — proceed (teacher has verified)
    }

    // Resolve all photos (including blob-stored ones) to base64 for AI analysis
    const resolvedPhotos = await Promise.all(result.photos.map(resolvePhotoBase64));
    const images = resolvedPhotos.filter((d): d is string => d !== null);

    if (images.length === 0) {
      console.error(`No photos resolved for result ${resultId} (${result.photos.length} records, all null after resolution)`);
      return NextResponse.json({ error: 'Fotode laadimine ebaõnnestus' }, { status: 500 });
    }

    // ── Pass 1: AI Analysis ──
    captureServerEvent(session.user.id, 'ai_analysis_started', { resultId, testId: id, photoCount: images.length });
    const rawFeedback = await analyzeTest(
      test.grade || '9',
      test.topic || test.title,
      result.studentName || 'Õpilane',
      images,
      test.rubric,
      test.answerKey,
    );

    // ── Pass 2: QA Validation & Correction ──
    let qaFeedback = rawFeedback;
    let qaLog: string | null = null;
    let qaScore: number | null = null;
    let qaCompletedAt: Date | null = null;

    try {
      captureServerEvent(session.user.id, 'qa_validation_started', { resultId, testId: id });
      const qaResult = await validateFeedback(
        rawFeedback,
        images,
        test.grade || '9',
        test.topic || test.title,
      );
      qaFeedback = qaResult.correctedFeedback;
      qaLog = JSON.stringify(qaResult.log);
      qaScore = qaResult.score;
      qaCompletedAt = new Date();

      captureServerEvent(session.user.id, 'qa_validation_completed', {
        resultId,
        testId: id,
        qaScore: qaResult.score,
        hadCorrections: qaResult.hadCorrections,
        corrections: qaResult.log.filter((e) => e.correction !== null).length,
      });
    } catch (qaError) {
      // QA failure is non-blocking — teacher gets the raw feedback
      console.error(`QA validation failed for result ${resultId}:`, qaError);
      captureServerEvent(session.user.id, 'qa_validation_failed', { resultId, testId: id });
    }

    await db.testResult.update({
      where: { id: resultId },
      data: {
        rawFeedback: JSON.stringify(rawFeedback),
        qaFeedback: JSON.stringify(qaFeedback),
        qaLog,
        qaScore,
        qaCompletedAt,
        status: 'DRAFT',
        analyzedAt: new Date(),
      },
    });

    captureServerEvent(session.user.id, 'ai_analysis_completed', { resultId, testId: id });
    return NextResponse.json({ ok: true, resultId, qaScore });
  } catch (error) {
    console.error('POST /api/tests/[id]/bulk-analyze error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
