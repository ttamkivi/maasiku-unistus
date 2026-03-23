import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;

  if (!token) {
    redirect('/auth/login');
  }

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  const adminRoles = ['ADMIN', 'SUPERADMIN', 'SCHOOL_ADMIN'];
  if (!session || session.expiresAt < new Date() || !adminRoles.includes(session.user.role)) {
    redirect('/dashboard');
  }

  const isSuperAdmin = session.user.role === 'SUPERADMIN';
  const isAdminLike = ['SUPERADMIN', 'SCHOOL_ADMIN'].includes(session.user.role);

  const cards = [
    { href: '/admin/users', label: 'Kasutajad', desc: 'Halda kasutajakontosid ja rolle', badge: null },
    { href: '/admin/schools', label: 'Koolid', desc: 'Halda koole ja nende andmeid', badge: null },
    { href: '/admin/audit', label: 'Audit logi', desc: 'Vaata süsteemi tegevuste logi', badge: null },
    { href: '/admin/data', label: 'Andmehaldus', desc: 'Halda ja ekspordi andmeid', badge: null },
    ...(isAdminLike
      ? [{
          href: '/admin/permissions',
          label: 'Õiguste haldus',
          desc: 'Lapsevanemad, nõusolekud ja sobivus',
          badge: null,
        }]
      : []),
    ...(isSuperAdmin
      ? [
          { href: '/admin/roles', label: 'Rollid & õigused', desc: 'Juurdepääsumaatriks — kes näeb ja teeb mida', badge: null },
          { href: '/admin/features', label: 'Funktsionaalsuse lipud', desc: 'Lülita funktsioone sisse/välja ilma koodimuutusteta', badge: null },
        ]
      : []),
  ];

  return (
    <div>
      <div
        style={{
          background: '#fff',
          boxShadow: '0 2px 16px rgba(28,40,50,0.08)',
          borderRadius: 8,
          padding: '36px 32px',
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1C2832', marginBottom: 4 }}>
          Admin paneel
        </h1>
        <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.6, marginBottom: 32 }}>
          Tere, {session.user.name}! Vali tegevus allpool.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
          }}
        >
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              style={{
                background: '#F8F3DA',
                border: '1.5px solid #DAD0A1',
                borderRadius: 8,
                padding: '24px 20px',
                textDecoration: 'none',
                display: 'block',
                transition: 'box-shadow 0.15s',
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#1C2832',
                  marginBottom: 6,
                }}
              >
                {card.label}
              </div>
              <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.65 }}>
                {card.desc}
              </div>
              {card.badge && (
                <div
                  style={{
                    marginTop: 10,
                    display: 'inline-block',
                    background: '#fef9c3',
                    border: '1px solid #fde047',
                    color: '#854d0e',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 12,
                  }}
                >
                  {card.badge}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
