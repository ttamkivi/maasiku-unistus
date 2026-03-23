import { cache } from 'react';
import { db } from './db';

export type FeatureKey =
  | 'LOGIN_SMART_ID'
  | 'LOGIN_ID_CARD'
  | 'LOGIN_MOBILE_ID'
  | 'STUDENT_EXERCISES'
  | 'ASSIGNMENTS_ENABLED'
  | 'EKOOL_API'
  | 'DASHBOARD_STUDENT'
  | 'DASHBOARD_TEACHER'
  | 'DASHBOARD_PARENT'
  | 'DASHBOARD_KLASSIJUHATAJA';

export const FEATURE_DEFAULTS: Record<FeatureKey, { description: string; enabled: boolean }> = {
  LOGIN_SMART_ID:           { description: 'Smart-ID sisselogimine',                 enabled: false },
  LOGIN_ID_CARD:            { description: 'ID-kaardi sisselogimine',                enabled: false },
  LOGIN_MOBILE_ID:          { description: 'Mobiil-ID sisselogimine',                enabled: false },
  STUDENT_EXERCISES:        { description: 'Õpilased saavad lahendada harjutusi',    enabled: false },
  ASSIGNMENTS_ENABLED:      { description: 'Kodutöö funktsioon',                     enabled: false },
  EKOOL_API:                { description: 'eKool API integratsioon',                enabled: false },
  DASHBOARD_STUDENT:        { description: 'Õpilase töölaud',                        enabled: true  },
  DASHBOARD_TEACHER:        { description: 'Õpetaja töölaud',                        enabled: true  },
  DASHBOARD_PARENT:         { description: 'Lapsevanema töölaud',                    enabled: true  },
  DASHBOARD_KLASSIJUHATAJA: { description: 'Klassijuhataja töölaud',                 enabled: true  },
};

// Ensure all known flags exist in the DB (create missing with defaults)
async function ensureFlags() {
  const existing = await db.featureFlag.findMany({ select: { key: true } });
  const existingKeys = new Set(existing.map((f) => f.key));
  const missing = (Object.entries(FEATURE_DEFAULTS) as [FeatureKey, { description: string; enabled: boolean }][])
    .filter(([k]) => !existingKeys.has(k));
  if (missing.length > 0) {
    await db.featureFlag.createMany({
      data: missing.map(([key, cfg]) => ({
        key,
        enabled: cfg.enabled,
        description: cfg.description,
      })),
    });
  }
}

// React cache — one DB read per server request
export const getFeatureFlags = cache(async (): Promise<Record<FeatureKey, boolean>> => {
  await ensureFlags();
  const rows = await db.featureFlag.findMany();
  // Start from defaults
  const result = Object.fromEntries(
    (Object.entries(FEATURE_DEFAULTS) as [FeatureKey, { enabled: boolean }][]).map(([k, v]) => [k, v.enabled])
  ) as Record<FeatureKey, boolean>;
  // Override with DB values
  for (const row of rows) {
    result[row.key as FeatureKey] = row.enabled;
  }
  return result;
});

export async function isFeatureEnabled(key: FeatureKey): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags[key] ?? false;
}
