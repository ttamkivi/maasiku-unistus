import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { FEATURE_DEFAULTS } from '@/lib/features';

async function getSuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.role !== 'SUPERADMIN') return null;
  return session.user;
}

// GET — return all flags with current values
export async function GET() {
  try {
    const user = await getSuperAdmin();
    if (!user) return NextResponse.json({ error: 'Juurdepääs keelatud' }, { status: 403 });

    // Ensure all flags exist
    const existing = await db.featureFlag.findMany();
    const existingKeys = new Set(existing.map((f) => f.key));
    const missing = Object.entries(FEATURE_DEFAULTS).filter(([k]) => !existingKeys.has(k));
    if (missing.length > 0) {
      await db.featureFlag.createMany({
        data: missing.map(([key, cfg]) => ({ key, enabled: cfg.enabled, description: cfg.description })),
      });
    }

    const flags = await db.featureFlag.findMany({ orderBy: { key: 'asc' } });
    return NextResponse.json({ flags });
  } catch (error) {
    console.error('GET /api/admin/features error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

// PATCH — toggle a single flag
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSuperAdmin();
    if (!user) return NextResponse.json({ error: 'Juurdepääs keelatud' }, { status: 403 });

    const { key, enabled } = await request.json() as { key: string; enabled: boolean };
    if (!key || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'key ja enabled on kohustuslikud' }, { status: 400 });
    }

    const flag = await db.featureFlag.upsert({
      where: { key },
      update: { enabled, updatedBy: user.id },
      create: {
        key,
        enabled,
        description: FEATURE_DEFAULTS[key as keyof typeof FEATURE_DEFAULTS]?.description ?? key,
        updatedBy: user.id,
      },
    });

    return NextResponse.json({ flag });
  } catch (error) {
    console.error('PATCH /api/admin/features error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
