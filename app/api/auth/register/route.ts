import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { Role } from '@/lib/generated/prisma/client';
import { RegisterSchema, parseBody } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = parseBody(RegisterSchema, raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { name, email, password, role } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'See e-posti aadress on juba kasutusel' }, { status: 409 });
    }

    const validRoles: Role[] = ['TEACHER', 'STUDENT', 'PARENT', 'SCHOOL_ADMIN'];
    const userRole: Role = role && validRoles.includes(role) ? role : 'TEACHER';

    const hashedPassword = await bcrypt.hash(password, 12);

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
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Serveriviga. Proovi uuesti.' }, { status: 500 });
  }
}
