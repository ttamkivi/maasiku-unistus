import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export async function PATCH() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { onboardingCompleted: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/account/onboarding-complete error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
