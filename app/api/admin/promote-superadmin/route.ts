import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

// TEMPORARY endpoint — promote current SCHOOL_ADMIN to SUPERADMIN
// DELETE THIS FILE after first use
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  if (session.user.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Only SCHOOL_ADMIN can use this' }, { status: 403 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { role: 'SUPERADMIN' },
  });

  return NextResponse.json({ success: true, message: 'Promoted to SUPERADMIN. Delete this endpoint now!' });
}
