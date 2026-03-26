import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { TestStatus, ResultStatus } from '@/lib/generated/prisma/client';
import TestAdvanceButton from './TestAdvanceButton';
import BulkAnalyzeButton from './BulkAnalyzeButton';
import AutoImportUpload from './AutoImportUpload';
import { PROTOTYPE_MODE } from '@/lib/prototype-mode';
import { FeedbackData } from '@/lib/types';
import DeleteResultButton from './DeleteResultButton';

/**
 * Extract total points earned and possible from AI feedback JSON.
 * Tries: (1) sum task-level points_earned/points_possible, (2) parse test_info.score "X/Y".
 * Returns { earned, possible } or null if no data.
 */
function extractScores(feedbackJson: string | null): { earned: number; possible: number } | null {
  if (!feedbackJson) return null;
  try {
    const fb: FeedbackData = JSON.parse(feedbackJson);

    // Method 1: sum from tasks array
    if (fb.tasks && fb.tasks.length > 0) {
      let earned = 0;
      let possible = 0;
      let hasPoints = false;
      for (const t of fb.tasks) {
        const e = parseFloat(String(t.points_earned ?? ''));
        const p = parseFloat(String(t.points_possible ?? ''));
        if (!isNaN(e) && !isNaN(p)) {
          earned += e;
          possible += p;
          hasPoints = true;
        }
      }
      if (hasPoints && possible > 0) return { earned, possible };
    }

    // Method 2: parse test_info.score like "15/20" or "15 / 20"
    if (fb.test_info?.score) {
      const match = fb.test_info.score.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
      if (match) {
        const earned = parseFloat(match[1].replace(',', '.'));
        const possible = parseFloat(match[2].replace(',', '.'));
        if (!isNaN(earned) && !isNaN(possible) && possible > 0) return { earned, possible };
      }
    }
  } catch {
    // invalid JSON — ignore
  }
  return null;
}

const TEST_STATUS_LABELS: Record<TestStatus, string> = {
  PREPARING: 'Ettevalmistamine',
  READY: 'Valmis',
  DISTRIBUTED: 'Jagatud',
  COLLECTING: 'Kogumine',
  PROCESSING: 'Töötlemisel',
  COMPLETE: 'Lõpetatud',
  ARCHIVED: 'Arhiveeritud',
};

const TEST_STATUS_COLORS: Record<TestStatus, { bg: string; color: string }> = {
  PREPARING: { bg: '#e5e7eb', color: '#374151' },
  READY: { bg: '#dbeafe', color: '#1d4ed8' },
  DISTRIBUTED: { bg: '#fed7aa', color: '#c2410c' },
  COLLECTING: { bg: '#fef08a', color: '#854d0e' },
  PROCESSING: { bg: '#e9d5ff', color: '#6d28d9' },
  COMPLETE: { bg: '#bbf7d0', color: '#15803d' },
  ARCHIVED: { bg: '#f3f4f6', color: '#9ca3af' },
};

const RESULT_STATUS_LABELS: Record<ResultStatus, string> = {
  PENDING: 'Ootel',
  UPLOADED: 'Laaditud',
  ANALYZING: 'Analüüsimisel',
  DRAFT: 'Mustand',
  REVIEWED: 'Üle vaadatud',
  EDITED: 'Muudetud',
  APPROVED: 'Kinnitatud',
  SHARED: 'Jagatud',
  ARCHIVED: 'Arhiveeritud',
};

const RESULT_STATUS_COLORS: Record<ResultStatus, { bg: string; color: string }> = {
  PENDING: { bg: '#e5e7eb', color: '#374151' },
  UPLOADED: { bg: '#dbeafe', color: '#1d4ed8' },
  ANALYZING: { bg: '#e9d5ff', color: '#6d28d9' },
  DRAFT: { bg: '#fef08a', color: '#854d0e' },
  REVIEWED: { bg: '#fed7aa', color: '#c2410c' },
  EDITED: { bg: '#fed7aa', color: '#c2410c' },
  APPROVED: { bg: '#bbf7d0', color: '#15803d' },
  SHARED: { bg: '#99f6e4', color: '#0f766e' },
  ARCHIVED: { bg: '#f3f4f6', color: '#9ca3af' },
};

