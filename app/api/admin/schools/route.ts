import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

const ADMIN_ROLES = ['ADMIN', 'SUPERADMIN', 'SCHOOL_ADMIN'];

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admins see all schools; teachers see their own schools
    let schools;
    if (ADMIN_ROLES.includes(session.user.role)) {
      schools = await db.school.findMany({ orderBy: { name: 'asc' } });
    } else {
      const teacher = await db.teacherProfile.findUnique({
        where: { userId: session.user.id },
        include: { schools: { include: { school: true } } },
      });
      schools = teacher?.schools.map((ts) => ts.school) ?? [];
    }

    return NextResponse.json({ schools });
  } catch (error) {
    console.error('GET /api/admin/schools error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
