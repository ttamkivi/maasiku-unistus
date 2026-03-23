import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { analyzeExercise, reviewFeedback } from '@/lib/exerciseAnalysis';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { studentProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const exercise = await db.exercise.findUnique({
    where: { id },
    include: {
      photos: { select: { base64Data: true, caption: true } },
      subject: true,
    },
  });

  if (!exercise) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only owner can retry
  const studentId = session.user.studentProfile?.id ?? null;
  if (exercise.studentId !== studentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const photos = exercise.photos.filter(
    (p): p is { base64Data: string; caption: string | null } => p.base64Data !== null
  );

  if (photos.length === 0) {
    return NextResponse.json({ error: 'No photos to analyze' }, { status: 400 });
  }

  await db.exercise.update({
    where: { id },
    data: { status: 'ANALYZING', rawFeedback: null, analyzedAt: null },
  });

  try {
    const draft = await analyzeExercise(
      exercise.topic,
      exercise.subject?.name ?? null,
      exercise.grade,
      exercise.studentName ?? 'Õpilane',
      exercise.studentNote,
      photos
    );
    const feedback = await reviewFeedback(draft, photos);

    await db.exercise.update({
      where: { id },
      data: {
        rawFeedback: JSON.stringify(feedback),
        status: 'FEEDBACK_READY',
        analyzedAt: new Date(),
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error('Exercise retry error:', err);
    await db.exercise.update({
      where: { id },
      data: {
        status: 'FEEDBACK_READY',
        rawFeedback: JSON.stringify({
          summary: `Analüüsimisel tekkis viga: ${errMsg}`,
          strengths: [],
          improvements: [],
          sections: [],
        }),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
