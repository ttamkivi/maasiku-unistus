import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

const ADMIN_ROLES = ['SUPERADMIN', 'SCHOOL_ADMIN'];

async function getAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  if (!ADMIN_ROLES.includes(session.user.role)) return null;
  return session.user;
}

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Juurdepääs keelatud' }, { status: 403 });
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        teacherProfile: {
          select: {
            id: true,
            schools: { include: { school: { select: { name: true } } } },
          },
        },
        studentProfile: {
          select: {
            id: true,
            school: { select: { name: true } },
          },
        },
        parentProfile: { select: { id: true } },
        adminProfile: { select: { id: true } },
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('GET /api/admin/users error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Juurdepääs keelatud' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email: rawEmail, password, role, schoolId, className, grade } = body as {
      name: string;
      email: string;
      password?: string;
      role: string;
      schoolId?: string;
      className?: string;
      grade?: string;
    };

    if (!name || !rawEmail || !role) {
      return NextResponse.json(
        { error: 'Nimi, e-post ja roll on kohustuslikud' },
        { status: 400 }
      );
    }

    const validRoles = ['SUPERADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Vigane roll' }, { status: 400 });
    }

    // Only SUPERADMIN can create SUPERADMIN / SCHOOL_ADMIN accounts
    if ((role === 'SUPERADMIN' || role === 'SCHOOL_ADMIN') && admin.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Ainult SUPERADMIN saab luua kõrgema taseme administraatoreid' }, { status: 403 });
    }

    const email = rawEmail.trim().toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Selle e-postiga kasutaja on juba olemas' },
        { status: 409 }
      );
    }

    if (password && password.length < 8) {
      return NextResponse.json({ error: 'Parool peab olema vähemalt 8 tähemärki' }, { status: 400 });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as 'SUPERADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT',
      },
    });

    // Create role-specific profile
    if (role === 'TEACHER') {
      await db.teacherProfile.create({ data: { userId: user.id } });
    } else if (role === 'STUDENT') {
      await db.studentProfile.create({ data: { userId: user.id, schoolId: schoolId ?? null } });
    } else if (role === 'PARENT') {
      await db.parentProfile.create({ data: { userId: user.id } });
    } else if (['SUPERADMIN', 'SCHOOL_ADMIN'].includes(role)) {
      await db.adminProfile.create({ data: { userId: user.id } });
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: 'USER_CREATED',
        targetType: 'User',
        targetId: user.id,
        details: JSON.stringify({ name, email, role }),
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('POST /api/admin/users error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
