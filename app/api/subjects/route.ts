import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
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

    const body = await request.json() as { name?: string; category?: string; gradeLevels?: string };
    const name = (body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'Aine nimi on kohustuslik' }, { status: 400 });

    const category = (body.category ?? '').trim() || 'muu';
    const gradeLevels = (body.gradeLevels ?? '').trim() || '1-12';

    const subject = await db.subject.create({
      data: { name, category, gradeLevels },
    });

    return NextResponse.json(subject, { status: 201 });
  } catch (error) {
    console.error('POST /api/subjects error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
