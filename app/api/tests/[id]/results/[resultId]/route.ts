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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
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
      include: {
        test: { include: { subject: true } },
        trainingConsent: true,
        photos: { where: { deletedAt: null } },
      },
    });

    if (!result) return NextResponse.json({ error: 'Tulemust ei leitud' }, { status: 404 });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/tests/[id]/results/[resultId] error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
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

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.editedFeedback !== undefined) {
      updateData.editedFeedback = body.editedFeedback;
      // If currently REVIEWED, advance to EDITED
      if (result.status === 'REVIEWED') {
        updateData.status = 'EDITED';
      }
    }

    if (body.teacherNotes !== undefined) updateData.teacherNotes = body.teacherNotes;
    if (body.teacherComment !== undefined) updateData.teacherComment = body.teacherComment;
    if (body.score !== undefined) updateData.score = body.score;
    if (body.maxScore !== undefined) updateData.maxScore = body.maxScore;

    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'REVIEWED' && !result.reviewedAt) {
        updateData.reviewedAt = new Date();
      }
    }

    const updated = await db.testResult.update({
      where: { id: resultId },
      data: updateData,
      include: { trainingConsent: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/tests/[id]/results/[resultId] error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await getTeacherSession(token);
    if (!session) return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });

    const teacherProfile = session.user.teacherProfile!;
    const { id, resultId } = await params;

    // Verify the result belongs to this teacher's test
    const result = await db.testResult.findFirst({
      where: {
        id: resultId,
        testId: id,
        test: { teacherId: teacherProfile.id },
      },
    });

    if (!result) return NextResponse.json({ error: 'Tulemust ei leitud' }, { status: 404 });

    // Delete associated photos first (soft delete)
    await db.workPhoto.updateMany({
      where: { testResultId: resultId },
      data: { deletedAt: new Date() },
    });

    // Delete the result
    await db.testResult.delete({
      where: { id: resultId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/tests/[id]/results/[resultId] error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
