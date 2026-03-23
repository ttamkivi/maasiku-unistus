import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'E-post on kohustuslik' }, { status: 400 });

    const user = await db.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user || !user.password) {
      return NextResponse.json({ ok: true });
    }

    // Delete any existing reset tokens for this email
    await db.inviteToken.deleteMany({ where: { email } });

    // Create a fresh reset token valid for 1 hour
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.inviteToken.create({
      data: {
        email,
        token,
        expiresAt,
        role: user.role,      // required field — reuse user's current role
        createdBy: user.id,   // required field — self-initiated reset
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;

    // In production: send email here
    console.log(`\n🔑 Password reset link for ${email}:\n${resetUrl}\n`);

    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json({ ok: true, ...(isDev ? { devResetUrl: resetUrl } : {}) });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
