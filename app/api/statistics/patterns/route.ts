import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getTeacherUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const user = session.user;
  if (user.role !== 'TEACHER' && user.role !== 'SUPERADMIN' && user.role !== 'SCHOOL_ADMIN') return null;
  return user;
}

/** GET /api/statistics/patterns — list all feedback patterns */
export async function GET() {
  const user = await getTeacherUser();
  if (!user) return NextResponse.json({ error: 'Logi sisse' }, { status: 401 });

  const patterns = await db.feedbackPattern.findMany({
    orderBy: [{ severity: 'asc' }, { frequency: 'desc' }, { updatedAt: 'desc' }],
  });

  return NextResponse.json({ patterns });
}

/** POST /api/statistics/patterns — add a new pattern */
export async function POST(req: NextRequest) {
  const user = await getTeacherUser();
  if (!user) return NextResponse.json({ error: 'Logi sisse' }, { status: 401 });

  const body = await req.json();
  const { dimension, pattern, correction, example, topic, grade, severity } = body;

  if (!dimension || !pattern || !correction) {
    return NextResponse.json({ error: 'Dimensioon, muster ja parandus on kohustuslikud' }, { status: 400 });
  }

  const validDimensions = ['accuracy', 'classification', 'scoring', 'curriculum', 'tone', 'completeness', 'explanation', 'formula', 'other'];
  if (!validDimensions.includes(dimension)) {
    return NextResponse.json({ error: 'Vale dimensioon' }, { status: 400 });
  }

  const validSeverities = ['critical', 'important', 'minor'];
  if (severity && !validSeverities.includes(severity)) {
    return NextResponse.json({ error: 'Vale tõsidus' }, { status: 400 });
  }

  const created = await db.feedbackPattern.create({
    data: {
      dimension,
      pattern: pattern.slice(0, 1000),
      correction: correction.slice(0, 1000),
      example: example?.slice(0, 2000) || null,
      topic: topic?.slice(0, 200) || null,
      grade: grade?.slice(0, 10) || null,
      severity: severity || 'important',
      frequency: 1,
      active: true,
    },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'PATTERN_CREATED',
      targetType: 'FeedbackPattern',
      targetId: created.id,
      details: JSON.stringify({ dimension, pattern: pattern.slice(0, 200) }),
    },
  });

  return NextResponse.json({ pattern: created });
}

/** PATCH /api/statistics/patterns — toggle active/inactive */
export async function PATCH(req: NextRequest) {
  const user = await getTeacherUser();
  if (!user) return NextResponse.json({ error: 'Logi sisse' }, { status: 401 });

  const body = await req.json();
  const { id, active } = body;

  if (!id || typeof active !== 'boolean') {
    return NextResponse.json({ error: 'ID ja active on kohustuslikud' }, { status: 400 });
  }

  const updated = await db.feedbackPattern.update({
    where: { id },
    data: { active },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: active ? 'PATTERN_ACTIVATED' : 'PATTERN_DEACTIVATED',
      targetType: 'FeedbackPattern',
      targetId: id,
    },
  });

  return NextResponse.json({ pattern: updated });
}
