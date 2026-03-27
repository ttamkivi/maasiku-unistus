import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { encryptApiKey, AI_PROVIDERS } from '@/lib/ai-provider';

async function getAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { adminProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const user = session.user;
  if (!['SUPERADMIN', 'SCHOOL_ADMIN'].includes(user.role)) return null;

  return { user, schoolId: user.adminProfile?.schoolId || null };
}

/** GET /api/admin/ai-providers — list configured providers for the admin's school */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Pole õigust' }, { status: 403 });

  // SUPERADMIN sees all schools' providers; SCHOOL_ADMIN sees only their own
  const where = admin.user.role === 'SUPERADMIN' ? {} : { schoolId: admin.schoolId || 'none' };

  const configs = await db.aIProviderConfig.findMany({
    where,
    orderBy: [{ isDefault: 'desc' }, { provider: 'asc' }],
    include: { school: { select: { id: true, name: true } } },
  });

  // Mask API keys — never send raw to frontend
  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    providers: configs.map((c: any) => ({
      ...c,
      apiKeyEncrypted: undefined,
      apiKeyMasked: c.apiKeyEncrypted ? '••••••••' : '',
      allowedModels: JSON.parse(String(c.allowedModels || '[]')),
    })),
    catalogue: AI_PROVIDERS,
  });
}

/** POST /api/admin/ai-providers — add or update a provider config */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Pole õigust' }, { status: 403 });

  const body = await req.json();
  const { schoolId, provider, apiKey, defaultModel, allowedModels, isDefault } = body;

  // Validate
  const targetSchoolId = admin.user.role === 'SUPERADMIN' ? schoolId : admin.schoolId;
  if (!targetSchoolId) return NextResponse.json({ error: 'Kooli ID puudub' }, { status: 400 });
  if (!provider || !['anthropic', 'openai', 'google'].includes(provider)) {
    return NextResponse.json({ error: 'Vale pakkuja' }, { status: 400 });
  }
  if (!apiKey || apiKey.length < 10) {
    return NextResponse.json({ error: 'API võti on liiga lühike' }, { status: 400 });
  }

  const providerInfo = AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS];
  if (!providerInfo) return NextResponse.json({ error: 'Tundmatu pakkuja' }, { status: 400 });

  const validModelIds = providerInfo.models.map(m => m.id as string);
  const model = validModelIds.includes(defaultModel) ? defaultModel : providerInfo.models[0].id;
  const models = (allowedModels || validModelIds).filter((m: string) => validModelIds.includes(m));

  // If setting as default, unset other defaults for this school
  if (isDefault) {
    await db.aIProviderConfig.updateMany({
      where: { schoolId: targetSchoolId, isDefault: true },
      data: { isDefault: false },
    });
  }

  // Upsert
  const config = await db.aIProviderConfig.upsert({
    where: { schoolId_provider: { schoolId: targetSchoolId, provider } },
    create: {
      schoolId: targetSchoolId,
      provider,
      displayName: providerInfo.name,
      apiKeyEncrypted: encryptApiKey(apiKey),
      defaultModel: model,
      allowedModels: JSON.stringify(models),
      isActive: true,
      isDefault: isDefault || false,
    },
    update: {
      apiKeyEncrypted: encryptApiKey(apiKey),
      defaultModel: model,
      allowedModels: JSON.stringify(models),
      isActive: true,
      isDefault: isDefault || false,
    },
  });

  // Audit
  await db.auditLog.create({
    data: {
      userId: admin.user.id,
      action: 'AI_PROVIDER_CONFIGURED',
      targetType: 'AIProviderConfig',
      targetId: config.id,
      details: JSON.stringify({ provider, model, schoolId: targetSchoolId }),
    },
  });

  return NextResponse.json({ ok: true, id: config.id });
}

/** DELETE /api/admin/ai-providers — deactivate a provider */
export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Pole õigust' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID puudub' }, { status: 400 });

  // Verify the config belongs to the admin's school (IDOR protection)
  const config = await db.aIProviderConfig.findUnique({ where: { id } });
  if (!config) return NextResponse.json({ error: 'Seadistust ei leitud' }, { status: 404 });
  if (admin.user.role !== 'SUPERADMIN' && config.schoolId !== admin.schoolId) {
    return NextResponse.json({ error: 'Pole õigust' }, { status: 403 });
  }

  await db.aIProviderConfig.update({
    where: { id },
    data: { isActive: false, isDefault: false },
  });

  return NextResponse.json({ ok: true });
}
