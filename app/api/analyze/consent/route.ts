import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

// GET /api/analyze/consent?studentId=xxx
// Returns whether there is an active parental consent for this student
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ hasConsent: false, reason: 'no_student_id' });
    }

    const now = new Date();

    // Check ConsentGrant: active consent (all subjects or any subject)
    const activeConsent = await db.consentGrant.findFirst({
      where: {
        studentId,
        status: 'ACTIVE',
        OR: [
          { duration: 'INFINITE' },
          { duration: 'DATED', endDate: { gte: now } },
        ],
      },
    });

    if (activeConsent) {
      return NextResponse.json({
        hasConsent: true,
        reason: 'subject_consent_active',
        scope: activeConsent.scope,
        since: activeConsent.startDate,
        until: activeConsent.endDate ?? null,
      });
    }

    // Check ConsentRequest: approved
    const approvedRequest = await db.consentRequest.findFirst({
      where: {
        studentId,
        status: 'APPROVED',
        expiresAt: { gte: now },
      },
    });

    if (approvedRequest) {
      return NextResponse.json({
        hasConsent: true,
        reason: 'parent_consent_request_approved',
        since: approvedRequest.sentAt,
        until: approvedRequest.expiresAt,
      });
    }

    return NextResponse.json({ hasConsent: false, reason: 'no_consent_found' });
  } catch (error) {
    console.error('GET /api/analyze/consent error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
