import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { FeedbackData } from '@/lib/types';

function scoreColor(pct: number): string {
  if (pct >= 70) return '#16a34a';
  if (pct >= 50) return '#f97316';
  return '#dc2626';
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function parseFeedback(json: string | null | undefined): FeedbackData | null {
  if (!json) return null;
  try { return JSON.parse(json) as FeedbackData; } catch { return null; }
}

export default async function ParentChildResultsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { parentProfile: true } } },
  });

  if (!session || session.expiresAt < new Date()) redirect('/auth/login');
  if (!session.user.parentProfile) redirect('/dashboard');

  const parentProfile = session.user.parentProfile;

  // Verify that this parent is linked to this student
  const link = await db.parentStudentLink.findFirst({
    where: {
      parentId: parentProfile.id,
      studentId: studentId,
    },
  });

  if (!link) notFound();

  // Load student with shared results
  const student = await db.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { name: true } },
      school: { select: { name: true } },
      testResults: {
        where: { status: 'SHARED' },
        include: { test: { include: { subject: true } } },
        orderBy: { sharedAt: 'desc' },
      },
    },
  });

  if (!student) notFound();

  const sharedResults = student.testResults;

  // Stats
  const totalShared = sharedResults.length;
  const withScores = sharedResults.filter(
    (r) => r.score != null && r.maxScore != null && r.maxScore > 0
  );
  const avgPct = withScores.length > 0
    ? Math.round(withScores.reduce((sum, r) => sum + (r.score! / r.maxScore!) * 100, 0) / withScores.length)
    : null;
  const bestPct = withScores.length > 0
    ? Math.round(Math.max(...withScores.map((r) => (r.score! / r.maxScore!) * 100)))
    : null;

  // Progress by subject
  type SubjectGroup = { name: string; results: typeof sharedResults };
  const subjectMap = new Map<string, SubjectGroup>();
  for (const r of sharedResults) {
    const name = r.test.subject?.name ?? 'Muu';
    if (!subjectMap.has(name)) subjectMap.set(name, { name, results: [] });
    subjectMap.get(name)!.results.push(r);
  }
  const subjectGroups = Array.from(subjectMap.values());

  // Recommendations
  const allRecommendations: string[] = [];
  for (const r of sharedResults) {
    const fb = parseFeedback(r.editedFeedback ?? r.rawFeedback);
    if (fb?.soovitused) {
      for (const s of fb.soovitused) {
        const text = [s.title, s.text].filter(Boolean).join(' — ');
        if (text && !allRecommendations.includes(text)) {
          allRecommendations.push(text);
        }
        if (allRecommendations.length >= 5) break;
      }
    }
    if (allRecommendations.length >= 5) break;
  }

  const card = {
    background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)' as const,
    borderRadius: 8,
    padding: '20px 22px',
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/dashboard/parent" style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}>
          ← Minu lapsed
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginTop: 8, marginBottom: 2 }}>
          {student.user.name}
        </h1>
        <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.6 }}>
          {student.school?.name ?? 'Kool pole määratud'}
          {student.class && ` · ${student.class}`}
        </p>
      </div>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div style={{ ...card, borderTop: '3px solid #1C2832' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1C2832' }}>{totalShared}</div>
          <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.7, marginTop: 4 }}>Tagasisidet saadud</div>
        </div>
        <div style={{ ...card, borderTop: '3px solid #DAD0A1' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1C2832' }}>
            {avgPct != null ? `${avgPct}%` : '—'}
          </div>
          <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.7, marginTop: 4 }}>Keskmine tulemus</div>
        </div>
        <div style={{ ...card, borderTop: '3px solid #22c55e' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1C2832' }}>
            {bestPct != null ? `${bestPct}%` : '—'}
          </div>
          <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.7, marginTop: 4 }}>Parim tulemus</div>
        </div>
      </div>

      {/* Score history */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C2832', marginBottom: 16 }}>Tulemused</h2>
        {sharedResults.length === 0 ? (
          <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.5 }}>
            Tulemused puuduvad — õpetaja pole veel ühtegi tagasisidet jaganud.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sharedResults.map((r) => {
              const hasPct = r.score != null && r.maxScore != null && r.maxScore > 0;
              const pct = hasPct ? Math.round((r.score! / r.maxScore!) * 100) : null;
              const barColor = pct != null ? scoreColor(pct) : '#DAD0A1';
              return (
                <div
                  key={r.id}
                  style={{
                    background: '#F8F3DA',
                    borderRadius: 6,
                    padding: '14px 16px',
                    border: '1px solid #DAD0A1',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: hasPct ? 8 : 0 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1C2832' }}>{r.test.title}</div>
                      <div style={{ fontSize: 12, color: '#1C2832', opacity: 0.6, marginTop: 2 }}>
                        {r.test.subject?.name ?? 'Muu aine'}
                        {r.sharedAt && ` · Saadud ${formatDate(r.sharedAt)}`}
                      </div>
                    </div>
                    <span style={{
                      background: '#99f6e4',
                      color: '#0f766e',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 3,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      Jagatud
                    </span>
                  </div>
                  {hasPct && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1C2832' }}>
                          {r.score} / {r.maxScore} punkti
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{pct}%</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: '#DAD0A1' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4 }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Progress by subject */}
      {subjectGroups.length > 0 && (
        <div style={{ ...card, marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C2832', marginBottom: 16 }}>Edusammud aineti</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {subjectGroups.map((sg) => {
              const withSc = sg.results.filter(
                (r) => r.score != null && r.maxScore != null && r.maxScore > 0
              );
              const avg = withSc.length > 0
                ? withSc.reduce((sum, r) => sum + (r.score! / r.maxScore!) * 100, 0) / withSc.length
                : null;
              const avgRounded = avg != null ? Math.round(avg) : null;

              let trendArrow = '→';
              if (withSc.length >= 2 && avg != null) {
                const latestPct = (withSc[0].score! / withSc[0].maxScore!) * 100;
                if (latestPct > avg + 2) trendArrow = '↑';
                else if (latestPct < avg - 2) trendArrow = '↓';
              }

              const barColor = avgRounded != null ? scoreColor(avgRounded) : '#DAD0A1';

              return (
                <div key={sg.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>{sg.name}</span>
                      <span style={{ fontSize: 12, color: '#1C2832', opacity: 0.55, marginLeft: 8 }}>
                        {sg.results.length} {sg.results.length === 1 ? 'töö' : 'tööd'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {avgRounded != null && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{avgRounded}%</span>
                      )}
                      {withSc.length >= 2 && (
                        <span style={{
                          fontSize: 16,
                          color: trendArrow === '↑' ? '#16a34a' : trendArrow === '↓' ? '#dc2626' : '#6b7280',
                          fontWeight: 700,
                        }}>
                          {trendArrow}
                        </span>
                      )}
                    </div>
                  </div>
                  {avgRounded != null && (
                    <div style={{ height: 8, borderRadius: 4, background: '#DAD0A1' }}>
                      <div style={{ height: '100%', width: `${avgRounded}%`, background: barColor, borderRadius: 4 }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {allRecommendations.length > 0 && (
        <div style={card}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C2832', marginBottom: 14 }}>
            Soovitatavad harjutused
          </h2>
          <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allRecommendations.map((rec, i) => (
              <li key={i} style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.6 }}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
