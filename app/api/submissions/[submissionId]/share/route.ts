import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const { submissionId } = await params;
  const token = req.cookies.get('mu_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { studentProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const submission = await db.assignmentSubmission.findUnique({ where: { id: submissionId } });
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only the submitting student can share
  if (session.user.studentProfile?.id !== submission.studentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (submission.status !== 'FEEDBACK_READY') {
    return NextResponse.json({ error: 'Tagasiside pole veel valmis' }, { status: 400 });
  }

  await db.assignmentSubmission.update({
    where: { id: submissionId },
    data: { status: 'SHARED_WITH_TEACHER', sharedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
