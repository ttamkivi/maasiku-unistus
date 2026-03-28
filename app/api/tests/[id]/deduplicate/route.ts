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

/**
 * POST /api/tests/[id]/deduplicate
 *
 * Finds duplicate test results (same studentName) and removes extras.
 * Keeps the result with the most progress (furthest status) or latest analysis.
 * Deletes the others (and their photos).
 */
export async function POST(
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
      select: { id: true },
    });
    if (!test) return NextResponse.json({ error: 'Testi ei leitud' }, { status: 404 });

    // Fetch all results ordered by status priority and analysis date
    const allResults = await db.testResult.findMany({
      where: { testId: id },
      select: { id: true, studentName: true, status: true, analyzedAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Status priority: higher = more progress, keep this one
    const STATUS_PRIORITY: Record<string, number> = {
      UPLOADED: 0,
      ANALYZING: 1,
      DRAFT: 2,
      REVIEWED: 3,
      EDITED: 4,
      APPROVED: 5,
      SHARED: 6,
      ARCHIVED: 7,
    };

    // Group by normalized student name
    const groups = new Map<string, typeof allResults>();
    for (const r of allResults) {
      const key = (r.studentName ?? '').trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    const toDelete: string[] = [];
    const kept: string[] = [];

    for (const [_name, results] of groups) {
      if (results.length <= 1) continue;

      // Sort: highest status priority first, then latest analyzedAt, then latest createdAt
      results.sort((a, b) => {
        const pa = STATUS_PRIORITY[a.status] ?? 0;
        const pb = STATUS_PRIORITY[b.status] ?? 0;
        if (pb !== pa) return pb - pa;
        if (a.analyzedAt && b.analyzedAt) return b.analyzedAt.getTime() - a.analyzedAt.getTime();
        if (a.analyzedAt) return -1;
        if (b.analyzedAt) return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      // Keep the first (best), delete the rest
      kept.push(results[0].id);
      for (let i = 1; i < results.length; i++) {
        toDelete.push(results[i].id);
      }
    }

    if (toDelete.length === 0) {
      return NextResponse.json({ message: 'Duplikaate ei leitud', deleted: 0 });
    }

    // Delete photos first (foreign key), then results
    await db.workPhoto.deleteMany({ where: { testResultId: { in: toDelete } } });
    const deleted = await db.testResult.deleteMany({ where: { id: { in: toDelete } } });

    return NextResponse.json({
      message: `Kustutati ${deleted.count} duplikaati`,
      deleted: deleted.count,
      keptIds: kept,
    });
  } catch (error) {
    console.error('POST /api/tests/[id]/deduplicate error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
