import { NextRequest, NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('mu_session')?.value;

    let userId: string | null = null;

    if (token) {
      try {
        const session = await db.session.findUnique({
          where: { token },
          include: { user: true },
        });
        if (session && session.expiresAt > new Date()) {
          userId = session.userId;
        }
      } catch {}
    }

    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : null;

    await db.cookieConsent.create({
      data: {
        userId: userId ?? undefined,
        ipAddress: ipAddress ?? undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Cookie consent error:', error);
    // Still return ok — consent was recorded client-side via localStorage
    return NextResponse.json({ ok: true });
  }
}
