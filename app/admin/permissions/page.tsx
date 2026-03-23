import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session;
}

function statusBadge(isEligible: boolean) {
  if (isEligible) {
    return (
      <span
        style={{
          background: '#dcfce7',
          color: '#166534',
          fontSize: 12,
          fontWeight: 600,
          padding: '3px 10px',
          borderRadius: 12,
        }}
      >
        ✓ Sobiv
      </span>
    );
  }
  return (
    <span
      style={{
        background: '#fee2e2',
        color: '#991b1b',
        fontSize: 12,
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: 12,
      }}
    >
      ✗ Ei sobi
    </span>
  );
}

export default async function PermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/auth/login');

  const user = session.user;
  const isSuperAdmin = user.role === 'SUPERADMIN';
  const isSchoolAdmin = user.role === 'SCHOOL_ADMIN';

  if (!isSuperAdmin && !isSchoolAdmin) {
    redirect('/dashboard');
  }

  const { filter } = await searchParams;

  // Build student query based on role
  let schoolIdFilter: string | undefined;

  if (isSchoolAdmin && !isSuperAdmin) {
    const adminProfile = await db.adminProfile.findUnique({
      where: { userId: user.id },
    });
    if (adminProfile?.schoolId) {
      schoolIdFilter = adminProfile.schoolId;
    }
  }

  const now = new Date();

  const students = await db.studentProfile.findMany({
    where: schoolIdFilter ? { schoolId: schoolIdFilter } : {},
    include: {
      user: { select: { id: true, name: true } },
      school: { select: { id: true, name: true } },
      class: { select: { name: true } },
      consentGrants: {
        where: {
          status: 'ACTIVE',
          OR: [
            { duration: 'INFINITE' },
            { duration: 'DATED', endDate: { gt: now } },
          ],
        },
      },
    },
    orderBy: { user: { name: 'asc' } },
  });

  // Apply UI filter
  const filteredStudents = students.filter((s) => {
    const isEligible = s.isEligible;
    const activeConsentsCount = s.consentGrants.length;

    if (!filter || filter === 'all') return true;
    if (filter === 'no-consent') return activeConsentsCount === 0;
    if (filter === 'eligible') return isEligible === true;
    if (filter === 'not-eligible') return isEligible === false;
    return true;
  });

  const tabs = [
    { key: 'all', label: 'Kõik' },
    { key: 'no-consent', label: 'Nõusolek puudub' },
    { key: 'eligible', label: 'Sobiv' },
    { key: 'not-eligible', label: 'Ei sobi' },
  ];

  const activeFilter = filter || 'all';

  return (
    <div>
      <div
        style={{
          background: '#fff',
          boxShadow: '0 2px 16px rgba(28,40,50,0.08)',
          padding: '36px 32px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Link
            href="/admin"
            style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}
          >
            ← Admin paneel
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginTop: 6, marginBottom: 4 }}>
            Õiguste haldus
          </h1>
          <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.6 }}>
            Nõusolekud ja sobivus
          </p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/admin/permissions?filter=${tab.key}`}
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '6px 14px',
                borderRadius: 20,
                textDecoration: 'none',
                background: activeFilter === tab.key ? '#1C2832' : '#F8F3DA',
                color: activeFilter === tab.key ? '#fff' : '#1C2832',
                border: '1.5px solid #DAD0A1',
              }}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Table */}
        {filteredStudents.length === 0 ? (
          <p style={{ color: '#1C2832', opacity: 0.5, fontSize: 14, padding: '24px 0' }}>
            Ühtegi õpilast ei leitud.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #DAD0A1' }}>
                  {['Nimi', 'Kool / klass', 'Aktiivsed nõusolekud', 'Sobivus', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        fontWeight: 700,
                        color: '#1C2832',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, i) => {
                  const isEligible = student.isEligible;
                  const activeCount = student.consentGrants.length;

                  return (
                    <tr
                      key={student.id}
                      style={{
                        borderBottom: '1px solid #F0EDD6',
                        background: i % 2 === 0 ? '#fff' : '#FDFAF0',
                      }}
                    >
                      <td style={{ padding: '12px 12px', color: '#1C2832', fontWeight: 600 }}>
                        {student.user.name}
                      </td>
                      <td style={{ padding: '12px 12px', color: '#1C2832', opacity: 0.8, fontSize: 13 }}>
                        {student.school?.name ?? '—'}
                        {student.class?.name ? ` · ${student.class.name}` : ''}
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <span
                          style={{
                            background: activeCount > 0 ? '#dcfce7' : '#fee2e2',
                            color: activeCount > 0 ? '#166534' : '#991b1b',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 12,
                          }}
                        >
                          {activeCount}
                        </span>
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        {statusBadge(isEligible)}
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <Link
                          href={`/admin/permissions/${student.id}`}
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#1C2832',
                            textDecoration: 'none',
                            background: '#F8F3DA',
                            border: '1.5px solid #DAD0A1',
                            padding: '5px 14px',
                            display: 'inline-block',
                          }}
                        >
                          Vaata
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
