import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

/**
 * GET /api/materials — browse learning materials
 * Query params: curriculumCode, type, language, isFree, search, grade
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const curriculumCode = url.searchParams.get('curriculumCode');
  const type = url.searchParams.get('type');
  const language = url.searchParams.get('language');
  const isFree = url.searchParams.get('isFree');
  const search = url.searchParams.get('search');
  const grade = url.searchParams.get('grade');

  // Build Prisma where clause
  const where: Record<string, unknown> = {};
  if (curriculumCode) where.curriculumCode = curriculumCode;
  if (type) where.type = type;
  if (language) where.language = language;
  if (isFree === 'true') where.isFree = true;
  if (isFree === 'false') where.isFree = false;
  if (grade) where.gradeRange = grade;

  let materials = await db.learningResource.findMany({
    where,
    orderBy: [{ quality: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });

  // Client-side text search (LibSQL doesn't support insensitive)
  if (search) {
    const q = search.toLowerCase();
    materials = materials.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.description ?? '').toLowerCase().includes(q) ||
        (m.topic ?? '').toLowerCase().includes(q) ||
        (m.provider ?? '').toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ materials });
}

/**
 * POST /api/materials — add a new learning resource (teacher or admin)
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Logi sisse' }, { status: 401 });
  }

  // Verify session
  const session = await db.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Sessioon aegunud' }, { status: 401 });
  }

  const user = session.user;
  if (user.role !== 'TEACHER' && user.role !== 'SUPERADMIN' && user.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Pole õigust' }, { status: 403 });
  }

  const body = await req.json();
  const { curriculumCode, title, url, type, language, isFree, provider, description, gradeRange, topic } = body;

  if (!curriculumCode || !title || !url || !type) {
    return NextResponse.json({ error: 'Kohustuslikud väljad: curriculumCode, title, url, type' }, { status: 400 });
  }

  const validTypes = ['video', 'exercise', 'reading', 'course'];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `Tüüp peab olema: ${validTypes.join(', ')}` }, { status: 400 });
  }

  const resource = await db.learningResource.create({
    data: {
      curriculumCode,
      title,
      url,
      type,
      language: language || 'et',
      isFree: isFree !== false,
      provider: provider || null,
      description: description || null,
      gradeRange: gradeRange || null,
      topic: topic || null,
      quality: 3,
      addedBy: user.id,
      verified: false,
    },
  });

  return NextResponse.json({ resource }, { status: 201 });
}
