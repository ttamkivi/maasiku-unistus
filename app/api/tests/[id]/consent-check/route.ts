import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { ConsentCheckActionSchema, parseBody } from '@/lib/validation';

async function getTeacherSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.teacherProfile && session.user.role !== 'SUPERADMIN') return null;
  return session;
}

// POST /api/tests/[id]/consent-check
// body: { action: 'merge' | 'delete_without_consent', consentedNames: string[] }
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

    const test = await db.test.findFirst({
      where: { id, deletedAt: null },
    });
    if (!test) return NextResponse.json({ error: 'Testi ei leitud' }, { status: 404 });

    const raw = await request.json();
    const parsed = parseBody(ConsentCheckActionSchema, raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const body = parsed.data;

    const allResults = await db.testResult.findMany({
      where: { testId: id },
      include: { photos: { select: { id: true, base64Data: true } } },
      orderBy: { createdAt: 'asc' },
    });

    if (body.action === 'merge') {
      // Group results by normalized name
      const groups = new Map<string, typeof allResults>();
      for (const r of allResults) {
        const key = (r.studentName ?? '').trim().toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
      }

      let merged = 0;
      for (const [, group] of groups) {
        if (group.length <= 1) continue;
        const [keep, ...extras] = group;
        // Move all photos from extras to the kept result
        for (const extra of extras) {
          for (const photo of extra.photos) {
            await db.workPhoto.update({
              where: { id: photo.id },
              data: { testResultId: keep.id },
            });
          }
          await db.testResult.delete({ where: { id: extra.id } });
        }
        merged += extras.length;
      }

      return NextResponse.json({ merged });
    }

    if (body.action === 'delete_without_consent') {
      const consentedNames = new Set(
        (body.consentedNames ?? []).map((n) => n.trim().toLowerCase())
      );
      const toDelete = allResults.filter(
        (r) => !consentedNames.has((r.studentName ?? '').trim().toLowerCase())
      );
      for (const r of toDelete) {
        await db.testResult.delete({ where: { id: r.id } });
      }
      return NextResponse.json({ deleted: toDelete.length });
    }

    return NextResponse.json({ error: 'Tundmatu toiming' }, { status: 400 });
  } catch (error) {
    console.error('consent-check POST error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
