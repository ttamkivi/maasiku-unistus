import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Role } from '@/lib/generated/prisma/client';
import { hashPassword, createSession, SESSION_DURATION_DAYS } from '@/lib/auth';
import { RegisterSchema, parseBody } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = parseBody(RegisterSchema, raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { name, email, password, role, inviteToken: rawInviteToken } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'See e-posti aadress on juba kasutusel' }, { status: 409 });
    }

    const validRoles: Role[] = ['TEACHER', 'STUDENT', 'PARENT', 'SCHOOL_ADMIN'];
    const userRole: Role = role && validRoles.includes(role) ? role : 'TEACHER';

    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: { name, email, password: hashedPassword, role: userRole },
    });

    if (userRole === 'TEACHER') {
      await db.teacherProfile.create({ data: { userId: user.id } });
    } else if (userRole === 'STUDENT') {
      await db.studentProfile.create({ data: { userId: user.id } });
    } else if (userRole === 'PARENT') {
      await db.parentProfile.create({ data: { userId: user.id } });
    } else if (userRole === 'SCHOOL_ADMIN') {
      await db.adminProfile.create({ data: { userId: user.id } });
    }

    // Mark invite token as used if valid
    if (rawInviteToken) {
      try {
        const invite = await db.inviteToken.findUnique({ where: { token: rawInviteToken } });
        if (invite && !invite.usedAt && invite.expiresAt > new Date()) {
          await db.inviteToken.update({
            where: { token: rawInviteToken },
            data: { usedAt: new Date() },
          });
        }
      } catch {
        // Silently ignore invalid invite tokens
      }
    }

    const token = await createSession(user.id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
    response.cookies.set('ot_session', token, {
      httpOnly: true,
      expires: expiresAt,
      path: '/',
      sameSite: 'lax',
    });
    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Serveriviga. Proovi uuesti.' }, { status: 500 });
  }
}
