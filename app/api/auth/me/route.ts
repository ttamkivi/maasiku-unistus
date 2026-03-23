import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { getFeatureFlags } from '@/lib/features';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('mu_session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Pole sisselogitud' }, { status: 401 });
    }

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Seanss on aegunud' }, { status: 401 });
    }

    const { user } = session;

    const features = await getFeatureFlags();
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
      features,
    });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ error: 'Serveriviga.' }, { status: 500 });
  }
}
