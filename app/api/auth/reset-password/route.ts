import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { ResetPasswordSchema, parseBody } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = parseBody(ResetPasswordSchema, raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { token, password } = parsed.data;

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
