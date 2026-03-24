import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getAuthorizedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
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

    const consents = await db.consentGrant.findMany({
      where: { studentId },
      include: {
        subject: { select: { id: true, name: true } },
        parent: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ consents });
  } catch (error) {
    console.error('GET consents error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
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
      include: {
        parents: {
          include: { parent: true },
          take: 1,
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Õpilast ei leitud' }, { status: 404 });
    }

    const body = await request.json();
    const {
      subjectId,
      scope,
      duration,
      startDate,
      endDate,
      note,
    } = body as {
      subjectId?: string;
      scope: 'ALL_SUBJECTS' | 'SPECIFIC_SUBJECT';
      duration: 'INFINITE' | 'DATED';
      startDate?: string;
      endDate?: string;
      note?: string;
    };

    if (!scope || !duration) {
      return NextResponse.json({ error: 'Ulatus ja kestus on kohustuslikud' }, { status: 400 });
    }

    if (duration === 'DATED' && !endDate) {
      return NextResponse.json({ error: 'Lõppkuupäev on tähtajalise nõusoleku puhul kohustuslik' }, { status: 400 });
    }

    // Find first linked parent profile
    let parentId: string | undefined;
    if (student.parents.length > 0) {
      parentId = student.parents[0].parent.id;
    }

    // We need a requestId — find or use a placeholder via a consent request for this student
    const existingRequest = await db.consentRequest.findFirst({
      where: { studentId },
      orderBy: { sentAt: 'desc' },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Nõusolekutaotlus puudub. Saatke esmalt lapsevanemale taotlus.' }, { status: 400 });
    }

    const consent = await db.consentGrant.create({
      data: {
        requestId: existingRequest.id,
        parentId: parentId ?? null,
        studentId,
        subjectId: subjectId ?? null,
        scope: scope as 'ALL_SUBJECTS' | 'SPECIFIC_SUBJECT',
        status: 'ACTIVE',
        duration: duration as 'INFINITE' | 'DATED',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        note: note ?? null,
      },
    });

    return NextResponse.json({ ok: true, consentId: consent.id }, { status: 201 });
  } catch (error) {
    console.error('POST consents error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
