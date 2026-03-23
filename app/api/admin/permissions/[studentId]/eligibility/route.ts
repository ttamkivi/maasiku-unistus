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
        include: { klassijuhatajProfile: true },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) return null;

  const { user } = session;
  const isSuperAdmin = user.isSuperAdmin && user.role === 'SUPERADMIN';
  const isSchoolAdmin = user.role === 'SCHOOL_ADMIN';
  const isKlassijuhataja = user.role === 'KLASSIJUHATAJA';

  if (!isSuperAdmin && !isSchoolAdmin && !isKlassijuhataja) return null;
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

    const kjRecord = await db.studentKlassijuhataj.findUnique({
      where: { studentId },
      include: { eligibility: true },
    });

    if (!kjRecord) {
      return NextResponse.json({ eligibility: null, hasKlassijuhataja: false });
    }

    return NextResponse.json({
      eligibility: kjRecord.eligibility,
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

    // For KLASSIJUHATAJA: verify they are assigned to this student
    if (user.role === 'KLASSIJUHATAJA') {
      const kjProfile = await db.klassijuhatajProfile.findUnique({ where: { userId: user.id } });
      if (!kjProfile) {
        return NextResponse.json({ error: 'Klassijuhataja profiil puudub' }, { status: 403 });
      }
      const kjRecord = await db.studentKlassijuhataj.findUnique({ where: { studentId } });
      if (!kjRecord || kjRecord.klassijuhatajId !== kjProfile.id) {
        return NextResponse.json({ error: 'See õpilane ei kuulu teie klassi' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { isEligible, note } = body as { isEligible: boolean; note?: string };

    if (typeof isEligible !== 'boolean') {
      return NextResponse.json({ error: 'isEligible on kohustuslik boolean' }, { status: 400 });
    }

    // Find the StudentKlassijuhataj record
    const kjRecord = await db.studentKlassijuhataj.findUnique({ where: { studentId } });
    if (!kjRecord) {
      return NextResponse.json({ error: 'Õpilasele pole klassijuhatajat määratud' }, { status: 400 });
    }

    // Upsert eligibility using the unique field studentKlassijuhatajId
    await db.studentEligibility.upsert({
      where: { studentKlassijuhatajId: studentId },
      update: { isEligible, note: note || null },
      create: {
        studentKlassijuhatajId: studentId,
        isEligible,
        note: note || null,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'ELIGIBILITY_UPDATED',
        targetType: 'StudentProfile',
        targetId: studentId,
        details: JSON.stringify({ isEligible, note }),
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
