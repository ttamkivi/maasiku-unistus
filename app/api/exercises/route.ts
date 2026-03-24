import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { analyzeExercise, reviewFeedback } from '@/lib/exerciseAnalysis';
import { CreateExerciseSchema, parseBody } from '@/lib/validation';
import { uploadPhotoToBlob } from '@/lib/blob';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { studentProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = await req.json();
  // Validate using schema — photos array expects string entries (base64Data values extracted for validation)
  const photoStrings = Array.isArray(rawBody.photos)
    ? rawBody.photos.map((p: unknown) =>
        typeof p === 'string' ? p : typeof p === 'object' && p !== null && 'base64Data' in p
          ? (p as { base64Data: string }).base64Data
          : ''
      )
    : rawBody.photos;
  const parsed = parseBody(CreateExerciseSchema, { ...rawBody, photos: photoStrings });
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { topic, subjectId } = parsed.data;
  const photos = rawBody.photos as { base64Data: string; caption?: string }[];
  const { grade, studentNote } = rawBody as { grade?: string; studentNote?: string };

  const studentId = session.user.studentProfile?.id ?? null;
  const studentName = session.user.name;

  let subjectName: string | null = null;
  if (subjectId) {
    const subject = await db.subject.findUnique({ where: { id: subjectId } });
    subjectName = subject?.name ?? null;
  }

  // Upload photos to Vercel Blob (if token is set), else fall back to base64
  const photoCreateData = await Promise.all(
    photos.map(async (p: { base64Data: string; caption?: string }, i: number) => {
      const result = await uploadPhotoToBlob(p.base64Data, `exercise-${Date.now()}-${i}.jpg`);
      if (result) {
        return {
          storageMode: 'blob',
          storageKey: result.url,
          base64Data: null as string | null,
          caption: p.caption || null,
        };
      }
      return {
        storageMode: 'local_only',
        base64Data: p.base64Data,
        caption: p.caption || null,
      };
    })
  );

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
        create: photoCreateData,
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
  const token = cookieStore.get('ot_session')?.value;
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
