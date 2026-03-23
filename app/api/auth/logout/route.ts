import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('mu_session')?.value;

    if (token) {
      await db.session.deleteMany({ where: { token } });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set('mu_session', '', {
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
