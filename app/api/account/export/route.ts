/**
 * GDPR Article 15 — Right of access / data export.
 *
 * GET /api/account/export
 * Returns all personal data held about the authenticated user in JSON format.
 * Students/parents receive their own data; admins can export any student by
 * passing ?studentId=xxx in the query.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function GET(request: NextRequest) {
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

    // Admins may export any student's data by passing ?studentId=
    const targetStudentId = request.nextUrl.searchParams.get('studentId');
    let studentProfileId: string | null = null;

    if (targetStudentId) {
      // Only users with admin role may export other students' data
      const adminRoles = ['ADMIN', 'SUPERADMIN', 'SCHOOL_ADMIN'];
      if (!adminRoles.includes(user.role)) {
        return NextResponse.json({ error: 'Ligipääs keelatud' }, { status: 403 });
      }
      studentProfileId = targetStudentId;
    } else {
      // Non-admin users can only export their own student profile data
      studentProfileId = user.studentProfile?.id ?? null;
    }

    // Build the export payload
    const exportData: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      exportedBy: user.id,
      gdprArticle: '15 — Right of access',
    };

    // User account data
    exportData.account = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    if (studentProfileId) {
      const profile = await db.studentProfile.findUnique({
        where: { id: studentProfileId },
        include: {
          school: { select: { name: true } },
          class: { select: { name: true, gradeLevel: true } },
        },
      });

      exportData.studentProfile = profile
        ? { schoolName: profile.school?.name, className: profile.class?.name, isEligible: profile.isEligible }
        : null;

      // Test results (without base64 photos — too large, and not personal data per se)
      const testResults = await db.testResult.findMany({
        where: { studentId: studentProfileId },
        select: {
          id: true,
          studentName: true,
          status: true,
          score: true,
          maxScore: true,
          rawFeedback: true,
          editedFeedback: true,
          uploadedAt: true,
          analyzedAt: true,
          sharedAt: true,
          test: { select: { title: true, topic: true, subject: { select: { name: true } } } },
        },
      });
      exportData.testResults = testResults;

      // Exercises
      const exercises = await db.exercise.findMany({
        where: { studentId: studentProfileId },
        select: {
          id: true,
          topic: true,
          status: true,
          rawFeedback: true,
          editedFeedback: true,
          analyzedAt: true,
          sharedAt: true,
          subject: { select: { name: true } },
        },
      });
      exportData.exercises = exercises;

      // Consent grants
      const consentGrants = await db.consentGrant.findMany({
        where: { studentId: studentProfileId },
        select: {
          id: true,
          scope: true,
          status: true,
          startDate: true,
          endDate: true,
          revokedAt: true,
          subject: { select: { name: true } },
          request: { select: { parentEmail: true, sentAt: true, respondedAt: true } },
        },
      });
      exportData.consentGrants = consentGrants;
    }

    await audit('DATA_EXPORT', {
      userId: user.id,
      targetType: 'StudentProfile',
      targetId: studentProfileId ?? undefined,
      details: { requestedFor: studentProfileId ?? user.id },
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="maasiku-unistus-andmed-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error('[account/export] error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
