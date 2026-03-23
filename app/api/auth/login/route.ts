import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email: rawEmail, password } = body;

    if (!rawEmail || !password) {
      return NextResponse.json({ error: 'Vale e-post või parool' }, { status: 401 });
    }

    const email = rawEmail.trim().toLowerCase();
    const user = await db.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Vale e-post või parool' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Vale e-post või parool' }, { status: 401 });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.session.create({ data: { userId: user.id, token, expiresAt } });

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
    response.cookies.set('mu_session', token, {
      httpOnly: true,
      expires: expiresAt,
      path: '/',
      sameSite: 'lax',
    });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Serveriviga. Proovi uuesti.' }, { status: 500 });
  }
}
