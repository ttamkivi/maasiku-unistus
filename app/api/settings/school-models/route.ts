import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { AI_PROVIDERS } from '@/lib/ai-provider';

/**
 * GET /api/settings/school-models
 * Returns which AI models are available for the current teacher's school,
 * plus their current month usage.
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return NextResponse.json({ error: 'Logi sisse' }, { status: 401 });

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Sessioon aegunud' }, { status: 401 });
  }

  const teacherProfile = session.user.teacherProfile;
  if (!teacherProfile) {
    // Not a teacher — return default catalogue
    return NextResponse.json({
      schoolProviders: [],
      defaultModel: 'claude-sonnet-4-6',
      usage: null,
      catalogue: AI_PROVIDERS,
    });
  }

  // Find teacher's school
  const teacherSchool = await db.teacherSchool.findFirst({
    where: { teacherId: teacherProfile.id },
    include: { school: { select: { name: true } } },
  });

  if (!teacherSchool) {
    return NextResponse.json({
      schoolProviders: [],
      schoolName: null,
      defaultModel: 'claude-sonnet-4-6',
      usage: null,
      catalogue: AI_PROVIDERS,
    });
  }

  // Get school's configured providers
  const configs = await db.aIProviderConfig.findMany({
    where: { schoolId: teacherSchool.schoolId, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { provider: 'asc' }],
  });

  // Get usage this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [usageAgg, limit] = await Promise.all([
    db.aIUsageLog.aggregate({
      where: {
        schoolId: teacherSchool.schoolId,
        teacherProfileId: teacherProfile.id,
        createdAt: { gte: monthStart },
      },
      _sum: { inputTokens: true, outputTokens: true },
      _count: true,
    }),
    db.teacherUsageLimit.findFirst({
      where: {
        schoolId: teacherSchool.schoolId,
        isActive: true,
        OR: [
          { teacherProfileId: teacherProfile.id },
          { teacherProfileId: null },
        ],
      },
      orderBy: { teacherProfileId: 'desc' },
    }),
  ]);

  const totalTokens = (usageAgg._sum.inputTokens || 0) + (usageAgg._sum.outputTokens || 0);

  // Build available models list
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schoolProviders = configs.map((c: any) => ({
    provider: c.provider,
    displayName: c.displayName,
    defaultModel: c.defaultModel,
    allowedModels: JSON.parse(c.allowedModels || '[]') as string[],
    isDefault: c.isDefault,
  }));

  // Determine default model
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultConfig = configs.find((c: any) => c.isDefault) || configs[0];
  const defaultModel = defaultConfig?.defaultModel || 'claude-sonnet-4-6';

  return NextResponse.json({
    schoolProviders,
    schoolName: teacherSchool.school.name,
    defaultModel,
    usage: {
      tokensUsed: totalTokens,
      requestsUsed: usageAgg._count || 0,
      tokenLimit: limit?.monthlyTokenLimit || null,
      requestLimit: limit?.monthlyRequestLimit || null,
    },
    catalogue: AI_PROVIDERS,
  });
}
