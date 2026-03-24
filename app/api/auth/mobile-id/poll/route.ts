import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pollMobileIdSession, findOrCreateEidUser } from '@/lib/eid';
import { db } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const eidSessionCookie = cookieStore.get('eid_session');

    if (!eidSessionCookie) {
      return NextResponse.json({ error: 'Seanss on aegunud. Alusta autentimist uuesti.' }, { status: 400 });
    }

    let eidSession: { sessionId: string; personalCode: string; method: string };
    try {
      eidSession = JSON.parse(eidSessionCookie.value);
    } catch {
      return NextResponse.json({ error: 'Vigane seanss. Alusta autentimist uuesti.' }, { status: 400 });
    }

    if (eidSession.method !== 'mobile-id') {
      return NextResponse.json({ error: 'Vale autentimismeetod' }, { status: 400 });
    }

    const result = await pollMobileIdSession(eidSession.sessionId);

    if (result.state === 'RUNNING') {
      return NextResponse.json({ state: 'RUNNING' });
    }

    if (result.state === 'ERROR' || !result.personalCode || !result.name) {
      const res = NextResponse.json({ state: 'ERROR', message: 'Autentimine ebaõnnestus' });
      res.cookies.set('eid_session', '', { maxAge: 0, path: '/' });
      return res;
    }

    const user = await findOrCreateEidUser(result.personalCode, result.name);
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.session.create({ data: { userId: user.id, token, expiresAt } });

    const res = NextResponse.json({ state: 'COMPLETE', redirectTo: '/dashboard' });
    res.cookies.set('ot_session', token, { httpOnly: true, expires: expiresAt, path: '/', sameSite: 'lax' });
    res.cookies.set('eid_session', '', { maxAge: 0, path: '/' });
    return res;
  } catch (error) {
    console.error('Mobile-ID poll error:', error);
    const res = NextResponse.json({ state: 'ERROR', message: 'Serveriviga. Proovi uuesti.' }, { status: 500 });
    res.cookies.set('eid_session', '', { maxAge: 0, path: '/' });
    return res;
  }
}
