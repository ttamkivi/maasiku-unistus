import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { startSmartIdAuth } from '@/lib/eid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { personalCode } = body;

    if (!personalCode || !/^\d{11}$/.test(personalCode)) {
      return NextResponse.json(
        { error: 'Isikukood peab olema 11-kohaline number' },
        { status: 400 }
      );
    }

    const { sessionId, verificationCode } = await startSmartIdAuth(personalCode);

    const cookieStore = await cookies();
    const eidSession = JSON.stringify({
      sessionId,
      personalCode,
      method: 'smart-id',
    });

    cookieStore.set('eid_session', eidSession, {
      httpOnly: true,
      maxAge: 5 * 60, // 5 minutes
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ verificationCode });
  } catch (error) {
    console.error('Smart-ID start error:', error);
    const message =
      error instanceof Error ? error.message : 'Smart-ID autentimine ebaõnnestus';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
