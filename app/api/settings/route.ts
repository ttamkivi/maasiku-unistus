import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getAuthUser() {
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

/** GET /api/settings — load user profile + preferences */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Logi sisse' }, { status: 401 });

  // Read preferences via raw query (column may be newly added)
  const rows = await db.$queryRaw<{ preferences: string | null }[]>`
    SELECT preferences FROM "User" WHERE id = ${user.id}
  `;
  const rawPrefs = rows[0]?.preferences;

  let preferences = {};
  if (rawPrefs) {
    try { preferences = JSON.parse(rawPrefs); } catch { /* ignore */ }
  }

  return NextResponse.json({
    name: user.name,
    email: user.email,
    role: user.role,
    preferences,
  });
}

/** PUT /api/settings — save preferences */
export async function PUT(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Logi sisse' }, { status: 401 });

  const body = await req.json();
  const { preferences } = body;

  if (!preferences || typeof preferences !== 'object') {
    return NextResponse.json({ error: 'Vigased seaded' }, { status: 400 });
  }

  // Whitelist allowed keys to prevent storing arbitrary data
  const ALLOWED_KEYS = [
    'aiModel', 'language', 'feedbackTone', 'scoringStrictness',
    'autoAnalyze', 'showAiBadge', 'emailNotifications',
    'feedbackLanguage', 'maxPointsRounding',
    // Teaching profile: selected subjects & classes
    'activeSubjectIds', 'activeClassIds', 'activeGrades',
  ];

  const sanitized: Record<string, unknown> = {};
  for (const key of ALLOWED_KEYS) {
    if (key in preferences) {
      sanitized[key] = preferences[key];
    }
  }

  const prefsJson = JSON.stringify(sanitized);

  // Use raw query so it works whether or not Prisma client has been regenerated
  await db.$executeRaw`
    UPDATE "User" SET preferences = ${prefsJson}, "updatedAt" = ${new Date()} WHERE id = ${user.id}
  `;

  // Audit log
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'SETTINGS_UPDATED',
      targetType: 'User',
      targetId: user.id,
      details: JSON.stringify({ keys: Object.keys(sanitized) }),
    },
  });

  return NextResponse.json({ ok: true });
}
