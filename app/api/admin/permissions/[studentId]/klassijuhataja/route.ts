import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getAuthorizedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          adminProfile: true,
          klassijuhatajProfile: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = await getAuthorizedUser();
    if (!user) {
      return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });
    }

    const isSuperAdmin = user.isSuperAdmin && user.role === 'SUPERADMIN';
    const isSchoolAdmin = user.role === 'SCHOOL_ADMIN';

    if (!isSuperAdmin && !isSchoolAdmin) {
      return NextResponse.json({ error: 'Juurdepääs keelatud' }, { status: 403 });
    }

    const { studentId } = await params;
    const body = await request.json();
    const { klassijuhatajId } = body as { klassijuhatajId: string };

    if (!klassijuhatajId) {
      return NextResponse.json({ error: 'klassijuhatajId on kohustuslik' }, { status: 400 });
    }

    // Verify student exists
    const student = await db.studentProfile.findUnique({
      where: { id: studentId },
      include: { school: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Õpilast ei leitud' }, { status: 404 });
    }

    // For SCHOOL_ADMIN: verify student belongs to their school
    if (isSchoolAdmin && !isSuperAdmin) {
      const adminSchool = await db.school.findFirst({
        where: {
          klassijuhatajProfiles: {
            some: { userId: user.id },
          },
        },
      });
      // Try to find school via adminProfile relation — fall back to student school check
      if (student.schoolId) {
        const adminUser = await db.user.findUnique({
          where: { id: user.id },
          include: {
            klassijuhatajProfile: { include: { school: true } },
          },
        });
        const schoolAdmin = adminUser?.klassijuhatajProfile?.school;
        if (schoolAdmin && student.schoolId !== schoolAdmin.id) {
          return NextResponse.json({ error: 'Juurdepääs keelatud' }, { status: 403 });
        }
      }
      void adminSchool;
    }

    // Verify klassijuhataj exists
    const kjProfile = await db.klassijuhatajProfile.findUnique({
      where: { id: klassijuhatajId },
    });

    if (!kjProfile) {
      return NextResponse.json({ error: 'Klassijuhatajat ei leitud' }, { status: 404 });
    }

    // Upsert StudentKlassijuhataj
    await db.studentKlassijuhataj.upsert({
      where: { studentId },
      update: { klassijuhatajId, assignedAt: new Date() },
      create: { studentId, klassijuhatajId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH klassijuhataja error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
