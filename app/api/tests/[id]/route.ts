import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { TestStatus } from '@/lib/generated/prisma/client';

async function getTeacherSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.teacherProfile && session.user.role !== 'SUPERADMIN') return null;
  return session;
}

const STATUS_ORDER: TestStatus[] = [
  'PREPARING',
  'READY',
  'DISTRIBUTED',
  'COLLECTING',
  'PROCESSING',
  'COMPLETE',
  'ARCHIVED',
];

export async function GET(
  _request: NextRequest,
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

    const test = await db.test.findFirst({
      where: { id, deletedAt: null },
      include: {
        subject: true,
        results: {
          orderBy: { createdAt: 'asc' },
          include: { trainingConsent: true },
        },
      },
    });

    if (!test) return NextResponse.json({ error: 'Testi ei leitud' }, { status: 404 });

    return NextResponse.json(test);
  } catch (error) {
    console.error('GET /api/tests/[id] error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

export async function PATCH(
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

    const test = await db.test.findFirst({
      where: { id, deletedAt: null },
    });

    if (!test) return NextResponse.json({ error: 'Testi ei leitud' }, { status: 404 });

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Handle status advancement
    if (body.advance === true) {
      const currentIndex = STATUS_ORDER.indexOf(test.status as TestStatus);
      if (currentIndex === -1 || currentIndex >= STATUS_ORDER.length - 1) {
        return NextResponse.json({ error: 'Ei saa edasi liikuda' }, { status: 400 });
      }
      const nextStatus = STATUS_ORDER[currentIndex + 1];
      updateData.status = nextStatus;

      // Set date fields when advancing to certain statuses
      if (nextStatus === 'DISTRIBUTED') updateData.distributedDate = new Date();
      if (nextStatus === 'COLLECTING') updateData.collectedDate = new Date();
      if (nextStatus === 'COMPLETE') updateData.completedDate = new Date();
    }

    // Handle direct field updates
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.plannedDate !== undefined) {
      updateData.plannedDate = body.plannedDate ? new Date(body.plannedDate) : null;
    }
    if (body.distributedDate !== undefined) {
      updateData.distributedDate = body.distributedDate ? new Date(body.distributedDate) : null;
    }
    if (body.collectedDate !== undefined) {
      updateData.collectedDate = body.collectedDate ? new Date(body.collectedDate) : null;
    }
    if (body.completedDate !== undefined) {
      updateData.completedDate = body.completedDate ? new Date(body.completedDate) : null;
    }

    const updated = await db.test.update({
      where: { id },
      data: updateData,
      include: { subject: true, _count: { select: { results: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/tests/[id] error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
