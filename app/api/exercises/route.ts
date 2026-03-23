import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { analyzeExercise, reviewFeedback } from '@/lib/exerciseAnalysis';

export async function POST(req: NextRequest) {
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

  const { photos, topic, subjectId, grade, studentNote } = await req.json();

  if (!topic?.trim()) {
    return NextResponse.json({ error: 'Teema on kohustuslik' }, { status: 400 });
  }
  if (!photos || photos.length === 0) {
    return NextResponse.json({ error: 'Vähemalt üks foto on kohustuslik' }, { status: 400 });
  }
  if (photos.length > 10) {
    return NextResponse.json({ error: 'Maksimaalselt 10 fotot' }, { status: 400 });
  }

  const studentId = session.user.studentProfile?.id ?? null;
  const studentName = session.user.name;

  let subjectName: string | null = null;
  if (subjectId) {
    const subject = await db.subject.findUnique({ where: { id: subjectId } });
    subjectName = subject?.name ?? null;
  }

  const exercise = await db.exercise.create({
    data: {
      studentId,
      studentName,
      subjectId: subjectId || null,
      topic: topic.trim(),
      grade: grade || null,
      studentNote: studentNote || null,
      status: 'ANALYZING',
      photos: {
        create: photos.map((p: { base64Data: string; caption?: string }) => ({
          base64Data: p.base64Data,
          caption: p.caption || null,
        })),
      },
    },
  });

  // Run AI analysis
  try {
    const draft = await analyzeExercise(
      topic.trim(),
      subjectName,
      grade || null,
      studentName,
      studentNote || null,
      photos
    );
    const feedback = await reviewFeedback(draft, photos);

    await db.exercise.update({
      where: { id: exercise.id },
      data: {
        rawFeedback: JSON.stringify(feedback),
        status: 'FEEDBACK_READY',
        analyzedAt: new Date(),
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error('Exercise analysis error:', err);
    await db.exercise.update({
      where: { id: exercise.id },
      data: { status: 'FEEDBACK_READY', rawFeedback: JSON.stringify({ summary: `Analüüsimisel tekkis viga: ${errMsg}`, strengths: [], improvements: [], sections: [] }) },
    });
  }

  return NextResponse.json({ id: exercise.id });
}

export async function GET(req: NextRequest) {
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

  const studentId = session.user.studentProfile?.id;
  if (!studentId) return NextResponse.json({ exercises: [] });

  const exercises = await db.exercise.findMany({
    where: { studentId, status: { not: 'ARCHIVED' } },
    include: { subject: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ exercises });
}
