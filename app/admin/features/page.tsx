import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { FEATURE_DEFAULTS } from '@/lib/features';
import FeatureFlagsClient from './FeatureFlagsClient';

export default async function FeaturesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || session.user.role !== 'SUPERADMIN') {
    redirect('/admin');
  }

  // Ensure all flags exist
  const existing = await db.featureFlag.findMany({ orderBy: { key: 'asc' } });
  const existingKeys = new Set(existing.map((f) => f.key));
  const missing = Object.entries(FEATURE_DEFAULTS).filter(([k]) => !existingKeys.has(k));
  if (missing.length > 0) {
    await db.featureFlag.createMany({
      data: missing.map(([key, cfg]) => ({ key, enabled: cfg.enabled, description: cfg.description })),
    });
  }

  const flags = await db.featureFlag.findMany({ orderBy: { key: 'asc' } });

  return (
    <div>
      <div style={{ background: '#fff', boxShadow: '0 2px 16px rgba(28,40,50,0.08)', borderRadius: 8, padding: '36px 32px' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/admin" style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}>
            ← Admin paneel
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginTop: 4 }}>Funktsionaalsuse lipud</h1>
          <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, marginTop: 2 }}>
            Lülita funktsioone sisse/välja ilma koodimuutusteta. Ainult superadmin näeb ja saab muuta.
          </p>
        </div>
        <FeatureFlagsClient initialFlags={flags} />
      </div>
    </div>
  );
}