const LIFECYCLE_STEPS: TestStatus[] = [
  'PREPARING',
  'READY',
  'DISTRIBUTED',
  'COLLECTING',
  'PROCESSING',
  'COMPLETE',
];

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('et-EE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });

  if (!session || session.expiresAt < new Date() || !session.user.teacherProfile) {
    redirect('/auth/login');
  }

  const teacherProfile = session.user.teacherProfile;

  const test = await db.test.findFirst({
    where: { id, teacherId: teacherProfile.id, deletedAt: null },
    include: {
      subject: true,
      results: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!test) notFound();

  const currentStatusIndex = LIFECYCLE_STEPS.indexOf(test.status as TestStatus);
  const canAdvance =
    test.status !== 'COMPLETE' &&
    test.status !== 'ARCHIVED' &&
    LIFECYCLE_STEPS.includes(test.status as TestStatus);

  const nextStatus =
    currentStatusIndex >= 0 && currentStatusIndex < LIFECYCLE_STEPS.length - 1
      ? LIFECYCLE_STEPS[currentStatusIndex + 1]
      : null;

  const statusColor = TEST_STATUS_COLORS[test.status as TestStatus];

  const uploadedCount = test.results.filter(r => r.status === 'UPLOADED').length;

  // Compute score stats — use DB scores if available, otherwise extract from AI feedback
  const resultScores = test.results.map(r => {
    if (r.score != null && r.maxScore != null && r.maxScore > 0) {
      return { earned: r.score, possible: r.maxScore };
    }
    const qaFb = (r as Record<string, unknown>).qaFeedback as string | null;
    return extractScores(r.editedFeedback || qaFb || r.rawFeedback);
  });
  const scoredResults = resultScores.filter((s): s is { earned: number; possible: number } => s !== null && s.possible > 0);
  const avgPct = scoredResults.length > 0
    ? Math.round(scoredResults.reduce((sum, s) => sum + (s.earned / s.possible) * 100, 0) / scoredResults.length)
    : null;

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
        <Link href="/dashboard/tests" style={{ color: '#6b7280', textDecoration: 'underline' }}>Kontrolltööd</Link>
        <span style={{ color: '#d1d5db' }}>&gt;</span>
        <span style={{ color: '#1C2832' }}>{test.title}</span>
      </div>

      {/* Header — full width */}
      <div style={{ background: '#F8F3DA', padding: '20px 22px', marginBottom: 20, borderBottom: '3px solid #DAD0A1' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', margin: 0 }}>{test.title}</h1>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              {test.subject && <span style={{ fontSize: 13, color: '#1C2832', opacity: 0.7 }}>{test.subject.name}</span>}
              {test.grade && <span style={{ fontSize: 13, color: '#1C2832', opacity: 0.7 }}>{test.grade}. klass</span>}
              {test.plannedDate && <span style={{ fontSize: 13, color: '#1C2832', opacity: 0.7 }}>Planeeritud: {formatDate(test.plannedDate)}</span>}
            </div>
          </div>
          <span style={{ background: statusColor.bg, color: statusColor.color, fontSize: 12, fontWeight: 700, padding: '4px 12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {TEST_STATUS_LABELS[test.status as TestStatus]}
          </span>
        </div>
      </div>

      {/* ── Desktop two-pane: left sidebar + right main ── */}
      <div className="lg:grid lg:gap-6 lg:items-start" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        {/* This inner grid is overridden by the lg: class above */}
        <style>{`@media (min-width: 1024px) { .test-detail-grid { grid-template-columns: 320px 1fr !important; } }`}</style>
        <div className="test-detail-grid" style={{ display: 'contents' }}>

        {/* LEFT COLUMN — lifecycle, stats, actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Lifecycle */}
          {!PROTOTYPE_MODE && <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '18px 20px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#1C2832', opacity: 0.5, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Elutsükkel
            </p>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {LIFECYCLE_STEPS.map((step, i) => {
                const stepIndex = LIFECYCLE_STEPS.indexOf(test.status as TestStatus);
                const isDone = i < stepIndex;
                const isCurrent = i === stepIndex;
                const isFuture = i > stepIndex;
                return (
                  <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    {i > 0 && (
                      <div style={{ position: 'absolute', top: 10, left: '-50%', right: '50%', height: 3, background: isDone || isCurrent ? '#1C2832' : '#DAD0A1', zIndex: 0 }} />
                    )}
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: isCurrent ? '#1C2832' : isDone ? '#DAD0A1' : '#F8F3DA', border: `3px solid ${isCurrent ? '#1C2832' : isDone ? '#1C2832' : '#DAD0A1'}`, zIndex: 1, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isDone && <span style={{ fontSize: 10, color: '#1C2832', fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: isCurrent ? 700 : 400, color: isFuture ? '#9ca3af' : '#1C2832', marginTop: 5, textAlign: 'center', lineHeight: 1.2 }}>
                      {TEST_STATUS_LABELS[step]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Stage dates */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 14 }}>
              {test.distributedDate && <div style={{ fontSize: 11, color: '#1C2832', opacity: 0.6 }}><strong>Jagatud:</strong> {formatDate(test.distributedDate)}</div>}
              {test.collectedDate && <div style={{ fontSize: 11, color: '#1C2832', opacity: 0.6 }}><strong>Kogutud:</strong> {formatDate(test.collectedDate)}</div>}
              {test.completedDate && <div style={{ fontSize: 11, color: '#1C2832', opacity: 0.6 }}><strong>Lõpetatud:</strong> {formatDate(test.completedDate)}</div>}
            </div>

            {!PROTOTYPE_MODE && canAdvance && nextStatus && (
              <div style={{ marginTop: 14, borderTop: '1px solid #DAD0A1', paddingTop: 14 }}>
                <TestAdvanceButton testId={test.id} nextStatusLabel={TEST_STATUS_LABELS[nextStatus]} />
              </div>
            )}
          </div>}

          {/* Stats card — desktop only meaningful when results exist */}
          {test.results.length > 0 && (
            <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '16px 20px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#1C2832', opacity: 0.5, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Statistika
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#1C2832' }}>{test.results.length}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Õpilast</div>
                </div>
                {avgPct != null && (
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: avgPct >= 70 ? '#16a34a' : avgPct >= 50 ? '#f97316' : '#dc2626' }}>{avgPct}%</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Keskmine</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1C2832' }}>
                    {test.results.filter(r => r.status === 'SHARED').length}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Jagatud</div>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f97316' }}>
                    {test.results.filter(r => r.status === 'DRAFT' || r.status === 'APPROVED').length}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Ootab</div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {!PROTOTYPE_MODE && test.notes && (
            <div style={{ background: '#F8F3DA', padding: '14px 16px', borderLeft: '3px solid #DAD0A1' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#1C2832', opacity: 0.6, marginBottom: 4 }}>MÄRKMED</p>
              <p style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.6, margin: 0 }}>{test.notes}</p>
            </div>
          )}

          {/* Rubric */}
          {!PROTOTYPE_MODE && test.rubric && (
            <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '14px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#1C2832', opacity: 0.5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hindamisjuhend</p>
              <p style={{ fontSize: 13, color: '#1C2832', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{test.rubric}</p>
            </div>
          )}

          {/* Answer key */}
          {!PROTOTYPE_MODE && test.answerKey && (
            <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '14px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#1C2832', opacity: 0.5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Õiged vastused</p>
              <p style={{ fontSize: 13, color: '#1C2832', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{test.answerKey}</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — student results */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C2832', margin: 0 }}>
              Õpilaste tulemused
              <span style={{ fontSize: 14, fontWeight: 400, opacity: 0.6, marginLeft: 8 }}>({test.results.length})</span>
            </h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {uploadedCount > 0 && (
                <BulkAnalyzeButton testId={test.id} uploadedCount={uploadedCount} />
              )}
              {!PROTOTYPE_MODE && (
                <Link
                  href={`/dashboard/tests/${test.id}/consent-check`}
                  style={{ background: '#fef3c7', color: '#92400e', fontWeight: 700, fontSize: 13, padding: '9px 16px', textDecoration: 'none', borderRadius: 4, whiteSpace: 'nowrap', border: '1.5px solid #fcd34d' }}
                >
                  ✓ Nõusolekud
                </Link>
              )}
              {!PROTOTYPE_MODE && (
                <Link
                  href={`/dashboard/tests/${test.id}/batch-import`}
                  style={{ background: '#1C2832', color: '#F8F3DA', fontWeight: 700, fontSize: 13, padding: '9px 16px', textDecoration: 'none', borderRadius: 4, whiteSpace: 'nowrap' }}
                >
                  📄 Lae üles skannitud PDF
                </Link>
              )}
              {!PROTOTYPE_MODE && <Link
                href={`/dashboard/tests/${test.id}/results/new`}
                style={{ background: '#F8F3DA', color: '#1C2832', fontWeight: 700, fontSize: 13, padding: '9px 16px', textDecoration: 'none', borderRadius: 4, whiteSpace: 'nowrap', border: '1.5px solid #DAD0A1' }}
              >
                + Lisa üks tulemus
              </Link>}
            </div>
          </div>

          {test.results.length === 0 ? (
            PROTOTYPE_MODE ? (
              <AutoImportUpload testId={test.id} />
            ) : (
              <div style={{ background: '#F8F3DA', border: '2px dashed #DAD0A1', padding: '48px 24px', textAlign: 'center', borderRadius: 6 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1C2832' }}>Ühtegi tulemust pole veel lisatud</p>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Lae üles skannitud PDF kõigi õpilaste töödega</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                  <Link href={`/dashboard/tests/${test.id}/batch-import`} style={{ display: 'inline-block', background: '#1C2832', color: '#F8F3DA', padding: '10px 20px', borderRadius: 4, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                    📄 Lae üles skannitud PDF
                  </Link>
                  <Link href={`/dashboard/tests/${test.id}/results/new`} style={{ display: 'inline-block', background: '#fff', color: '#1C2832', padding: '10px 20px', borderRadius: 4, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1.5px solid #DAD0A1' }}>
                    + Lisa üks tulemus käsitsi
                  </Link>
                </div>
              </div>
            )
          ) : (
            // Desktop: proper table; mobile: card list
            <>
              {/* Desktop table — each row is a clickable Link */}
              <style>{`
                .result-row { transition: background 0.12s; }
                .result-row:hover { background: #F8F3DA !important; }
              `}</style>
              <div className="hidden md:block" style={{ border: '1.5px solid #DAD0A1', borderRadius: 6, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px 70px 110px 40px', background: '#F8F3DA', borderBottom: '2px solid #DAD0A1', fontSize: 12, fontWeight: 700, color: '#1C2832' }}>
                  <span style={{ padding: '10px 14px' }}>#</span>
                  <span style={{ padding: '10px 14px' }}>Õpilane</span>
                  <span style={{ padding: '10px 14px', textAlign: 'center' }}>Punktid</span>
                  <span style={{ padding: '10px 14px', textAlign: 'center' }}>%</span>
                  <span style={{ padding: '10px 14px' }}>Staatus</span>
                  <span></span>
                </div>
                {/* Rows */}
                {test.results.map((result, i) => {
                  const rStatusColor = RESULT_STATUS_COLORS[result.status as ResultStatus];
                  const qaFb = (result as Record<string, unknown>).qaFeedback as string | null;
                  const feedbackScores = (result.score == null || result.maxScore == null)
                    ? extractScores(result.editedFeedback || qaFb || result.rawFeedback)
                    : null;
                  const displayScore = result.score ?? feedbackScores?.earned ?? null;
                  const displayMax = result.maxScore ?? feedbackScores?.possible ?? null;
                  const pct = displayScore != null && displayMax != null && displayMax > 0
                    ? Math.round((displayScore / displayMax) * 100) : null;
                  const pctColor = pct == null ? '#9ca3af' : pct >= 70 ? '#16a34a' : pct >= 50 ? '#f97316' : '#dc2626';
                  return (
                    <div
                      key={result.id}
                      className="result-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr 120px 70px 110px 40px',
                        alignItems: 'center',
                        fontSize: 14,
                        borderBottom: i < test.results.length - 1 ? '1px solid #F0EDD6' : 'none',
                        background: i % 2 === 0 ? '#fff' : '#FDFAF0',
                      }}
                    >
                      <Link href={`/dashboard/tests/${test.id}/results/${result.id}`} style={{ padding: '11px 14px', color: '#9ca3af', fontSize: 12, textDecoration: 'none' }}>{i + 1}</Link>
                      <Link href={`/dashboard/tests/${test.id}/results/${result.id}`} style={{ padding: '11px 14px', fontWeight: 600, color: '#1C2832', textDecoration: 'none' }}>
                        {result.studentName || 'Nimetu õpilane'}
                      </Link>
                      <Link href={`/dashboard/tests/${test.id}/results/${result.id}`} style={{ padding: '11px 14px', textAlign: 'center', color: '#1C2832', fontSize: 13, textDecoration: 'none' }}>
                        {displayScore != null ? `${displayScore}${displayMax != null ? ` / ${displayMax}` : ''}` : '—'}
                      </Link>
                      <Link href={`/dashboard/tests/${test.id}/results/${result.id}`} style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 700, color: pctColor, textDecoration: 'none' }}>
                        {pct != null ? `${pct}%` : '—'}
                      </Link>
                      <Link href={`/dashboard/tests/${test.id}/results/${result.id}`} style={{ padding: '11px 14px', textDecoration: 'none' }}>
                        <span style={{ background: rStatusColor.bg, color: rStatusColor.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                          {RESULT_STATUS_LABELS[result.status as ResultStatus]}
                        </span>
                      </Link>
                      <span style={{ padding: '4px', textAlign: 'center' }}>
                        <DeleteResultButton testId={test.id} resultId={result.id} studentName={result.studentName || 'Nimetu'} />
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Mobile card list */}
              <div className="md:hidden" style={{ border: '1.5px solid #DAD0A1', background: '#fff', borderRadius: 6 }}>
                {test.results.map((result, i) => {
                  const rStatusColor = RESULT_STATUS_COLORS[result.status as ResultStatus];
                  const qaFbMobile = (result as Record<string, unknown>).qaFeedback as string | null;
                  const mobileScores = (result.score == null || result.maxScore == null)
                    ? extractScores(result.editedFeedback || qaFbMobile || result.rawFeedback)
                    : null;
                  const mobileEarned = result.score ?? mobileScores?.earned ?? null;
                  const mobileMax = result.maxScore ?? mobileScores?.possible ?? null;
                  return (
                    <div
                      key={result.id}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: i < test.results.length - 1 ? '1px solid #DAD0A1' : 'none', gap: 8 }}
                    >
                      <Link
                        href={`/dashboard/tests/${test.id}/results/${result.id}`}
                        style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}
                      >
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1C2832', margin: 0 }}>{result.studentName || 'Nimetu õpilane'}</p>
                        {mobileEarned != null && (
                          <p style={{ fontSize: 12, color: '#1C2832', opacity: 0.6, marginTop: 2 }}>
                            {mobileEarned}{mobileMax != null ? ` / ${mobileMax} punkti` : ' punkti'}
                          </p>
                        )}
                      </Link>
                      <span style={{ background: rStatusColor.bg, color: rStatusColor.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {RESULT_STATUS_LABELS[result.status as ResultStatus]}
                      </span>
                      <DeleteResultButton testId={test.id} resultId={result.id} studentName={result.studentName || 'Nimetu'} />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* In prototype mode, show upload zone below results too */}
          {PROTOTYPE_MODE && test.results.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <AutoImportUpload testId={test.id} />
            </div>
          )}
        </div>

        </div>{/* end .test-detail-grid */}
      </div>
    </div>
  );
}
