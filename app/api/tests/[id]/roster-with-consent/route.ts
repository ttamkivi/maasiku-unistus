import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getTeacherSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.teacherProfile && session.user.role !== 'SUPERADMIN') return null;
  return session;
}

// GET /api/tests/[id]/roster-with-consent
// Returns student list with consent status for each student
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
      select: { classId: true, subjectId: true },
    });
    if (!test) return NextResponse.json({ error: 'Testi ei leitud' }, { status: 404 });

    if (!test.classId) {
      return NextResponse.json({ students: [], consentStats: { total: 0, withConsent: 0, withoutConsent: 0 } });
    }

    const students = await db.studentProfile.findMany({
      where: { classId: test.classId },
      include: {
        user: { select: { id: true, name: true } },
        consentGrants: {
          where: {
            status: 'ACTIVE',
            ...(test.subjectId ? {
              OR: [
                { scope: 'ALL_SUBJECTS' },
                { scope: 'SPECIFIC_SUBJECT', subjectId: test.subjectId },
              ],
            } : {}),
          },
          take: 1,
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    const result = students.map((s) => ({
      id: s.id,
      name: s.user.name,
      hasConsent: s.consentGrants.length > 0,
    }));

    const withConsent = result.filter(s => s.hasConsent).length;

    return NextResponse.json({
      students: result,
      consentStats: {
        total: result.length,
        withConsent,
        withoutConsent: result.length - withConsent,
      },
    });
  } catch (error) {
    console.error('GET /api/tests/[id]/roster-with-consent error:', error);
    return NextResponse.json({ error: 'Serveri viga' }, { status: 500 });
  }
}
