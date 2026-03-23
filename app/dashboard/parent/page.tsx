import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { isFeatureEnabled } from '@/lib/features';
import ConsentManagementCard from './ConsentManagementCard';

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function ParentDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { parentProfile: true } } },
  });

  if (!session || session.expiresAt < new Date()) redirect('/auth/login');
  if (!session.user.parentProfile) redirect('/dashboard');

  const dashboardParentEnabled = await isFeatureEnabled('DASHBOARD_PARENT');
  if (!dashboardParentEnabled) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2832' }}>Lapsevanema töölaud tulemas</h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>See funktsionaalsus pole veel sinu koolis aktiveeritud.</p>
      </div>
    );
  }

  const parentProfile = session.user.parentProfile;
  const user = session.user;

  // Load children with their shared results
  const parentWithChildren = await db.parentProfile.findUnique({
    where: { id: parentProfile.id },
    include: {
      children: {
        include: {
          student: {
            include: {
              user: { select: { id: true, name: true } },
              school: { select: { name: true } },
              testResults: {
                where: { status: 'SHARED' },
                orderBy: { sharedAt: 'desc' },
                select: {
                  id: true,
                  score: true,
                  maxScore: true,
                  sharedAt: true,
                },
              },
              consentGrants: {
                select: {
                  id: true,
                  status: true,
                  scope: true,
                  startDate: true,
                  endDate: true,
                  revokedAt: true,
                  subject: { select: { name: true } },
                },
                orderBy: { startDate: 'desc' },
              },
            },
          },
        },
      },
    },
  });

  const children = parentWithChildren?.children ?? [];

  // Build consent data per child for the ConsentManagementCard
  const childrenConsents = children.map(({ student }) => ({
    studentId: student.id,
    studentName: student.user.name ?? student.id,
    grants: student.consentGrants,
  }));

  const card = {
    background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)' as const,
    borderRadius: 8,
    padding: '20px 22px',
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/dashboard" style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}>
          ← Töölaud
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1C2832', marginTop: 8, marginBottom: 4 }}>
          Tere, {user.name}!
        </h1>
        <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.6 }}>Lapsevanema vaade</p>
      </div>

      {children.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '40px 24px' }}>
          <p style={{ fontSize: 15, color: '#1C2832', opacity: 0.5 }}>
            Ühtegi last pole teie kontoga seotud.
          </p>
          <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.4, marginTop: 8 }}>
            Palun võtke ühendust kooli administraatoriga.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {children.map(({ student }) => {
            const sharedResults = student.testResults;
            const totalShared = sharedResults.length;
            const latestDate = sharedResults[0]?.sharedAt ?? null;

            const withScores = sharedResults.filter(
              (r) => r.score != null && r.maxScore != null && r.maxScore > 0
            );
            const avgPct = withScores.length > 0
              ? Math.round(
                  withScores.reduce((sum, r) => sum + (r.score! / r.maxScore!) * 100, 0) /
                    withScores.length
                )
              : null;

            return (
              <div key={student.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C2832', margin: 0 }}>
                      {student.user.name}
                    </h2>
                    <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, marginTop: 4 }}>
                      {student.school?.name ?? 'Kool pole määratud'}
                      {student.classId && ` · ${student.classId}`}
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/parent/${student.id}`}
                    style={{
                      display: 'inline-block',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#F8F3DA',
                      textDecoration: 'none',
                      background: '#1C2832',
                      padding: '9px 18px',
                      borderRadius: 5,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    Vaata tulemusi →
                  </Link>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18 }}>
                  <div style={{ background: '#F8F3DA', borderRadius: 5, padding: '12px 14px' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#1C2832' }}>{totalShared}</div>
                    <div style={{ fontSize: 12, color: '#1C2832', opacity: 0.6, marginTop: 2 }}>
                      Jagatud tulemust
                    </div>
                  </div>
                  <div style={{ background: '#F8F3DA', borderRadius: 5, padding: '12px 14px' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#1C2832' }}>
                      {avgPct != null ? `${avgPct}%` : '—'}
                    </div>
                    <div style={{ fontSize: 12, color: '#1C2832', opacity: 0.6, marginTop: 2 }}>
                      Keskmine tulemus
                    </div>
                  </div>
                  <div style={{ background: '#F8F3DA', borderRadius: 5, padding: '12px 14px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1C2832' }}>
                      {latestDate ? formatDate(latestDate) : '—'}
                    </div>
                    <div style={{ fontSize: 12, color: '#1C2832', opacity: 0.6, marginTop: 2 }}>
                      Viimane tulemus
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GDPR consent management + data rights */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2832', marginBottom: 16 }}>
          Nõusolekud ja andmete haldus
        </h2>
        <ConsentManagementCard childrenConsents={childrenConsents} />
      </div>
    </div>
  );
}
