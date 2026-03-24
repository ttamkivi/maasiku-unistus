import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

const ADMIN_ROLES = ['ADMIN', 'SUPERADMIN', 'SCHOOL_ADMIN'];
const VALID_ROLES = ['SUPERADMIN', 'SCHOOL_ADMIN', 'ADMIN', 'TEACHER', 'KLASSIJUHATAJA', 'STUDENT', 'PARENT'];

// Roles that only SUPERADMIN can assign
const SUPERADMIN_ONLY_ROLES = ['SUPERADMIN', 'SCHOOL_ADMIN'];

async function getAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!ADMIN_ROLES.includes(session.user.role)) return null;
  return session.user;
}

// PATCH /api/admin/users/[id] — change role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Juurdepääs keelatud' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role: newRole } = body as { role: string };

    if (!newRole || !VALID_ROLES.includes(newRole)) {
      return NextResponse.json({ error: 'Vigane roll' }, { status: 400 });
    }

    // Only SUPERADMIN can assign SUPERADMIN/SCHOOL_ADMIN roles
    if (SUPERADMIN_ONLY_ROLES.includes(newRole) && admin.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Ainult SUPERADMIN saab määrata seda rolli' }, { status: 403 });
    }

    // Cannot change your own role
    if (id === admin.id) {
      return NextResponse.json({ error: 'Ei saa muuta oma rolli' }, { status: 400 });
    }

    const target = await db.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'Kasutajat ei leitud' }, { status: 404 });
    }

    // Non-SUPERADMIN cannot change a SUPERADMIN's role
    if (target.role === 'SUPERADMIN' && admin.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Puuduvad õigused' }, { status: 403 });
    }

    const oldRole = target.role;

    await db.user.update({
      where: { id },
      data: { role: newRole as 'SUPERADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: 'USER_ROLE_CHANGED',
        targetType: 'User',
        targetId: id,
        details: JSON.stringify({ from: oldRole, to: newRole, targetEmail: target.email }),
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    });

    return NextResponse.json({ ok: true, role: newRole });
  } catch (error) {
    console.error('PATCH /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminUser();
    if (!admin || admin.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Ainult SUPERADMIN saab kasutajaid kustutada' }, { status: 403 });
    }

    const { id } = await params;

    if (id === admin.id) {
      return NextResponse.json({ error: 'Ei saa oma kontot kustutada' }, { status: 400 });
    }

    const target = await db.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'Kasutajat ei leitud' }, { status: 404 });
    }

    // Delete sessions first, then user (cascades)
    await db.session.deleteMany({ where: { userId: id } });
    await db.user.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: 'USER_DELETED',
        targetType: 'User',
        targetId: id,
        details: JSON.stringify({ email: target.email, role: target.role }),
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
