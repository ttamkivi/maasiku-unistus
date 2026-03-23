import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { startMobileIdAuth } from '@/lib/eid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, personalCode } = body;

    if (!personalCode || !/^\d{11}$/.test(personalCode)) {
      return NextResponse.json(
        { error: 'Isikukood peab olema 11-kohaline number' },
        { status: 400 }
      );
    }

    if (!phoneNumber || !/^\+370?\d{7,8}$/.test(phoneNumber.replace(/\s/g, ''))) {
      // Accept +372XXXXXXXX format (Estonian) or other +3XX formats
      if (!/^\+\d{7,15}$/.test(phoneNumber.replace(/\s/g, ''))) {
        return NextResponse.json(
          { error: 'Telefoninumber peab algama +-märgiga (nt +372XXXXXXXX)' },
          { status: 400 }
        );
      }
    }

    const cleanPhone = phoneNumber.replace(/\s/g, '');
    const { sessionId, challengeCode } = await startMobileIdAuth(cleanPhone, personalCode);

    const cookieStore = await cookies();
    const eidSession = JSON.stringify({
      sessionId,
      personalCode,
      method: 'mobile-id',
    });

    cookieStore.set('eid_session', eidSession, {
      httpOnly: true,
      maxAge: 5 * 60, // 5 minutes
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ challengeCode });
  } catch (error) {
    console.error('Mobile-ID start error:', error);
    const message =
      error instanceof Error ? error.message : 'Mobiil-ID autentimine ebaõnnestus';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
