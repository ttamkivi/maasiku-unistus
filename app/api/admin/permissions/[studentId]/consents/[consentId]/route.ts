import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getAuthorizedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;

  const { user } = session;
  const isSuperAdmin = user.role === 'SUPERADMIN';
  const isSchoolAdmin = user.role === 'SCHOOL_ADMIN';

  if (!isSuperAdmin && !isSchoolAdmin) return null;
  return user;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ studentId: string; consentId: string }> }
) {
  try {
    const user = await getAuthorizedUser();
    if (!user) {
      return NextResponse.json({ error: 'Juurdepääs keelatud' }, { status: 403 });
    }

    const { consentId } = await params;

    const consent = await db.consentGrant.findUnique({
      where: { id: consentId },
      include: {
        subject: { select: { id: true, name: true } },
        parent: { include: { user: { select: { name: true } } } },
      },
    });

    if (!consent) {
      return NextResponse.json({ error: 'Nõusolekut ei leitud' }, { status: 404 });
    }

    return NextResponse.json({ consent });
  } catch (error) {
    console.error('GET consent error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string; consentId: string }> }
) {
  try {
    const user = await getAuthorizedUser();
    if (!user) {
      return NextResponse.json({ error: 'Juurdepääs keelatud' }, { status: 403 });
    }

    const { consentId } = await params;

    const consent = await db.consentGrant.findUnique({ where: { id: consentId } });
    if (!consent) {
      return NextResponse.json({ error: 'Nõusolekut ei leitud' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const action = (body as { action?: string }).action;

    if (action === 'revoke' || !action) {
      // Revoke the consent
      await db.consentGrant.update({
        where: { id: consentId },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedBy: user.id,
        },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Tundmatu tegevus' }, { status: 400 });
  } catch (error) {
    console.error('PATCH consent error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
