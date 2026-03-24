import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

// POST /api/admin/preview-role — set preview role (SUPERADMIN only)
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Ainult SUPERADMIN saab rolle eelvaadata' }, { status: 403 });
  }

  const { role } = await req.json();
  const validRoles = ['SUPERADMIN', 'SCHOOL_ADMIN', 'ADMIN', 'TEACHER', 'KLASSIJUHATAJA', 'STUDENT', 'PARENT'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Vigane roll' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, previewRole: role });
  response.cookies.set('ot_preview_role', role, {
    httpOnly: false, // client needs to read it for UI
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours max
  });
  return response;
}

// DELETE /api/admin/preview-role — clear preview role
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('ot_preview_role', '', {
    httpOnly: false,
    path: '/',
    sameSite: 'lax',
    maxAge: 0,
  });
  return response;
}
