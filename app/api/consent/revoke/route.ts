/**
 * POST /api/consent/revoke
 * Allows a parent (or admin) to revoke an active AI-analysis consent grant
 * for their child. GDPR right to withdraw consent (Art 7(3)).
 *
 * Body: { consentGrantId: string }
 *
 * Auth: must be a logged-in PARENT with a parentStudentLink to the grant's student,
 *       or a SCHOOL_ADMIN / SUPERADMIN.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { ConsentRevokeSchema, parseBody } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('mu_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await db.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            parentProfile: true,
            adminProfile: true,
          },
        },
      },
    });
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });
    }

    const { user } = session;
    const raw = await request.json();
    const parsed = parseBody(ConsentRevokeSchema, raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { consentGrantId } = parsed.data;

    // Load the grant with student info
    const grant = await db.consentGrant.findUnique({
      where: { id: consentGrantId },
      include: { student: true },
    });

    if (!grant) {
      return NextResponse.json({ error: 'Nõusolekut ei leitud' }, { status: 404 });
    }

    if (grant.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Nõusolek pole aktiivne' }, { status: 409 });
    }

    const isAdmin = user.role === 'SCHOOL_ADMIN' || user.role === 'SUPERADMIN';

    // If not admin, verify parent has a link to this student
    if (!isAdmin) {
      if (!user.parentProfile) {
        return NextResponse.json({ error: 'Ligipääs keelatud' }, { status: 403 });
      }

      const link = await db.parentStudentLink.findUnique({
        where: {
          parentId_studentId: {
            parentId: user.parentProfile.id,
            studentId: grant.studentId,
          },
        },
      });

      if (!link) {
        return NextResponse.json({ error: 'Ligipääs keelatud' }, { status: 403 });
      }
    }

    // Revoke the grant
    await db.consentGrant.update({
      where: { id: consentGrantId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });

    await audit('CONSENT_REVOKED', {
      userId: user.id,
      targetType: 'ConsentGrant',
      targetId: consentGrantId,
      details: {
        studentId: grant.studentId,
        revokedBy: user.id,
        revokedByRole: user.role,
      },
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/consent/revoke error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
