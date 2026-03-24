/**
 * GDPR Article 17 — Right to erasure ("right to be forgotten").
 *
 * DELETE /api/account/delete
 * Permanently deletes all personal data for the authenticated user (or a
 * specific student if called by an admin with ?studentId=xxx).
 *
 * Cascade order:
 *  WorkPhoto (base64 data) → TrainingConsent / AnonymizedData → ConsentGrant
 *  → ConsentRequest → TestResult → Exercise → AssignmentSubmission
 *  → StudentProfile → User (anonymised, not deleted, for audit integrity)
 *
 * The User row is anonymised rather than hard-deleted so that AuditLog entries
 * (required for GDPR compliance evidence) remain consistent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await db.session.findUnique({
      where: { token },
      include: { user: { include: { studentProfile: true, adminProfile: true } } },
    });
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });
    }

    const { user } = session;

    // Admin can delete any student by passing ?studentId=
    const targetStudentId = request.nextUrl.searchParams.get('studentId');
    let studentProfileId: string | null = null;
    let targetUserId: string | null = null;

    if (targetStudentId) {
      if (!user.adminProfile) {
        return NextResponse.json({ error: 'Ligipääs keelatud' }, { status: 403 });
      }
      const sp = await db.studentProfile.findUnique({
        where: { id: targetStudentId },
        select: { id: true, userId: true },
      });
      if (!sp) return NextResponse.json({ error: 'Õpilast ei leitud' }, { status: 404 });
      studentProfileId = sp.id;
      targetUserId = sp.userId;
    } else {
      studentProfileId = user.studentProfile?.id ?? null;
      targetUserId = user.id;
    }

    // Log the deletion request BEFORE deleting
    await audit('DATA_DELETION_REQUESTED', {
      userId: user.id,
      targetType: 'StudentProfile',
      targetId: studentProfileId ?? undefined,
      details: { targetUserId, requestedBy: user.id },
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });

    await db.$transaction(async (tx) => {
      if (studentProfileId) {
        // 1. Clear photo base64 data for all results belonging to this student
        await tx.workPhoto.updateMany({
          where: { testResult: { studentId: studentProfileId } },
          data: { base64Data: null, storageKey: null },
        });
        await tx.workPhoto.updateMany({
          where: { submission: { studentId: studentProfileId } },
          data: { base64Data: null, storageKey: null },
        });
        await tx.workPhoto.updateMany({
          where: { exercise: { studentId: studentProfileId } },
          data: { base64Data: null, storageKey: null },
        });

        // 2. Delete anonymized training data and consent records
        const trainingConsents = await tx.trainingConsent.findMany({
          where: { testResult: { studentId: studentProfileId } },
          select: { id: true },
        });
        for (const tc of trainingConsents) {
          await tx.anonymizedTrainingData.deleteMany({ where: { consentId: tc.id } });
        }
        await tx.trainingConsent.deleteMany({
          where: { testResult: { studentId: studentProfileId } },
        });

        // 3. Revoke and delete consent grants
        await tx.consentGrant.deleteMany({ where: { studentId: studentProfileId } });
        await tx.consentRequest.deleteMany({ where: { studentId: studentProfileId } });

        // 4. Clear feedback text from test results (keep record for school's own records)
        await tx.testResult.updateMany({
          where: { studentId: studentProfileId },
          data: {
            rawFeedback: null,
            editedFeedback: null,
            teacherNotes: null,
            teacherComment: null,
            studentName: '[kustutatud]',
            studentId: null,
          },
        });

        // 5. Clear exercise data
        await tx.exercise.updateMany({
          where: { studentId: studentProfileId },
          data: {
            rawFeedback: null,
            editedFeedback: null,
            studentNote: null,
            teacherNote: null,
            studentName: '[kustutatud]',
            studentId: null,
          },
        });

        // 6. Clear submission data
        await tx.assignmentSubmission.updateMany({
          where: { studentId: studentProfileId },
          data: {
            rawFeedback: null,
            editedFeedback: null,
            studentNote: null,
            teacherNote: null,
            studentName: '[kustutatud]',
            studentId: null,
          },
        });

        // 7. Delete the student profile
        await tx.studentProfile.delete({ where: { id: studentProfileId } });
      }

      if (targetUserId) {
        // 8. Invalidate all sessions
        await tx.session.deleteMany({ where: { userId: targetUserId } });

        // 9. Anonymise the User row (keep for audit log FK integrity)
        await tx.user.update({
          where: { id: targetUserId },
          data: {
            name: '[kustutatud]',
            email: `deleted-${targetUserId}@deleted.invalid`,
            password: null,
            personalCode: null,
            phoneNumber: null,
          },
        });
      }
    });

    await audit('DATA_DELETION_COMPLETE', {
      userId: user.id,
      targetType: 'StudentProfile',
      targetId: studentProfileId ?? undefined,
      details: { targetUserId, deletedBy: user.id },
    });

    // If the user deleted themselves, clear their own session cookie
    const resp = NextResponse.json({ ok: true, message: 'Kõik isikuandmed on kustutatud.' });
    if (!targetStudentId) {
      resp.cookies.set('ot_session', '', { httpOnly: true, path: '/', maxAge: 0 });
    }
    return resp;
  } catch (error) {
    console.error('[account/delete] error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
