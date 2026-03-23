import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import WithdrawButton from './WithdrawButton';

export default async function TeacherTrainingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;

  if (!token) {
    redirect('/auth/login');
  }

  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          teacherProfile: {
            include: {
              tests: {
                include: {
                  subject: true,
                  results: {
                    include: {
                      trainingConsent: {
                        include: {
                          anonymizedData: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    redirect('/auth/login');
  }

  const user = session.user;

  if (user.role !== 'TEACHER') {
    redirect('/dashboard');
  }

  type ContributedResult = {
    resultId: string;
    testId: string;
    testTitle: string;
    grade: string | null;
    subject: string | null;
    score: number | null;
    maxScore: number | null;
    createdAt: Date;
    hasAnonymizedData: boolean;
  };

  const contributed: ContributedResult[] = [];

  if (user.teacherProfile) {
    for (const test of user.teacherProfile.tests) {
      for (const result of test.results) {
        if (result.trainingConsent) {
          contributed.push({
            resultId: result.id,
            testId: test.id,
            testTitle: test.title,
            grade: test.grade ?? null,
            subject: test.subject?.name ?? null,
            score: result.score ?? null,
            maxScore: result.maxScore ?? null,
            createdAt: result.createdAt,
            hasAnonymizedData: !!result.trainingConsent.anonymizedData,
          });
        }
      }
    }
  }

  const activeContributions = contributed.filter((c) => c.hasAnonymizedData);

  return (
    <div
      style={{
        fontFamily: "'Open Sans', sans-serif",
        background: '#F8F3DA',
        minHeight: '100vh',
        padding: '32px 24px',
        color: '#1C2832',
      }}
    >
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Link
            href="/dashboard"
            style={{ color: '#1C2832', fontSize: 13, textDecoration: 'none', fontWeight: 600, opacity: 0.6 }}
          >
            ← Tagasi töölaudu
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginTop: 8, marginBottom: 4 }}>
            Minu panus treenimisandmetesse
          </h1>
          <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.7, margin: 0 }}>
            {activeContributions.length} aktiivset panust
          </p>
        </div>

        {/* Explanation box */}
        <div
          style={{
            background: '#fff',
            border: '1.5px solid #DAD0A1',
            borderRadius: 8,
            padding: '20px 24px',
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
            Miks see oluline on?
          </div>
          <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.8, margin: 0, lineHeight: 1.6 }}>
            Sinu panus aitab parandada AI tagasiside kvaliteeti kõigi õpilaste jaoks. Kõik jagatud
            andmed on täielikult anonüümistatud — õpilase nimi ja kooli andmed on eemaldatud enne
            salvestamist. Saad oma nõusoleku igal ajal tühistada.
          </p>
        </div>

        {/* Contributions list */}
        <div
          style={{
            background: '#fff',
            border: '1.5px solid #DAD0A1',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #DAD0A1' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1C2832', margin: 0 }}>
              Jagatud tulemused ({activeContributions.length})
            </h2>
          </div>

          {contributed.length === 0 ? (
            <div
              style={{ padding: '40px 20px', textAlign: 'center', color: '#1C2832', opacity: 0.5, fontSize: 14 }}
            >
              Sa ei ole veel ühtegi tulemust treenimisandmetega jaganud.
            </div>
          ) : (
            <div>
              {contributed.map((item, idx) => {
                const isEven = idx % 2 === 0;
                const dateStr = new Date(item.createdAt).toLocaleDateString('et-EE');
                const scoreStr =
                  item.score !== null && item.maxScore !== null
                    ? `${item.score}/${item.maxScore}`
                    : '—';

                return (
                  <div
                    key={item.resultId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 20px',
                      background: isEven ? '#fff' : '#fdfaf0',
                      borderBottom: idx < contributed.length - 1 ? '1px solid #DAD0A1' : 'none',
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1C2832', marginBottom: 2 }}>
                        {item.testTitle}
                      </div>
                      <div style={{ fontSize: 12, color: '#1C2832', opacity: 0.65 }}>
                        {[item.grade, item.subject, `Tulemus: ${scoreStr}`, dateStr]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                      {!item.hasAnonymizedData && (
                        <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>
                          Nõusolek antud, andmed kustutatud
                        </div>
                      )}
                    </div>

                    {item.hasAnonymizedData && (
                      <WithdrawButton resultId={item.resultId} testId={item.testId} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
