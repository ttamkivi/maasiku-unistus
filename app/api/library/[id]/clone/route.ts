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

// POST /api/library/[id]/clone — clone a public test into teacher's own collection
export async function POST(
  _req: NextRequest,
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

    // Find the source test — must be PUBLIC
    const sourceTest = await db.test.findFirst({
      where: { id, visibility: 'PUBLIC', deletedAt: null },
      include: { subject: true, curriculumLinks: true },
    });

    if (!sourceTest) {
      return NextResponse.json({ error: 'Testi ei leitud raamatukogus' }, { status: 404 });
    }

    // Create the clone as a PRIVATE copy
    const clone = await db.test.create({
      data: {
        teacherId: teacherProfile.id,
        ownerId: teacherProfile.id,
        subjectId: sourceTest.subjectId,
        title: sourceTest.title,
        topic: sourceTest.topic,
        grade: sourceTest.grade,
        rubric: sourceTest.rubric,
        answerKey: sourceTest.answerKey,
        blankTestNotes: sourceTest.blankTestNotes,
        notes: `Kopeeritud raamatukogust: "${sourceTest.title}"`,
        status: 'PREPARING',
        visibility: 'PRIVATE',
        sourceTestId: sourceTest.id,
        versionNumber: 1,
        versionNote: `Kloonitud testist "${sourceTest.title}"`,
        // Copy curriculum links
        curriculumLinks: sourceTest.curriculumLinks.length > 0 ? {
          create: sourceTest.curriculumLinks.map(cl => ({
            curriculumCode: cl.curriculumCode,
            topicLabel: cl.topicLabel,
            gradeRange: cl.gradeRange,
            weightPercent: cl.weightPercent,
          })),
        } : undefined,
      },
    });

    captureServerEvent(session.user.id, 'library_test_cloned', {
      sourceTestId: sourceTest.id,
      cloneTestId: clone.id,
      topic: sourceTest.topic,
    });

    return NextResponse.json({
      id: clone.id,
      title: clone.title,
      message: 'Test kopeeritud edukalt',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/library/[id]/clone error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
