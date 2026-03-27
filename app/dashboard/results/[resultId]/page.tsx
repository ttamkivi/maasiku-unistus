import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { FeedbackData, ResourceItem } from '@/lib/types';
import FeedbackTabs from './FeedbackTabs';
import AITransparencyMarker from '@/components/AITransparencyMarker';

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

export default async function StudentResultPage({
  params,
}: {
  params: Promise<{ resultId: string }>;
}) {
  const { resultId } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { studentProfile: true } } },
  });

  if (!session || session.expiresAt < new Date()) redirect('/auth/login');
  if (!session.user.studentProfile) redirect('/dashboard');

  const studentProfile = session.user.studentProfile;

  const result = await db.testResult.findFirst({
    where: {
      id: resultId,
      studentId: studentProfile.id,
      status: 'SHARED',
    },
    include: {
      test: { include: { subject: true } },
    },
  });

  if (!result) notFound();

  const feedback = parseFeedback(result.editedFeedback ?? result.rawFeedback);

  const hasPct = result.score != null && result.maxScore != null && result.maxScore > 0;
  const pct = hasPct ? Math.round((result.score! / result.maxScore!) * 100) : null;
  const barColor = pct != null ? scoreColor(pct) : '#1C2832';

  const resources: ResourceItem[] = feedback?.resources ?? [];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 60 }}>
      {/* Back */}
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/dashboard/student"
          style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}
        >
          ← Tagasi
        </Link>
      </div>

      {/* Header card */}
      <div style={{ background: '#F8F3DA', padding: '20px 22px', marginBottom: 20, borderBottom: '3px solid #DAD0A1' }}>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: '#1C2832', margin: 0 }}>
          {result.test.title}
        </h1>
        <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
          {result.test.subject && (
            <span style={{ fontSize: 13, color: '#1C2832', opacity: 0.7 }}>{result.test.subject.name}</span>
          )}
          {result.sharedAt && (
            <span style={{ fontSize: 13, color: '#1C2832', opacity: 0.7 }}>
              Saadud {formatDate(result.sharedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Score */}
      {hasPct && (
        <div style={{
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          borderRadius: 8,
          padding: '20px 22px',
          marginBottom: 22,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1C2832' }}>
              {result.score} / {result.maxScore} punkti ({pct}%)
            </span>
            <span style={{ fontSize: 18, fontWeight: 800, color: barColor }}>{pct}%</span>
          </div>
          <div style={{ height: 14, borderRadius: 6, background: '#DAD0A1' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 6 }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: '#1C2832', opacity: 0.5 }}>
            {pct! >= 70 ? 'Hea tulemus!' : pct! >= 50 ? 'Rahuldav tulemus' : 'Vajab harjutamist'}
          </div>
        </div>
      )}

      <AITransparencyMarker contentType="tagasiside" />

      {/* Feedback tabs (client component for tab state) */}
      {feedback ? (
        <FeedbackTabs feedback={feedback} />
      ) : (
        <div style={{
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          borderRadius: 8,
          padding: '28px 22px',
          textAlign: 'center',
          marginBottom: 22,
        }}>
          <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.5 }}>
            Tagasiside andmed puuduvad.
          </p>
        </div>
      )}

      {/* Resources */}
      {resources.length > 0 && (
        <div style={{
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          borderRadius: 8,
          padding: '20px 22px',
          marginBottom: 22,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', marginBottom: 14 }}>Soovitused</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {resources.map((res, i) => (
              <div key={i} style={{ background: '#F8F3DA', borderRadius: 5, padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 3,
                    background: res.type === 'video' ? '#dbeafe' : res.type === 'exercise' ? '#bbf7d0' : '#f3f4f6',
                    color: res.type === 'video' ? '#1d4ed8' : res.type === 'exercise' ? '#15803d' : '#374151',
                    textTransform: 'uppercase' as const,
                  }}>
                    {res.type === 'video' ? 'Video' : res.type === 'exercise' ? 'Harjutus' : 'Lugemine'}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1C2832' }}>{res.title}</span>
                </div>
                {res.description && (
                  <p style={{ fontSize: 12, color: '#1C2832', opacity: 0.7, margin: '4px 0' }}>
                    {res.description}
                  </p>
                )}
                {res.url && (
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#0072CE', textDecoration: 'none' }}
                  >
                    Ava link →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
