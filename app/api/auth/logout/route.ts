import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('ot_session')?.value;

    if (token) {
      const session = await db.session.findUnique({
        where: { token },
        select: { userId: true },
      });
      await db.session.deleteMany({ where: { token } });
      await audit('LOGOUT', {
        userId: session?.userId,
        ip: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent'),
      });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set('ot_session', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
    });
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Serveriviga.' }, { status: 500 });
  }
}
