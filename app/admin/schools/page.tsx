import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';

const TYPE_LABELS: Record<string, string> = {
  gümnaasium: 'Gümnaasium',
  põhikool: 'Põhikool',
  keskkool: 'Keskkool',
};

export default async function AdminSchoolsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;

  if (!token) {
    redirect('/auth/login');
  }

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !['ADMIN','SUPERADMIN','SCHOOL_ADMIN'].includes(session.user.role)) {
    redirect('/auth/login');
  }

  const schoolsRaw = await db.school.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { teacherSchools: true, studentProfiles: true },
      },
    },
  });
  type SchoolRow = (typeof schoolsRaw)[number];
  const schools: SchoolRow[] = schoolsRaw;

  return (
    <div>
      <div
        style={{
          background: '#fff',
          boxShadow: '0 2px 16px rgba(28,40,50,0.08)',
          borderRadius: 8,
          padding: '36px 32px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 28,
          }}
        >
          <div>
            <Link
              href="/admin"
              style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}
            >
              ← Admin paneel
            </Link>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginTop: 4 }}>
              Koolid
            </h1>
            <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, marginTop: 2 }}>
              Kokku {schools.length} kooli
            </p>
          </div>
          <Link
            href="/admin/schools/new"
            style={{
              background: '#1C2832',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              padding: '10px 20px',
              textDecoration: 'none',
              borderRadius: 6,
            }}
          >
            + Lisa kool
          </Link>
        </div>

        {/* School cards */}
        {schools.length === 0 ? (
          <p style={{ color: '#1C2832', opacity: 0.5, fontSize: 14, padding: '24px 0' }}>
            Koole ei leitud.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {schools.map((school) => (
              <div
                key={school.id}
                style={{
                  border: '1.5px solid #DAD0A1',
                  borderRadius: 8,
                  padding: '18px 20px',
                  background: '#FDFAF0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#1C2832',
                      marginBottom: 4,
                    }}
                  >
                    {school.name}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        background: '#1C283218',
                        color: '#1C2832',
                        padding: '2px 10px',
                        borderRadius: 10,
                        border: '1px solid #1C283230',
                      }}
                    >
                      {TYPE_LABELS[school.type] ?? school.type}
                    </span>
                    {school.district && (
                      <span style={{ fontSize: 13, color: '#1C2832', opacity: 0.6 }}>
                        {school.district}
                      </span>
                    )}
                    {school.city && (
                      <span style={{ fontSize: 13, color: '#1C2832', opacity: 0.6 }}>
                        {school.city}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 20,
                    fontSize: 13,
                    color: '#1C2832',
                    opacity: 0.7,
                    textAlign: 'center',
                    flexShrink: 0,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, opacity: 1 }}>
                      {school._count.teacherSchools}
                    </div>
                    <div>Õpetajat</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, opacity: 1 }}>
                      {school._count.studentProfiles}
                    </div>
                    <div>Õpilast</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
