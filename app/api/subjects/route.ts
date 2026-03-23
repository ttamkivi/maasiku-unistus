import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('mu_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });
    }

    const subjects = await db.subject.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(subjects);
  } catch (error) {
    console.error('GET /api/subjects error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
