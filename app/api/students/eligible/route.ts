import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('mu_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });
    }

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId') || undefined;
    const search = searchParams.get('search') || undefined;

    const now = new Date();

    // Find students with eligibility
    const eligibleStudents = await db.studentEligibility.findMany({
      where: { isEligible: true },
      include: {
        studentKlassijuhataj: {
          include: {
            student: {
              include: {
                user: { select: { id: true, name: true } },
                school: { select: { id: true, name: true } },
                subjectConsents: {
                  where: {
                    status: 'ACTIVE',
                    OR: [
                      { duration: 'INFINITE' },
                      { duration: 'DATED', endDate: { gt: now } },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    });

    const results = eligibleStudents
      .map((elig) => {
        const student = elig.studentKlassijuhataj.student;
        const user = student.user;

        // Filter by name search
        if (search && !user.name.toLowerCase().includes(search.toLowerCase())) {
          return null;
        }

        // Check active consents with subject filter
        const activeConsents = student.subjectConsents.filter((c) => {
          if (c.scope === 'ALL_SUBJECTS') return true;
          if (subjectId && c.subjectId === subjectId) return true;
          if (!subjectId && c.scope === 'SPECIFIC_SUBJECT') return true;
          return false;
        });

        if (activeConsents.length === 0) return null;

        const consentScope = activeConsents.some((c) => c.scope === 'ALL_SUBJECTS')
          ? 'ALL_SUBJECTS'
          : 'SPECIFIC_SUBJECT';

        return {
          id: student.id,
          userId: user.id,
          name: user.name,
          class: student.class,
          school: student.school?.name ?? null,
          consentScope,
        };
      })
      .filter(Boolean);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET /api/students/eligible error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
