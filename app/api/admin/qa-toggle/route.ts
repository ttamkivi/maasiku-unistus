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

/** POST /api/admin/qa-toggle — enable or disable QA pass for a provider config */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Pole õigust' }, { status: 403 });

  const { configId, qaEnabled } = await req.json();
  if (!configId || typeof qaEnabled !== 'boolean') {
    return NextResponse.json({ error: 'configId ja qaEnabled on nõutud' }, { status: 400 });
  }

  // Verify the config belongs to the admin's school
  const config = await db.aIProviderConfig.findUnique({ where: { id: configId } });
  if (!config) return NextResponse.json({ error: 'Seadistust ei leitud' }, { status: 404 });
  if (admin.user.role !== 'SUPERADMIN' && config.schoolId !== admin.schoolId) {
    return NextResponse.json({ error: 'Pole õigust' }, { status: 403 });
  }

  await db.aIProviderConfig.update({
    where: { id: configId },
    data: { qaEnabled },
  });

  // Audit
  await db.auditLog.create({
    data: {
      userId: admin.user.id,
      action: qaEnabled ? 'QA_PASS_ENABLED' : 'QA_PASS_DISABLED',
      targetType: 'AIProviderConfig',
      targetId: configId,
      details: JSON.stringify({ schoolId: config.schoolId, qaEnabled }),
    },
  });

  return NextResponse.json({ ok: true, qaEnabled });
}
