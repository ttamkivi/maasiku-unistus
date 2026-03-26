import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { captureServerEvent } from '@/lib/posthog-server';

async function getTeacherSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.teacherProfile) return null;
  return session;
}

// POST /api/tests/[id]/publish — toggle test visibility (PUBLIC <-> PRIVATE)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await getTeacherSession(token);
    if (!session) return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });

    const teacherProfile = session.user.teacherProfile!;
    const { id } = await params;

    const test = await db.test.findFirst({
      where: { id, teacherId: teacherProfile.id, deletedAt: null },
    });

    if (!test) return NextResponse.json({ error: 'Testi ei leitud' }, { status: 404 });

    const body = await request.json();
    const { visibility } = body as { visibility: 'PUBLIC' | 'PRIVATE' };

    if (!['PUBLIC', 'PRIVATE'].includes(visibility)) {
      return NextResponse.json({ error: 'Vigane nähtavus' }, { status: 400 });
    }

    // Require rubric or answer key before publishing
    if (visibility === 'PUBLIC' && !test.rubric && !test.answerKey) {
      return NextResponse.json({
        error: 'Lisa enne avaldamist hindamisjuhend või õiged vastused',
      }, { status: 400 });
    }

    await db.test.update({
      where: { id },
      data: { visibility },
    });

    captureServerEvent(session.user.id, 'test_visibility_changed', {
      testId: id,
      visibility,
    });

    return NextResponse.json({
      id,
      visibility,
      message: visibility === 'PUBLIC' ? 'Test avaldatud raamatukogus' : 'Test peidetud raamatukogust',
    });
  } catch (error) {
    console.error('POST /api/tests/[id]/publish error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
