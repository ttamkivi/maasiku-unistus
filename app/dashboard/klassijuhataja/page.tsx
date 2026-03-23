import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { EligibilityToggle } from './EligibilityToggle';
import { isFeatureEnabled } from '@/lib/features';

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

export default async function KlassijuhatajaDashboardPage() {
  const session = await getSession();
  if (!session) redirect('/auth/login');

  const user = session.user;
  if (user.role !== 'KLASSIJUHATAJA') redirect('/dashboard');

  const dashboardKlassijuhatajEnabled = await isFeatureEnabled('DASHBOARD_KLASSIJUHATAJA');
  if (!dashboardKlassijuhatajEnabled) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2832' }}>Klassijuhataja töölaud tulemas</h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>See funktsionaalsus pole veel sinu koolis aktiveeritud.</p>
      </div>
    );
  }

  const kjProfile = await db.klassijuhatajProfile.findUnique({
    where: { userId: user.id },
    include: {
      school: { select: { id: true, name: true } },
      students: {
        include: {
          student: {
            include: {
              user: { select: { id: true, name: true } },
              school: { select: { id: true, name: true } },
              subjectConsents: {
                where: { status: 'ACTIVE' },
              },
            },
          },
          eligibility: true,
        },
        orderBy: { assignedAt: 'asc' },
      },
    },
  });

  if (!kjProfile) {
    return (
      <div
        style={{
          background: '#fff',
          boxShadow: '0 2px 16px rgba(28,40,50,0.08)',
          padding: '36px 32px',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 12 }}>
          Klassijuhataja töölaud
        </h1>
        <div
          style={{
            background: '#fef9c3',
            border: '1px solid #fde047',
            padding: '16px 20px',
            fontSize: 14,
            color: '#854d0e',
          }}
        >
          Teie klassijuhataja profiil pole veel seadistatud. Palun võtke ühendust administraatoriga.
        </div>
      </div>
    );
  }

  const students = kjProfile.students;
  const eligibleCount = students.filter((s) => s.eligibility?.isEligible === true).length;
  const totalCount = students.length;

  return (
    <div>
      <div
        style={{
          background: '#fff',
          boxShadow: '0 2px 16px rgba(28,40,50,0.08)',
          padding: '36px 32px',
          marginBottom: 20,
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Link
            href="/dashboard"
            style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}
          >
            ← Töölaud
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginTop: 6, marginBottom: 4 }}>
            Klassijuhataja töölaud
          </h1>
          {kjProfile.school && (
            <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.6 }}>
              {kjProfile.school.name}
            </p>
          )}
        </div>

        {/* Summary */}
        <div
          style={{
            background: '#F8F3DA',
            border: '1.5px solid #DAD0A1',
            padding: '16px 20px',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, marginBottom: 2 }}>
              Sobivate õpilaste kokkuvõte
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1C2832' }}>
              {eligibleCount} / {totalCount} õpilast on sobiv
            </div>
          </div>
          <Link
            href="/admin/permissions"
            style={{
              background: '#1C2832',
              color: '#F8F3DA',
              fontWeight: 700,
              fontSize: 13,
              padding: '9px 18px',
              textDecoration: 'none',
            }}
          >
            Kõik õigused →
          </Link>
        </div>

        {/* Student list */}
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', marginBottom: 16 }}>
          Minu õpilased
        </h2>

        {students.length === 0 ? (
          <p style={{ color: '#1C2832', opacity: 0.5, fontSize: 14 }}>
            Ühtegi õpilast pole teile veel määratud.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {students.map((rec) => {
              const student = rec.student;
              const isEligible = rec.eligibility?.isEligible ?? null;
              const activeConsentCount = student.subjectConsents.length;

              return (
                <div
                  key={student.id}
                  style={{
                    background: '#FDFAF0',
                    border: '1.5px solid #DAD0A1',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Student info */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1C2832', marginBottom: 2 }}>
                      {student.user.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#1C2832', opacity: 0.6 }}>
                      {student.school?.name ?? '—'}
                    </div>
                    <div style={{ fontSize: 12, color: '#1C2832', opacity: 0.5, marginTop: 4 }}>
                      {activeConsentCount > 0 ? (
                        <span style={{ color: '#166534' }}>{activeConsentCount} aktiivset nõusolekut</span>
                      ) : (
                        <span style={{ color: '#991b1b' }}>Nõusolek puudub</span>
                      )}
                    </div>
                  </div>

                  {/* Eligibility toggle */}
                  <EligibilityToggle
                    studentId={student.id}
                    initialEligible={isEligible}
                  />

                  {/* Detail link */}
                  <Link
                    href={`/admin/permissions/${student.id}`}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1C2832',
                      textDecoration: 'none',
                      background: '#fff',
                      border: '1.5px solid #DAD0A1',
                      padding: '6px 14px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Vaata täpsemalt
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
