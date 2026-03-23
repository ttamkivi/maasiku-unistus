import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getAuthorizedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;

  const { user } = session;
  const isSuperAdmin = user.role === 'SUPERADMIN';
  const isSchoolAdmin = user.role === 'SCHOOL_ADMIN';

  if (!isSuperAdmin && !isSchoolAdmin) return null;
  return user;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = await getAuthorizedUser();
    if (!user) {
      return NextResponse.json({ error: 'Juurdepääs keelatud' }, { status: 403 });
    }

    const { studentId } = await params;

    const student = await db.studentProfile.findUnique({
      where: { id: studentId },
      select: { isEligible: true },
    });

    if (!student) {
      return NextResponse.json({ eligibility: null, hasKlassijuhataja: false });
    }

    return NextResponse.json({
      eligibility: { isEligible: student.isEligible },
      hasKlassijuhataja: true,
    });
  } catch (error) {
    console.error('GET eligibility error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = await getAuthorizedUser();
    if (!user) {
      return NextResponse.json({ error: 'Juurdepääs keelatud' }, { status: 403 });
    }

    const { studentId } = await params;

    const body = await request.json();
    const { isEligible } = body as { isEligible: boolean; note?: string };

    if (typeof isEligible !== 'boolean') {
      return NextResponse.json({ error: 'isEligible on kohustuslik boolean' }, { status: 400 });
    }

    await db.studentProfile.update({
      where: { id: studentId },
      data: { isEligible },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'ELIGIBILITY_UPDATED',
        targetType: 'StudentProfile',
        targetId: studentId,
        details: JSON.stringify({ isEligible }),
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH eligibility error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
