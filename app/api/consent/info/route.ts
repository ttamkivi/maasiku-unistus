import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token puudub' }, { status: 400 });
    }

    const consentRequest = await db.parentConsentRequest.findUnique({
      where: { inviteToken: token },
      include: {
        student: {
          include: { user: { select: { name: true } } },
        },
        teacher: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!consentRequest) {
      return NextResponse.json({ error: 'Nõusolekutaotlust ei leitud' }, { status: 404 });
    }

    // Check expiry
    if (consentRequest.expiresAt < new Date()) {
      if (consentRequest.status === 'PENDING') {
        await db.parentConsentRequest.update({
          where: { id: consentRequest.id },
          data: { status: 'EXPIRED' },
        });
      }
      return NextResponse.json({ error: 'Link on aegunud', status: 'EXPIRED' }, { status: 410 });
    }

    if (consentRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Taotlusele on juba vastatud', status: consentRequest.status },
        { status: 409 }
      );
    }

    return NextResponse.json({
      id: consentRequest.id,
      parentEmail: consentRequest.parentEmail,
      parentName: consentRequest.parentName,
      studentName: consentRequest.student.user.name,
      teacherName: consentRequest.teacher.user.name,
      expiresAt: consentRequest.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('GET /api/consent/info error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
