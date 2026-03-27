import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import AITransparencyMarker from '@/components/AITransparencyMarker';

interface FeedbackData {
  summary?: string;
  overallScore?: number | null;
  maxScore?: number;
  strengths?: string[];
  improvements?: string[];
  sections?: { title: string; content: string }[];
  recommendation?: string;
}

function parseFeedback(json: string | null | undefined): FeedbackData | null {
  if (!json) return null;
  try { return JSON.parse(json) as FeedbackData; } catch { return null; }
}

function scoreColor(pct: number) {
  if (pct >= 70) return '#16a34a';
  if (pct >= 50) return '#f97316';
  return '#dc2626';
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { studentProfile: true, teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) redirect('/auth/login');

  const { id } = await params;

  const exercise = await db.exercise.findUnique({
    where: { id },
    include: { subject: true, photos: true },
  });

  if (!exercise) notFound();

  // Access: student who submitted OR teacher (any)
  const studentId = session.user.studentProfile?.id;
  const isTeacher = !!session.user.teacherProfile;
  const isOwner = exercise.studentId === studentId;
  const isSharedWithTeacher = exercise.status === 'SHARED_WITH_TEACHER';

  if (!isOwner && !(isTeacher && isSharedWithTeacher)) {
    redirect('/dashboard');
  }

  const fb = parseFeedback(exercise.rawFeedback);
  const isError = !!fb?.summary?.startsWith('Analüüsimisel tekkis viga');
  const hasPct = !isError && fb?.overallScore != null && fb?.maxScore != null && fb.maxScore > 0;
  const pct = hasPct ? Math.round(((fb!.overallScore! / fb!.maxScore!) * 100)) : null;
  const barColor = pct != null ? scoreColor(pct) : '#DAD0A1';

  const card = { background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' as const, borderRadius: 8, padding: '22px 24px', marginBottom: 20 };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/dashboard/student" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
          ← Minu töölaud
        </Link>
        {fb && !isError && (
          <Link
            href={`/dashboard/exercises/${exercise.id}/print`}
            target="_blank"
            style={{
              fontSize: 13, fontWeight: 600, color: '#1C2832',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
              background: '#F8F3DA', border: '1.5px solid #DAD0A1',
              padding: '6px 12px', borderRadius: 6,
            }}
          >
            ⬇ PDF
          </Link>
        )}
      </div>

      {/* Header */}
      <div style={{ marginTop: 12, marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          {exercise.subject?.name || 'Harjutus'} {exercise.grade ? `· ${exercise.grade}. klass` : ''} · {formatDate(exercise.createdAt)}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832' }}>{exercise.topic}</h1>
        {exercise.studentNote && (
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 6, fontStyle: 'italic' }}>
            &ldquo;{exercise.studentNote}&rdquo;
          </p>
        )}
      </div>

      {/* Status */}
      {exercise.status === 'ANALYZING' && (
        <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '14px 18px', marginBottom: 20, fontSize: 14 }}>
          🤖 AI analüüsib… Laadi lehekülg uuesti mõne sekundi pärast.
        </div>
      )}

      {fb && (
        <>
          <AITransparencyMarker contentType="tagasiside" />

          {/* Error state */}
          {isError && isOwner && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '18px 20px', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>Analüüsimisel tekkis viga</div>
              <p style={{ fontSize: 13, color: '#7f1d1d', margin: 0 }}>AI ei suutnud sinu harjutusi analüüsida. Proovi uuesti — tavaliselt lahendub see iseenesest.</p>
              <ExerciseRetryButton exerciseId={exercise.id} />
            </div>
          )}

          {/* Summary + score */}
          {!isError && <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', marginBottom: 10 }}>Üldine hinnang</h2>
                <p style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.7 }}>{fb.summary}</p>
              </div>
              {pct != null && (
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 36, fontWeight: 700, color: barColor }}>{pct}%</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{fb.overallScore} / {fb.maxScore}</div>
                  <div style={{ marginTop: 8, height: 8, width: 80, borderRadius: 4, background: '#DAD0A1' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4 }} />
                  </div>
                </div>
              )}
            </div>
          </div>}

          {/* Strengths + improvements */}
          {!isError && ((fb.strengths?.length ?? 0) > 0 || (fb.improvements?.length ?? 0) > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
              {(fb.strengths?.length ?? 0) > 0 && (
                <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 8, padding: '18px 20px' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#15803d', marginBottom: 12 }}>✓ Mis läks hästi</h3>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {fb.strengths!.map((s, i) => (
                      <li key={i} style={{ fontSize: 13, color: '#166534', lineHeight: 1.6, paddingLeft: 14, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0 }}>·</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(fb.improvements?.length ?? 0) > 0 && (
                <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 8, padding: '18px 20px' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#c2410c', marginBottom: 12 }}>→ Mida harjutada</h3>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {fb.improvements!.map((s, i) => (
                      <li key={i} style={{ fontSize: 13, color: '#9a3412', lineHeight: 1.6, paddingLeft: 14, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0 }}>·</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Per-section feedback */}
          {!isError && (fb.sections?.length ?? 0) > 0 && (
            <div style={card}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', marginBottom: 16 }}>Ülesannete kaupa</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {fb.sections!.map((section, i) => (
                  <div key={i} style={{ borderLeft: '3px solid #DAD0A1', paddingLeft: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1C2832', marginBottom: 4 }}>{section.title}</div>
                    <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: 0 }}>{section.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          {!isError && fb.recommendation && (
            <div style={{ background: '#F8F3DA', border: '1.5px solid #DAD0A1', borderRadius: 8, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Järgmine samm
              </div>
              <p style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.6, margin: 0 }}>
                {fb.recommendation}
              </p>
            </div>
          )}

          {/* Share with teacher (student only, not yet shared) */}
          {!isError && isOwner && exercise.status === 'FEEDBACK_READY' && (
            <ShareButton exerciseId={exercise.id} />
          )}

          {!isError && isOwner && exercise.status === 'SHARED_WITH_TEACHER' && (
            <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, textAlign: 'center', padding: '12px 0' }}>
              ✓ Jagatud õpetajaga {exercise.sharedAt ? formatDate(exercise.sharedAt) : ''}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Client components
import ExerciseShareButton from './ExerciseShareButton';
import ExerciseRetryButton from './ExerciseRetryButton';

function ShareButton({ exerciseId }: { exerciseId: string }) {
  return <ExerciseShareButton exerciseId={exerciseId} />;
}
