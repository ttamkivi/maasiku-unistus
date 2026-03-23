import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { analyzeTest } from '@/lib/claude';

async function getTeacherSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.teacherProfile) return null;
  return session;
}

// GET /api/tests/[id]/bulk-analyze
// Returns all UPLOADED results with photos for bulk processing
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('mu_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await getTeacherSession(token);
    if (!session) return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });

    const teacherProfile = session.user.teacherProfile!;
    const { id } = await params;

    const test = await db.test.findFirst({
      where: { id, teacherId: teacherProfile.id, deletedAt: null },
      include: { subject: true },
    });
    if (!test) return NextResponse.json({ error: 'Testi ei leitud' }, { status: 404 });

    const results = await db.testResult.findMany({
      where: { testId: id, status: 'UPLOADED' },
      include: { photos: { select: { base64Data: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      testId: id,
      grade: test.grade,
      topic: test.topic || test.title,
      subject: test.subject?.name || 'Füüsika',
      rubric: test.rubric,
      answerKey: test.answerKey,
      results: results.map((r) => ({
        id: r.id,
        studentName: r.studentName,
        photos: r.photos.map((p) => p.base64Data),
      })),
    });
  } catch (error) {
    console.error('GET /api/tests/[id]/bulk-analyze error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

// POST /api/tests/[id]/bulk-analyze
// Analyze a single result (called per-result from the client to show progress)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('mu_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await getTeacherSession(token);
    if (!session) return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });

    const teacherProfile = session.user.teacherProfile!;
    const { id } = await params;

    const test = await db.test.findFirst({
      where: { id, teacherId: teacherProfile.id, deletedAt: null },
      include: { subject: true },
    });
    if (!test) return NextResponse.json({ error: 'Testi ei leitud' }, { status: 404 });

    const body = await request.json();
    const { resultId } = body as { resultId: string };

    const result = await db.testResult.findFirst({
      where: { id: resultId, testId: id, status: 'UPLOADED' },
      include: { photos: { select: { base64Data: true } } },
    });
    if (!result) return NextResponse.json({ error: 'Tulemust ei leitud' }, { status: 404 });

    if (result.photos.length === 0) {
      return NextResponse.json({ error: 'Tulemusel pole fotosid' }, { status: 400 });
    }

    const feedback = await analyzeTest(
      test.grade || '9',
      test.topic || test.title,
      result.studentName || 'Õpilane',
      result.photos.map((p) => p.base64Data),
      test.rubric,
      test.answerKey,
    );

    await db.testResult.update({
      where: { id: resultId },
      data: {
        rawFeedback: JSON.stringify(feedback),
        status: 'DRAFT',
        analyzedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, resultId });
  } catch (error) {
    console.error('POST /api/tests/[id]/bulk-analyze error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
