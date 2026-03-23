import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

async function getTeacherSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.teacherProfile) return null;
  return session;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('mu_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await getTeacherSession(token);
    if (!session) return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });

    const teacherProfile = session.user.teacherProfile!;
    const { id, resultId } = await params;

    const result = await db.testResult.findFirst({
      where: {
        id: resultId,
        testId: id,
        test: { teacherId: teacherProfile.id },
      },
    });

    if (!result) return NextResponse.json({ error: 'Tulemust ei leitud' }, { status: 404 });

    if (result.status === 'APPROVED' || result.status === 'SHARED' || result.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'Tagasiside on juba kinnitatud' }, { status: 400 });
    }

    const wasEdited = result.editedFeedback !== null;

    const updated = await db.testResult.update({
      where: { id: resultId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        // Lock the feedback version: if no editedFeedback, copy rawFeedback so the version is frozen
        editedFeedback: result.editedFeedback ?? result.rawFeedback,
      },
    });

    // GDPR Art 22: audit trail — who approved, when, and whether they modified the AI output
    await audit('RESULT_APPROVED', {
      userId: session.user.id,
      targetType: 'TestResult',
      targetId: resultId,
      details: {
        testId: id,
        teacherModifiedAI: wasEdited,
        studentName: result.studentName ?? null,
      },
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('POST approve error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
