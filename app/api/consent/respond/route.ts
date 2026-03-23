import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ConsentRespondSchema, parseBody } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseBody(ConsentRespondSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { token } = parsed.data;
    const status = parsed.data.response === 'approve' ? 'APPROVED' : 'DECLINED' as 'APPROVED' | 'DECLINED';
    const reason = parsed.data.declineReason ?? (body as { reason?: string }).reason;
    const parentName = (body as { parentName?: string }).parentName;
    const bodyParentEmail = (body as { parentEmail?: string }).parentEmail;

    const consentRequest = await db.consentRequest.findUnique({
      where: { inviteToken: token },
      include: {
        student: {
          include: { user: { select: { id: true, name: true } } },
        },
        requestedBy: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!consentRequest) {
      return NextResponse.json({ error: 'Nõusolekutaotlust ei leitud' }, { status: 404 });
    }

    if (consentRequest.expiresAt < new Date()) {
      await db.consentRequest.update({
        where: { id: consentRequest.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json({ error: 'Link on aegunud' }, { status: 410 });
    }

    if (consentRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Taotlusele on juba vastatud' },
        { status: 409 }
      );
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      undefined;
    const userAgent = request.headers.get('user-agent') ?? undefined;

    const resolvedParentEmail = bodyParentEmail ?? consentRequest.parentEmail;
    const resolvedParentName = parentName ?? consentRequest.parentName ?? undefined;
    const now = new Date();

    // Update the consent request
    await db.consentRequest.update({
      where: { id: consentRequest.id },
      data: {
        status,
        respondedAt: now,
        declineReason: status === 'DECLINED' ? (reason ?? null) : null,
        parentName: resolvedParentName ?? consentRequest.parentName,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });

    // Find or create parent user
    let parentUser = await db.user.findUnique({ where: { email: resolvedParentEmail } });

    if (!parentUser) {
      parentUser = await db.user.create({
        data: {
          email: resolvedParentEmail,
          name: resolvedParentName ?? resolvedParentEmail,
          role: 'PARENT',
          password: null,
        },
      });

      await db.parentProfile.create({
        data: { userId: parentUser.id },
      });
    } else if (parentUser.role !== 'PARENT') {
      // User exists but is not a parent — don't alter their role
    }

    const parentProfile = await db.parentProfile.findUnique({
      where: { userId: parentUser.id },
    });

    // Link parent to student if approved and not already linked
    let consentId: string | undefined;
    if (status === 'APPROVED' && parentProfile) {
      // Link parent profile to consent request
      await db.consentRequest.update({
        where: { id: consentRequest.id },
        data: { parentProfileId: parentProfile.id },
      });

      const existingLink = await db.parentStudentLink.findUnique({
        where: {
          parentId_studentId: {
            parentId: parentProfile.id,
            studentId: consentRequest.studentId,
          },
        },
      });

      if (!existingLink) {
        await db.parentStudentLink.create({
          data: {
            parentId: parentProfile.id,
            studentId: consentRequest.studentId,
          },
        });
      }
    }

    // Audit log
    const action = status === 'APPROVED' ? 'CONSENT_APPROVED' : 'CONSENT_DECLINED';
    await db.auditLog.create({
      data: {
        userId: parentUser.id,
        action,
        targetType: 'ParentConsentRequest',
        targetId: consentRequest.id,
        details: JSON.stringify({
          parentEmail: resolvedParentEmail,
          studentId: consentRequest.studentId,
          consentId,
          ipAddress,
          userAgent,
          timestamp: now.toISOString(),
          ...(status === 'DECLINED' && reason ? { reason } : {}),
        }),
        consentRequestId: consentRequest.id,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/consent/respond error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
