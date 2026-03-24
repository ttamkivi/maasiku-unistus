import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { anonymizeFeedback, anonymizeTeacherNotes } from '@/lib/training';

async function getSessionUser(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });
    }

    const user = await getSessionUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });
    }

    const { resultId } = await params;
    const body = await request.json();
    const { consentType } = body as { consentType: 'teacher' | 'parent' | 'student' };

    if (!consentType || !['teacher', 'parent', 'student'].includes(consentType)) {
      return NextResponse.json({ error: 'Vigane nõusoleku tüüp' }, { status: 400 });
    }

    // Find TestResult
    const result = await db.testResult.findUnique({
      where: { id: resultId },
      include: {
        test: {
          include: {
            subject: true,
            school: true,
          },
        },
      },
    });

    if (!result) {
      return NextResponse.json({ error: 'Tulemust ei leitud' }, { status: 404 });
    }

    // Check if consent already exists (new schema: testResultId)
    const existing = await db.trainingConsent.findUnique({
      where: { testResultId: resultId },
    });
    if (existing) {
      return NextResponse.json({ error: 'Nõusolek on juba antud' }, { status: 409 });
    }

    const feedbackJson = result.editedFeedback ?? result.rawFeedback;
    if (!feedbackJson) {
      return NextResponse.json({ error: 'Tagasiside puudub' }, { status: 400 });
    }

    const studentName = result.studentName ?? 'Õpilane';
    const anonymizedFeedback = await anonymizeFeedback(feedbackJson, studentName);
    const anonymizedNotes = await anonymizeTeacherNotes(result.teacherNotes, studentName);

    const now = new Date();

    await db.$transaction(async (tx) => {
      const consent = await tx.trainingConsent.create({
        data: {
          testResultId: resultId,
          consentedBy: user.id,
          consentType,
          anonymizedAt: now,
        },
      });

      await tx.anonymizedTrainingData.create({
        data: {
          consentId: consent.id,
          grade: result.test.grade ?? null,
          subject: result.test.subject?.name ?? null,
          score: result.score ?? null,
          maxScore: result.maxScore ?? null,
          feedback: anonymizedFeedback,
          teacherNotes: anonymizedNotes ?? null,
          teacherComment: result.teacherComment ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'TRAINING_CONSENT_GIVEN',
          targetType: 'TestResult',
          targetId: resultId,
          details: JSON.stringify({ consentType, resultId }),
          ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
          userAgent: request.headers.get('user-agent') ?? undefined,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('POST training-consent error:', msg);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });
    }

    const user = await getSessionUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });
    }

    const { resultId } = await params;

    const consent = await db.trainingConsent.findUnique({
      where: { testResultId: resultId },
      include: { anonymizedData: true },
    });

    if (!consent) {
      return NextResponse.json({ error: 'Nõusolekut ei leitud' }, { status: 404 });
    }

    // Delete anonymized data but keep the TrainingConsent record (with note in details)
    if (consent.anonymizedData) {
      await db.anonymizedTrainingData.delete({
        where: { consentId: consent.id },
      });
    }

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'TRAINING_CONSENT_WITHDRAWN',
        targetType: 'TestResult',
        targetId: resultId,
        details: JSON.stringify({ resultId, note: 'Kasutaja tühistas nõusoleku; anonüümistatud andmed kustutatud' }),
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('DELETE training-consent error:', msg);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
