import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

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

    if (result.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Tagasiside peab olema enne kinnitatud' }, { status: 400 });
    }

    const now = new Date();

    const updated = await db.testResult.update({
      where: { id: resultId },
      data: {
        status: 'SHARED',
        sharedAt: now,
      },
    });

    // Log to AuditLog
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'FEEDBACK_SHARED',
        targetType: 'TestResult',
        targetId: resultId,
        details: JSON.stringify({ testId: id, resultId, studentName: result.studentName }),
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('POST share error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
