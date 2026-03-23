import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { FeedbackData } from '@/lib/types';
import { isFeatureEnabled } from '@/lib/features';
import DataRightsCard from './DataRightsCard';

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

export default async function StudentDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { studentProfile: true } } },
  });

  if (!session || session.expiresAt < new Date()) redirect('/auth/login');

  const user = session.user;
  const isPreview = user.role === 'SUPERADMIN' && !!cookieStore.get('mu_preview_role')?.value;

  if (!user.studentProfile && !isPreview) redirect('/dashboard');

  const [dashboardStudentEnabled, exercisesEnabled, assignmentsEnabled] = await Promise.all([
    isFeatureEnabled('DASHBOARD_STUDENT'),
    isFeatureEnabled('STUDENT_EXERCISES'),
    isFeatureEnabled('ASSIGNMENTS_ENABLED'),
  ]);
  if (!dashboardStudentEnabled && !isPreview) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2832' }}>Õpilase töölaud tulemas</h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>See funktsionaalsus pole veel sinu koolis aktiveeritud.</p>
      </div>
    );
  }

  const [sharedResults, recentExercises] = await Promise.all([
    user.studentProfile
      ? db.testResult.findMany({
          where: { studentId: user.studentProfile.id, status: 'SHARED' },
          include: { test: { include: { subject: true } } },
          orderBy: { sharedAt: 'desc' },
        })
      : Promise.resolve([] as Awaited<ReturnType<typeof db.testResult.findMany<{ include: { test: { include: { subject: true } } } }>>>),
    user.studentProfile
      ? db.exercise.findMany({
          where: { studentId: user.studentProfile.id, status: { not: 'ARCHIVED' } },
          include: { subject: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : Promise.resolve([] as Awaited<ReturnType<typeof db.exercise.findMany<{ include: { subject: true } }>>>),
  ]);

  // Top stats
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
  type SubjectGroup = {
    name: string;
    results: typeof sharedResults;
  };
  const subjectMap = new Map<string, SubjectGroup>();
  for (const r of sharedResults) {
    const name = r.test.subject?.name ?? 'Muu';
    if (!subjectMap.has(name)) subjectMap.set(name, { name, results: [] });
    subjectMap.get(name)!.results.push(r);
  }
  const subjectGroups = Array.from(subjectMap.values());

  // "Mida harjutada" — collect unique recommendations from feedback JSON
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
      {isPreview && (
        <div style={{ background: '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 600, padding: '10px 16px', borderRadius: 6, marginBottom: 20 }}>
          👁 Eelvaade — näed tühja õpilase vaadet. Pärisandmed pole saadaval, kuna oled SUPERADMIN.
        </div>
      )}
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/dashboard" style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}>
          ← Töölaud
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1C2832', marginTop: 8, marginBottom: 4 }}>
          Tere, {user.name}!
        </h1>
        <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.6 }}>Minu tagasiside</p>
      </div>

      {/* Quick actions — only shown when features are enabled */}
      {(exercisesEnabled || assignmentsEnabled) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {exercisesEnabled && (
            <Link href="/dashboard/exercises/new" style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#1C2832',
                color: '#F8F3DA',
                borderRadius: 8,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                minHeight: 72,
              }}>
                <div style={{ fontSize: 22 }}>📓</div>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>Pildista harjutused</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Saa kohene tagasiside</div>
              </div>
            </Link>
          )}
          {assignmentsEnabled && (
            <Link href="/dashboard/assignments" style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#F8F3DA',
                border: '2px solid #DAD0A1',
                color: '#1C2832',
                borderRadius: 8,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                minHeight: 72,
              }}>
                <div style={{ fontSize: 22 }}>📚</div>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>Kodutööd</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>Õpetaja ülesanded</div>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Recent exercises */}
      {exercisesEnabled && recentExercises.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C2832' }}>Minu harjutused</h2>
            <Link href="/dashboard/exercises" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
              Kõik →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentExercises.map((ex) => {
              const isAnalyzing = ex.status === 'ANALYZING';
              const isError = ex.status === 'FEEDBACK_READY' && typeof ex.rawFeedback === 'string' &&
                ex.rawFeedback.includes('"Analüüsimisel tekkis viga');
              return (
                <Link key={ex.id} href={`/dashboard/exercises/${ex.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 6,
                    background: isError ? '#fee2e2' : '#F8F3DA',
                    border: `1px solid ${isError ? '#fca5a5' : '#DAD0A1'}`,
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>📓</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2832', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ex.topic}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
                        {ex.subject?.name ?? 'Harjutus'} · {formatDate(ex.createdAt)}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, flexShrink: 0,
                      background: isError ? '#fca5a5' : isAnalyzing ? '#fef9c3' : '#bbf7d0',
                      color: isError ? '#7f1d1d' : isAnalyzing ? '#854d0e' : '#15803d',
                    }}>
                      {isError ? 'Viga' : isAnalyzing ? 'Analüüsimisel…' : 'Valmis'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Top stats row */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        <div style={{ ...card, borderTop: '3px solid #1C2832' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1C2832' }}>{totalShared}</div>
          <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.7, marginTop: 4 }}>Tagasisidet</div>
        </div>
        <div style={{ ...card, borderTop: '3px solid #DAD0A1' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1C2832' }}>
            {avgPct != null ? `${avgPct}%` : '—'}
          </div>
          <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.7, marginTop: 4 }}>Keskmine</div>
        </div>
        <div style={{ ...card, borderTop: '3px solid #22c55e' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1C2832' }}>
            {bestPct != null ? `${bestPct}%` : '—'}
          </div>
          <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.7, marginTop: 4 }}>Parim</div>
        </div>
      </div>

      {/* Score history */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C2832', marginBottom: 16 }}>Minu tulemused</h2>
        {sharedResults.length === 0 ? (
          <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.5 }}>
            Tulemused puuduvad — õpetaja pole veel ühtegi tagasisidet jaganud.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1C2832' }}>{r.test.title}</div>
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
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1C2832' }}>
                          {r.score} / {r.maxScore} punkti
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{pct}%</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: '#DAD0A1' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4 }} />
                      </div>
                    </div>
                  )}

                  <Link
                    href={`/dashboard/results/${r.id}`}
                    style={{
                      display: 'inline-block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1C2832',
                      textDecoration: 'none',
                      background: '#fff',
                      border: '1.5px solid #1C2832',
                      padding: '5px 14px',
                      borderRadius: 4,
                    }}
                  >
                    Vaata tagasisidet →
                  </Link>
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

              // Trend: compare latest result score to average
              let trendArrow = '→';
              if (withSc.length >= 2 && avg != null) {
                // Ordered by sharedAt desc, so first is latest
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
        <div style={{ ...card, marginBottom: 24 }}>
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

      {/* Data rights — GDPR Art 15 & 17 */}
      {!isPreview && <DataRightsCard />}
    </div>
  );
}
