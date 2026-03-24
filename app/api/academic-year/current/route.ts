import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { getCurrentAcademicYearLabel, getAcademicYearDates } from '@/lib/academic-year';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const label = getCurrentAcademicYearLabel();

    // Find or create the system-wide academic year
    let academicYear = await db.academicYear.findFirst({
      where: { label, schoolId: null },
    });

    if (!academicYear) {
      const { startDate, endDate } = getAcademicYearDates(label);
      // Deactivate any previously active year
      await db.academicYear.updateMany({
        where: { schoolId: null, isActive: true },
        data: { isActive: false },
      });
      academicYear = await db.academicYear.create({
        data: {
          label,
          startDate,
          endDate,
          isActive: true,
          schoolId: null,
        },
      });
    }

    return NextResponse.json(academicYear);
  } catch (error) {
    console.error('GET /api/academic-year/current error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
