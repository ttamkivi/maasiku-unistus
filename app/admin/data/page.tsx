import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';

export default async function AdminDataPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !['ADMIN', 'SUPERADMIN', 'SCHOOL_ADMIN'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const [userCount, schoolCount, testCount, resultCount] = await Promise.all([
    db.user.count(),
    db.school.count(),
    db.test.count(),
    db.testResult.count(),
  ]);

  const exports = [
    { label: 'Kasutajad', desc: 'Kõik kasutajakontod (ilma paroolideta)', count: userCount, href: '/api/admin/export/users', icon: '👤' },
    { label: 'Koolid', desc: 'Koolide nimekiri koos statistikaga', count: schoolCount, href: '/api/admin/export/schools', icon: '🏫' },
    { label: 'Kontrolltööd', desc: 'Kõik kontrolltööd ja tulemused', count: testCount, href: '/api/admin/export/tests', icon: '📝' },
    { label: 'Tulemused', desc: 'Kõik analüüsitud tulemused', count: resultCount, href: '/api/admin/export/results', icon: '📊' },
  ];

  return (
    <div>
      <div style={{ background: '#fff', boxShadow: '0 2px 16px rgba(28,40,50,0.08)', borderRadius: 8, padding: '36px 32px' }}>
        <Link href="/admin" style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}>
          ← Admin paneel
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginTop: 8, marginBottom: 4 }}>Andmehaldus</h1>
        <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, marginBottom: 32 }}>Halda ja ekspordi süsteemi andmeid</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
          {exports.map((e) => (
            <div key={e.label} style={{ border: '1.5px solid #DAD0A1', borderRadius: 8, padding: '20px', background: '#FDFAF0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{e.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#1C2832', fontSize: 15 }}>{e.label}</div>
                  <div style={{ fontSize: 12, color: '#1C2832', opacity: 0.6 }}>{e.count} kirjet</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 14 }}>{e.desc}</p>
              <a
                href={e.href}
                style={{
                  display: 'inline-block',
                  background: '#1C2832',
                  color: '#F8F3DA',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: 4,
                  textDecoration: 'none',
                }}
              >
                Ekspordi CSV
              </a>
            </div>
          ))}
        </div>

        <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, padding: '14px 16px', fontSize: 13, color: '#854d0e' }}>
          <strong>Andmete kustutamine</strong> — andmete kustutamine on pöördumatu toiming. Võta ühendust Superadminiga konkreetsete kustutamistaotluste jaoks.
        </div>
      </div>
    </div>
  );
}
