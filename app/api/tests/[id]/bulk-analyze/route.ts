import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { analyzeTest, analyzeTestAgentic } from '@/lib/claude';
import { AGENTIC_ANALYSIS_ENABLED } from '@/lib/features';
import { validateFeedback } from '@/lib/qa-validator';
import { recordPatterns } from '@/lib/ai-learning';
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
  if (!session.user.teacherProfile && session.user.role !== 'SUPERADMIN') return null;
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
      where: { id, deletedAt: null },
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
      where: { id, deletedAt: null },
      include: { subject: true, curriculumLinks: { select: { curriculumCode: true } } },
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

    // Resolve rubric images if present
    let rubricImages: string[] = [];
    const rubricFileUrls = (test as Record<string, unknown>).rubricFileUrls;
    if (rubricFileUrls && typeof rubricFileUrls === 'string') {
      try {
        const rubricUrls = JSON.parse(rubricFileUrls) as Array<{ url: string | null; name: string }>;
        const resolvedRubricImages = await Promise.all(
          rubricUrls
            .filter((r) => r.url)
            .map((r) =>
              fetch(r.url!)
                .then((res) => (res.ok ? res.arrayBuffer() : null))
                .then((buffer) => (buffer ? Buffer.from(buffer).toString('base64') : null))
                .catch(() => null)
            )
        );
        rubricImages = resolvedRubricImages.filter((d): d is string => d !== null);
      } catch (err) {
        console.error('Error resolving rubric images:', err);
        // Continue without rubric images
      }
    }

    // ── Pass 1: AI Analysis ──
    captureServerEvent(session.user.id, 'ai_analysis_started', { resultId, testId: id, photoCount: images.length });
    const curriculumCodes = (test as unknown as { curriculumLinks: { curriculumCode: string }[] }).curriculumLinks?.map((cl: { curriculumCode: string }) => cl.curriculumCode) || [];

    let rawFeedback;
    if (AGENTIC_ANALYSIS_ENABLED) {
      // 4-agent agentic pipeline
      const pages = images.map((base64, i) => ({ base64Image: base64, pageIndex: i, sourceFile: `photo-${i}` }));
      rawFeedback = await analyzeTestAgentic(
        pages,
        test.grade || '9',
        test.topic || test.title,
        result.studentName || 'Õpilane',
        test.rubric,
        test.answerKey,
        undefined, // classRoster — not yet wired
        undefined, // studentHistory — not yet wired
        id,
        teacherProfile.id,
      );
    } else {
      rawFeedback = await analyzeTest(
        test.grade || '9',
        test.topic || test.title,
        result.studentName || 'Õpilane',
        images,
        test.rubric,
        test.answerKey,
        curriculumCodes,
        rubricImages.length > 0 ? rubricImages : undefined,
      );
    }

    // ── Pass 2: QA Validation & Correction ──
    let qaFeedback = rawFeedback;
    let qaLog: string | null = null;
    let qaScore: number | null = null;
    let qaCompletedAt: Date | null = null;

    // Check if QA is enabled for this school's AI provider config
    const teacherSchool = await db.teacherSchool.findFirst({
      where: { teacherId: teacherProfile.id },
      select: { schoolId: true },
    });
    let qaEnabled = true; // default: on
    if (teacherSchool) {
      const providerConfig = await db.aIProviderConfig.findFirst({
        where: { schoolId: teacherSchool.schoolId, isActive: true, isDefault: true },
        select: { qaEnabled: true },
      });
      if (providerConfig) {
        qaEnabled = providerConfig.qaEnabled;
      }
    }

    if (!qaEnabled) {
      captureServerEvent(session.user.id, 'qa_validation_skipped', { resultId, testId: id, reason: 'disabled_by_admin' });
    } else {
      try {
        captureServerEvent(session.user.id, 'qa_validation_started', { resultId, testId: id });
        const qaResult = await validateFeedback(
          rawFeedback,
          test.grade || '9',
          test.topic || test.title,
          curriculumCodes,
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

        // Record QA corrections as learned patterns — makes pass 1 smarter over time
        if (qaResult.hadCorrections) {
          try {
            const { newPatterns, updatedPatterns } = await recordPatterns(
              qaResult.log,
              test.topic || test.title,
              test.grade || null,
            );
            if (newPatterns > 0 || updatedPatterns > 0) {
              captureServerEvent(session.user.id, 'ai_learning_recorded', {
                resultId, testId: id, newPatterns, updatedPatterns,
              });
            }
          } catch (learnErr) {
            console.error('Failed to record QA patterns:', learnErr);
          }
        }
      } catch (qaError) {
        // QA failure is non-blocking — teacher gets the raw feedback
        console.error(`QA validation failed for result ${resultId}:`, qaError);
        captureServerEvent(session.user.id, 'qa_validation_failed', { resultId, testId: id });
      }
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
