import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) {
      return NextResponse.json({ error: 'Puuduvad andmed' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Parool peab olema vähemalt 8 märki' }, { status: 400 });
    }

    const invite = await db.inviteToken.findUnique({ where: { token } });
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Link on aegunud või juba kasutatud' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: invite.email } });
    if (!user) {
      return NextResponse.json({ error: 'Kasutajat ei leitud' }, { status: 404 });
    }

    const hashed = await bcrypt.hash(password, 12);
    await db.user.update({ where: { id: user.id }, data: { password: hashed } });
    await db.inviteToken.update({ where: { token }, data: { usedAt: new Date() } });

    // Invalidate all existing sessions so old logins stop working
    await db.session.deleteMany({ where: { userId: user.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
