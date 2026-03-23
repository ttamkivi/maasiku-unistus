import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';

export default async function AdminTrainingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;

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

  const samples = await db.anonymizedTrainingData.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const totalSamples = samples.length;

  // Count by grade
  const byGrade: Record<string, number> = {};
  for (const s of samples) {
    const g = s.grade ?? 'Teadmata';
    byGrade[g] = (byGrade[g] ?? 0) + 1;
  }

  // Count by subject
  const bySubject: Record<string, number> = {};
  for (const s of samples) {
    const subj = s.subject ?? 'Teadmata';
    bySubject[subj] = (bySubject[subj] ?? 0) + 1;
  }

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
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <Link
              href="/admin"
              style={{ color: '#1C2832', fontSize: 13, textDecoration: 'none', fontWeight: 600, opacity: 0.6 }}
            >
              ← Admin paneel
            </Link>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginTop: 8, marginBottom: 0 }}>
              Treenimisandmete haldus
            </h1>
          </div>
          <a
            href="/api/admin/training/export"
            style={{
              background: '#1C2832',
              color: '#F8F3DA',
              fontWeight: 700,
              fontSize: 14,
              padding: '12px 22px',
              textDecoration: 'none',
              borderRadius: 6,
              display: 'inline-block',
            }}
          >
            Ekspordi JSON
          </a>
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          <div
            style={{
              background: '#fff',
              border: '1.5px solid #DAD0A1',
              borderRadius: 8,
              padding: '20px 24px',
            }}
          >
            <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, marginBottom: 6 }}>Kokku näidiseid</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#1C2832' }}>{totalSamples}</div>
          </div>

          <div
            style={{
              background: '#fff',
              border: '1.5px solid #DAD0A1',
              borderRadius: 8,
              padding: '20px 24px',
            }}
          >
            <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, marginBottom: 8 }}>Klassiti</div>
            {Object.entries(byGrade)
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(0, 5)
              .map(([grade, count]) => (
                <div key={grade} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{grade}</span>
                  <span style={{ opacity: 0.7 }}>{count}</span>
                </div>
              ))}
            {Object.keys(byGrade).length === 0 && (
              <div style={{ fontSize: 13, opacity: 0.5 }}>Andmed puuduvad</div>
            )}
          </div>

          <div
            style={{
              background: '#fff',
              border: '1.5px solid #DAD0A1',
              borderRadius: 8,
              padding: '20px 24px',
            }}
          >
            <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, marginBottom: 8 }}>Aineti</div>
            {Object.entries(bySubject)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([subject, count]) => (
                <div key={subject} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{subject}</span>
                  <span style={{ opacity: 0.7 }}>{count}</span>
                </div>
              ))}
            {Object.keys(bySubject).length === 0 && (
              <div style={{ fontSize: 13, opacity: 0.5 }}>Andmed puuduvad</div>
            )}
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            background: '#fff',
            border: '1.5px solid #DAD0A1',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #DAD0A1' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', margin: 0 }}>
              Anonüümistatud näidised ({totalSamples})
            </h2>
          </div>

          {samples.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#1C2832', opacity: 0.5, fontSize: 14 }}>
              Treenimisandmed puuduvad. Nõusolekud lisatakse automaatselt.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8F3DA' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#1C2832', borderBottom: '1px solid #DAD0A1' }}>Klass</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#1C2832', borderBottom: '1px solid #DAD0A1' }}>Aine</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#1C2832', borderBottom: '1px solid #DAD0A1' }}>Tulemus</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#1C2832', borderBottom: '1px solid #DAD0A1' }}>Tagasiside väljavõte</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#1C2832', borderBottom: '1px solid #DAD0A1' }}>Lisatud</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((sample, idx) => {
                    let excerpt = sample.feedback;
                    try {
                      const parsed = JSON.parse(sample.feedback);
                      // Try to get a meaningful text excerpt
                      if (parsed?.uldine_muster) {
                        excerpt = String(parsed.uldine_muster);
                      } else if (parsed?.test_info?.topic) {
                        excerpt = String(parsed.test_info.topic);
                      } else {
                        excerpt = sample.feedback;
                      }
                    } catch {
                      excerpt = sample.feedback;
                    }
                    const short = excerpt.length > 100 ? excerpt.slice(0, 100) + '…' : excerpt;
                    const isEven = idx % 2 === 0;

                    return (
                      <tr key={sample.id} style={{ background: isEven ? '#fff' : '#fdfaf0' }}>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #DAD0A1', color: '#1C2832', fontWeight: 600 }}>
                          {sample.grade ?? '—'}
                        </td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #DAD0A1', color: '#1C2832' }}>
                          {sample.subject ?? '—'}
                        </td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #DAD0A1', color: '#1C2832' }}>
                          {sample.score !== null && sample.maxScore !== null
                            ? `${sample.score}/${sample.maxScore}`
                            : '—'}
                        </td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #DAD0A1', color: '#1C2832', opacity: 0.75, maxWidth: 320 }}>
                          {short}
                        </td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #DAD0A1', color: '#1C2832', opacity: 0.6, whiteSpace: 'nowrap' }}>
                          {new Date(sample.createdAt).toLocaleDateString('et-EE')}
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
    </div>
  );
}
