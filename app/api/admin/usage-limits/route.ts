import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { adminProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!['SUPERADMIN', 'SCHOOL_ADMIN'].includes(session.user.role)) return null;
  return { user: session.user, schoolId: session.user.adminProfile?.schoolId || null };
}

/** GET /api/admin/usage-limits — list all limits + teachers for the school */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Pole õigust' }, { status: 403 });

  const schoolId = admin.schoolId;
  if (!schoolId && admin.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Kool puudub' }, { status: 400 });
  }

  const schoolFilter = admin.user.role === 'SUPERADMIN' ? {} : { schoolId: schoolId! };

  const [limits, teachers, monthUsage] = await Promise.all([
    db.teacherUsageLimit.findMany({
      where: schoolFilter,
      include: {
        teacher: { include: { user: { select: { name: true, email: true } } } },
        school: { select: { name: true } },
      },
      orderBy: { teacherProfileId: 'asc' },
    }),
    // Get all teachers in the school for the dropdown
    schoolId
      ? db.teacherSchool.findMany({
          where: { schoolId },
          include: { teacher: { include: { user: { select: { id: true, name: true, email: true } } } } },
        })
      : Promise.resolve([]),
    // Current month usage per teacher
    (async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      if (!schoolId) return [];

      const logs = await db.aIUsageLog.groupBy({
        by: ['teacherProfileId'],
        where: { schoolId: schoolId!, createdAt: { gte: monthStart } },
        _sum: { inputTokens: true, outputTokens: true },
        _count: true,
      });
      return logs.map((l: Record<string, unknown>) => ({
        teacherProfileId: l.teacherProfileId,
        totalTokens: ((l._sum as Record<string, number>)?.inputTokens || 0) + ((l._sum as Record<string, number>)?.outputTokens || 0),
        requestCount: l._count,
      }));
    })(),
  ]);

  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    limits: limits.map((l: any) => ({
      ...l,
      teacherName: l.teacher?.user.name || null,
      teacherEmail: l.teacher?.user.email || null,
      schoolName: l.school.name,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    teachers: teachers.map((t: any) => ({
      teacherProfileId: t.teacher.id,
      name: t.teacher.user.name,
      email: t.teacher.user.email,
    })),
    monthUsage,
  });
}

/** POST /api/admin/usage-limits — create or update a usage limit */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Pole õigust' }, { status: 403 });

  const body = await req.json();
  const {
    schoolId: bodySchoolId,
    teacherProfileId,
    monthlyTokenLimit,
    monthlyRequestLimit,
  } = body;

  const targetSchoolId = admin.user.role === 'SUPERADMIN' ? bodySchoolId : admin.schoolId;
  if (!targetSchoolId) return NextResponse.json({ error: 'Kooli ID puudub' }, { status: 400 });

  const tokenLimit = Math.max(0, Math.min(10000000, Number(monthlyTokenLimit) || 500000));
  const requestLimit = Math.max(0, Math.min(10000, Number(monthlyRequestLimit) || 200));

  const limit = await db.teacherUsageLimit.upsert({
    where: {
      schoolId_teacherProfileId: {
        schoolId: targetSchoolId,
        teacherProfileId: teacherProfileId || null,
      },
    },
    create: {
      schoolId: targetSchoolId,
      teacherProfileId: teacherProfileId || null,
      monthlyTokenLimit: tokenLimit,
      monthlyRequestLimit: requestLimit,
      isActive: true,
    },
    update: {
      monthlyTokenLimit: tokenLimit,
      monthlyRequestLimit: requestLimit,
      isActive: true,
    },
  });

  await db.auditLog.create({
    data: {
      userId: admin.user.id,
      action: 'USAGE_LIMIT_SET',
      targetType: 'TeacherUsageLimit',
      targetId: limit.id,
      details: JSON.stringify({ teacherProfileId, tokenLimit, requestLimit }),
    },
  });

  return NextResponse.json({ ok: true, id: limit.id });
}

/** DELETE /api/admin/usage-limits — remove a limit */
export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Pole õigust' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID puudub' }, { status: 400 });

  await db.teacherUsageLimit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
