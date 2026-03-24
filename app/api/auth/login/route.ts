import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { createSession, SESSION_DURATION_DAYS } from '@/lib/auth';
import { LoginSchema, parseBody } from '@/lib/validation';

// Brute-force constants
const MAX_FAILURES = 10;       // max failed attempts per window
const WINDOW_MS    = 15 * 60 * 1000; // 15-minute rolling window
const LOCKOUT_MS   = 15 * 60 * 1000; // lockout duration

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = parseBody(LoginSchema, raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const windowStart = new Date(Date.now() - WINDOW_MS);

    // Check recent failures for this IP (LibSQL doesn't support string_contains on JSON fields)
    const recentFailures = await db.auditLog.count({
      where: {
        action: 'LOGIN_FAILED',
        timestamp: { gte: windowStart },
        ipAddress: ip,
      },
    });

    if (recentFailures >= MAX_FAILURES) {
      await audit('LOGIN_BLOCKED', {
        details: { email, reason: 'brute_force', recentFailures },
        ip,
        userAgent: request.headers.get('user-agent'),
      });
      return NextResponse.json(
        { error: `Liiga palju ebaõnnestunud katseid. Proovi ${Math.ceil(LOCKOUT_MS / 60000)} minuti pärast uuesti.` },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({ where: { email } });

    // Dummy hash for constant-time comparison when user doesn't exist.
    // This prevents timing attacks that could reveal valid email addresses.
    const DUMMY_HASH = '$2a$12$0000000000000000000000000000000000000000000000000000';
    const hashToCompare = (user && user.password) ? user.password : DUMMY_HASH;
    const passwordMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !user.password || !passwordMatch) {
      await audit('LOGIN_FAILED', {
        userId: user?.id,
        details: { email },
        ip,
        userAgent: request.headers.get('user-agent'),
      });
      return NextResponse.json({ error: 'Vale e-post või parool' }, { status: 401 });
    }

    const token = await createSession(user.id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    await audit('LOGIN', {
      userId: user.id,
      details: { role: user.role },
      ip,
      userAgent: request.headers.get('user-agent'),
    });

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
