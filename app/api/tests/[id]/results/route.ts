import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { uploadPhotoToBlob } from '@/lib/blob';

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

    // Verify test belongs to this teacher
    const test = await db.test.findFirst({
      where: { id, deletedAt: null },
    });

    if (!test) return NextResponse.json({ error: 'Testi ei leitud' }, { status: 404 });

    const body = await request.json();
    const { studentName, score, maxScore, storageMode, photos } = body as {
      studentName: string;
      score?: number;
      maxScore?: number;
      storageMode?: string;
      photos?: string[];
    };

    if (!studentName || !studentName.trim()) {
      return NextResponse.json({ error: 'Õpilase nimi on kohustuslik' }, { status: 400 });
    }

    // Duplicate check: prevent creating a second result for the same student
    const existingResults = await db.testResult.findMany({
      where: { testId: id },
      select: { id: true, studentName: true },
    });
    const duplicate = existingResults.find(
      (r) => (r.studentName ?? '').trim().toLowerCase() === studentName.trim().toLowerCase()
    );
    if (duplicate) {
      return NextResponse.json(
        { error: 'Selle nimega tulemus on juba olemas', existingId: duplicate.id },
        { status: 409 }
      );
    }

    // Upload photos to Vercel Blob (if token is set), else fall back to base64
    let photoCreateData: Array<{ storageMode: string; storageKey?: string; base64Data: string | null }> | undefined;
    if (photos && photos.length > 0) {
      photoCreateData = await Promise.all(
        photos.map(async (base64Data: string, i: number) => {
          const result = await uploadPhotoToBlob(base64Data, `result-${Date.now()}-${i}.jpg`);
          if (result) {
            return {
              storageMode: 'blob',
              storageKey: result.url,
              base64Data: null as string | null,
            };
          }
          return {
            storageMode: 'local_only',
            base64Data,
          };
        })
      );
    }

    const result = await db.testResult.create({
      data: {
        testId: id,
        studentName: studentName.trim(),
        score: score ?? null,
        maxScore: maxScore ?? null,
        storageMode: storageMode || 'local_only',
        status: 'PENDING',
        uploadedAt: photos && photos.length > 0 ? new Date() : null,
        photos: photoCreateData
          ? { create: photoCreateData }
          : undefined,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/tests/[id]/results error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
