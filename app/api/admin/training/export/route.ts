import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  if (!['SUPERADMIN', 'SCHOOL_ADMIN'].includes(session.user.role)) return null;
  return session.user;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Juurdepääs keelatud' }, { status: 403 });
    }

    const records = await db.anonymizedTrainingData.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const exportData = records.map((r) => {
      let feedbackParsed: unknown = r.feedback;
      try {
        feedbackParsed = JSON.parse(r.feedback);
      } catch {
        // keep as string if not valid JSON
      }

      return {
        grade: r.grade,
        subject: r.subject,
        score: r.score,
        maxScore: r.maxScore,
        feedback: feedbackParsed,
        teacherNotes: r.teacherNotes,
        teacherComment: r.teacherComment,
        createdAt: r.createdAt,
      };
    });

    const today = new Date().toISOString().slice(0, 10);
    const filename = `training-data-${today}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('GET /api/admin/training/export error:', msg);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
