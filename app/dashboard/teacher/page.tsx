import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { TestStatus, ResultStatus } from '@/lib/generated/prisma/client';
import { PROTOTYPE_MODE } from '@/lib/prototype-mode';

const TEST_STATUS_LABELS: Record<string, string> = {
  PREPARING: 'Ettevalmistamine',
  READY: 'Valmis',
  DISTRIBUTED: 'Jagatud',
  COLLECTING: 'Kogumine',
  PROCESSING: 'Töötlemisel',
  COMPLETE: 'Lõpetatud',
};

const TEST_STATUS_COLORS: Record<string, string> = {
  PREPARING: '#6b7280',
  READY: '#1d4ed8',
  DISTRIBUTED: '#c2410c',
  COLLECTING: '#854d0e',
  PROCESSING: '#6d28d9',
  COMPLETE: '#15803d',
};

const RESULT_STATUS_LABELS: Record<string, string> = {
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

const RESULT_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#fef08a', color: '#854d0e' },
  REVIEWED: { bg: '#fed7aa', color: '#c2410c' },
  EDITED: { bg: '#fed7aa', color: '#c2410c' },
  APPROVED: { bg: '#bbf7d0', color: '#15803d' },
  SHARED: { bg: '#99f6e4', color: '#0f766e' },
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  CONSENT_REQUESTED: 'Nõusolek saadetud',
  CONSENT_APPROVED: 'Nõusolek kinnitatud',
  CONSENT_DECLINED: 'Nõusolek keeldutud',
  CONSENT_REVOKED: 'Nõusolek tühistatud',
  DATA_ACCESSED: 'Andmetele ligipääs',
  LOGIN: 'Sisselogimine',
  LOGOUT: 'Väljalogimine',
  RESULT_SHARED: 'Tulemus jagatud',
  RESULT_APPROVED: 'Tulemus kinnitatud',
  RESULT_ANALYZED: 'Tulemus analüüsitud',
  TEST_CREATED: 'Kontrolltöö loodud',
  TEST_ADVANCED: 'Kontrolltöö edendatud',
};

function formatAuditAction(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

function formatTimestamp(d: Date | string): string {
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} kell ${hours}:${minutes}`;
}

function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} minutit tagasi`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} tundi tagasi`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} päeva tagasi`;
  const months = Math.floor(days / 30);
  return `${months} kuud tagasi`;
}

const PIPELINE_STATUSES: TestStatus[] = [
  'PREPARING',
  'READY',
  'DISTRIBUTED',
  'COLLECTING',
  'PROCESSING',
  'COMPLETE',
];

export default async function TeacherDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });

  if (!session || session.expiresAt < new Date()) redirect('/auth/login');

  const user = session.user;
  const isPreview = user.role === 'SUPERADMIN' && !!cookieStore.get('ot_preview_role')?.value;

  if (!user.teacherProfile && !isPreview) redirect('/dashboard');

  const allTests = user.teacherProfile
    ? await db.test.findMany({
        where: { teacherId: user.teacherProfile.id, deletedAt: null },
        include: {
          subject: true,
          results: {
            select: {
              id: true,
              status: true,
              score: true,
              maxScore: true,
              analyzedAt: true,
              approvedAt: true,
              sharedAt: true,
              studentName: true,
              testId: true,
              student: { select: { user: { select: { name: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  // Top stats
  const totalTests = allTests.length;

  const allResults = allTests.flatMap((t) => t.results.map((r) => ({ ...r, test: t })));
  const analyzedStatuses: ResultStatus[] = ['DRAFT', 'REVIEWED', 'EDITED', 'APPROVED', 'SHARED', 'ARCHIVED'];
  const totalAnalyzed = allResults.filter((r) => analyzedStatuses.includes(r.status as ResultStatus)).length;
  const pendingReview = allResults.filter((r) =>
    (r.status as ResultStatus) === 'DRAFT' || (r.status as ResultStatus) === 'REVIEWED'
  ).length;
  const sharedCount = allResults.filter((r) => (r.status as ResultStatus) === 'SHARED').length;

  // Pipeline: group tests by status
  const pipelineGroups: Record<string, typeof allTests> = {};
  for (const status of PIPELINE_STATUSES) {
    pipelineGroups[status] = allTests.filter((t) => t.status === status);
  }

  // Needs attention: DRAFT (AI done) or APPROVED (not yet shared), up to 10
  const needsAttention = allResults
    .filter((r) =>
      (r.status as ResultStatus) === 'DRAFT' || (r.status as ResultStatus) === 'APPROVED'
    )
    .sort((a, b) => {
      const aTime = new Date(a.approvedAt ?? a.analyzedAt ?? 0).getTime();
      const bTime = new Date(b.approvedAt ?? b.analyzedAt ?? 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 10);

  // Audit logs
  const auditLogs = await db.auditLog.findMany({
    where: { userId: user.id },
    orderBy: { timestamp: 'desc' },
    take: 15,
  });

  // Results by subject
  type SubjectStats = { name: string; count: number; totalScore: number; countWithScore: number };
  const subjectMap = new Map<string, SubjectStats>();
  for (const r of allResults) {
    const subjectName = (r.test as typeof allTests[number]).subject?.name ?? 'Muu';
    if (!subjectMap.has(subjectName)) {
      subjectMap.set(subjectName, { name: subjectName, count: 0, totalScore: 0, countWithScore: 0 });
    }
    const stats = subjectMap.get(subjectName)!;
    stats.count++;
    if (r.score != null && r.maxScore != null && r.maxScore > 0) {
      stats.totalScore += (r.score / r.maxScore) * 100;
      stats.countWithScore++;
    }
  }
  const subjectStats = Array.from(subjectMap.values()).sort((a, b) => b.count - a.count);

  const card = {
    background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)' as const,
    borderRadius: 8,
    padding: '20px 22px',
  };

  // Compute happy-path stage
  const hasDraft = allResults.some((r) => (r.status as ResultStatus) === 'DRAFT');
  const hasApproved = allResults.some((r) => (r.status as ResultStatus) === 'APPROVED');

  type HappyStep = { n: number; label: string; cta: string; href: string; active: boolean };
  const happySteps: HappyStep[] = [
    {
      n: 1, label: 'Loo kontrolltöö', cta: 'Loo kontrolltöö',
      href: '/dashboard/tests/new',
      active: totalTests === 0,
    },
    {
      n: 2, label: 'Skaneeri tööd', cta: 'Skaneeri',
      href: totalTests > 0 ? `/dashboard/tests/${allTests[0]?.id}/batch-import` : '/dashboard/tests',
      active: totalTests > 0 && allResults.length === 0,
    },
    {
      n: 3, label: 'Vaata tagasisidet', cta: 'Vaata mustandeid',
      href: '/dashboard/tests',
      active: hasDraft,
    },
    {
      n: 4, label: 'Jaga õpilastega', cta: 'Jaga',
      href: '/dashboard/tests',
      active: hasApproved && !hasDraft,
    },
  ];
  const activeStep = happySteps.find((s) => s.active);

  // Recent scannable tests (not COMPLETE / ARCHIVED)
  const scannableTests = allTests
    .filter((t) => !(['COMPLETE', 'ARCHIVED'] as string[]).includes(t.status))
    .slice(0, 5);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 60 }}>
      {isPreview && (
        <div style={{ background: '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 600, padding: '10px 16px', borderRadius: 6, marginBottom: 20 }}>
          👁 Eelvaade — näed tühja õpetaja vaadet. Pärisandmed pole saadaval, kuna oled SUPERADMIN.
        </div>
      )}

      {/* Task 8c: incomplete onboarding banner */}
      {!user.onboardingCompleted && !PROTOTYPE_MODE && (
        <div style={{
          background: '#fef9c3',
          border: '1px solid #fde047',
          borderRadius: 8,
          padding: '12px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 14, color: '#854d0e', fontWeight: 500 }}>
            ⚙️ Seadistamine on pooleli.
          </span>
          <a href="/dashboard/onboarding" style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#854d0e',
            textDecoration: 'underline',
          }}>
            Lõpeta seadistus →
          </a>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/dashboard" style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}>
          ← Töölaud
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1C2832', marginTop: 8, marginBottom: 4 }}>
          Tere, {user.name}!
        </h1>
        <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.6 }}>Õpetaja töölaud</p>
      </div>

      {/* Happy path guidance banner */}
      {activeStep && (
        <div style={{
          background: '#1C2832',
          color: '#F8F3DA',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6, marginBottom: 4 }}>
              Järgmine samm
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {activeStep.n}. {activeStep.label}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {/* step indicators */}
            {happySteps.map((s) => (
              <div
                key={s.n}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: s.n < activeStep.n ? '#22c55e' : s.n === activeStep.n ? '#F8F3DA' : 'rgba(255,255,255,0.15)',
                  color: s.n === activeStep.n ? '#1C2832' : s.n < activeStep.n ? '#fff' : 'rgba(255,255,255,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }}
              >
                {s.n < activeStep.n ? '✓' : s.n}
              </div>
            ))}
            <Link
              href={activeStep.href}
              style={{
                background: '#F8F3DA', color: '#1C2832',
                fontSize: 13, fontWeight: 700, padding: '8px 16px',
                textDecoration: 'none', borderRadius: 4, whiteSpace: 'nowrap',
              }}
            >
              {activeStep.cta} →
            </Link>
          </div>
        </div>
      )}

      {/* Invite colleague banner */}
      {!PROTOTYPE_MODE && <div style={{
        background: '#F8F3DA',
        border: '1.5px solid #DAD0A1',
        borderRadius: 8,
        padding: '12px 18px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 14, color: '#1C2832' }}>
          Tead kolleegi, kes võiks kasu saada? <strong>Kutsu ta proovima!</strong>
        </span>
        <Link
          href="/dashboard/invites"
          style={{
            background: '#1C2832',
            color: '#F8F3DA',
            fontSize: 13,
            fontWeight: 700,
            padding: '8px 16px',
            textDecoration: 'none',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Kutsu kolleeg →
        </Link>
      </div>}

      {/* Hero: Scan class papers */}
      <div style={{ ...card, marginBottom: 20, background: '#F8F3DA', border: '2px solid #DAD0A1' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: scannableTests.length > 0 ? 14 : 0, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: 4 }}>
              Peamine töövoog
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C2832', margin: 0 }}>
              📄 Skaneeri klassi tööd
            </h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 0 }}>
              Lae üles PDF → AI tuvastab nimesid → kontrolli → loo kõik tulemused korraga
            </p>
          </div>
          {totalTests === 0 && (
            <Link
              href="/dashboard/tests/new"
              style={{ background: '#1C2832', color: '#F8F3DA', fontSize: 13, fontWeight: 700, padding: '10px 18px', textDecoration: 'none', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Loo kontrolltöö esmalt
            </Link>
          )}
        </div>
        {scannableTests.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {scannableTests.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #DAD0A1', borderRadius: 6, padding: '10px 14px', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2832', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    {(() => {
                      const total = t.results.length;
                      if (total === 0) return `${TEST_STATUS_LABELS[t.status] ?? t.status} · 0 tulemust`;
                      const uploaded = t.results.filter((r: { status: string }) => r.status === 'UPLOADED').length;
                      const analyzing = t.results.filter((r: { status: string }) => r.status === 'ANALYZING').length;
                      const drafts = t.results.filter((r: { status: string }) => r.status === 'DRAFT').length;
                      const reviewed = t.results.filter((r: { status: string }) => ['REVIEWED', 'EDITED'].includes(r.status)).length;
                      const approved = t.results.filter((r: { status: string }) => r.status === 'APPROVED').length;
                      const shared = t.results.filter((r: { status: string }) => r.status === 'SHARED').length;
                      const archived = t.results.filter((r: { status: string }) => r.status === 'ARCHIVED').length;
                      const parts: string[] = [];
                      if (uploaded > 0) parts.push(`${uploaded} ootab hindamist`);
                      if (analyzing > 0) parts.push(`${analyzing} hindamisel`);
                      if (drafts > 0) parts.push(`${drafts} mustand`);
                      if (reviewed > 0) parts.push(`${reviewed} ülevaadatud`);
                      if (approved > 0) parts.push(`${approved} kinnitatud`);
                      if (shared > 0) parts.push(`${shared} jagatud`);
                      if (archived > 0) parts.push(`${archived} arhiveeritud`);
                      return parts.length > 0 ? `${total} tulemust · ${parts.join(', ')}` : `${total} tulemust`;
                    })()}
                  </div>
                </div>
                {(() => {
                  const total = t.results.length;
                  const hasUploaded = t.results.some((r: { status: string }) => r.status === 'UPLOADED');
                  const hasAnalyzing = t.results.some((r: { status: string }) => r.status === 'ANALYZING');
                  const hasDrafts = t.results.some((r: { status: string }) => r.status === 'DRAFT');
                  const hasApproved = t.results.some((r: { status: string }) => r.status === 'APPROVED');
                  const allSharedOrArchived = total > 0 && t.results.every((r: { status: string }) => ['SHARED', 'ARCHIVED'].includes(r.status));

                  let href: string;
                  let label: string;
                  let bg: string;

                  if (allSharedOrArchived) {
                    href = `/dashboard/tests/${t.id}`;
                    label = 'Lõpetatud';
                    bg = '#166534'; // green
                  } else if (hasApproved) {
                    href = `/dashboard/tests/${t.id}`;
                    label = 'Jaga';
                    bg = '#7c3aed'; // purple
                  } else if (hasDrafts) {
                    href = `/dashboard/tests/${t.id}`;
                    label = 'Vaata';
                    bg = '#1C2832';
                  } else if (hasAnalyzing) {
                    href = `/dashboard/tests/${t.id}`;
                    label = 'Hindamisel...';
                    bg = '#6b7280'; // gray
                  } else if (hasUploaded) {
                    href = `/dashboard/tests/${t.id}`;
                    label = 'Hinda';
                    bg = '#c2410c'; // orange
                  } else {
                    href = `/dashboard/tests/${t.id}/batch-import`;
                    label = 'Skaneeri';
                    bg = '#1C2832';
                  }

                  return (
                    <Link
                      href={href}
                      style={{ background: bg, color: allSharedOrArchived ? '#fff' : '#F8F3DA', fontSize: 12, fontWeight: 700, padding: '7px 14px', textDecoration: 'none', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      {label}
                    </Link>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
        <Link href="/dashboard/tests" style={{ ...card, borderTop: '3px solid #1C2832', textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1C2832' }}>{totalTests}</div>
          <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.7, marginTop: 4 }}>Kontrolltööd</div>
        </Link>
        <Link href="/dashboard/tests?results=analyzed" style={{ ...card, borderTop: '3px solid #DAD0A1', textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1C2832' }}>{totalAnalyzed}</div>
          <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.7, marginTop: 4 }}>Analüüsitud</div>
        </Link>
        <Link href="/dashboard/tests?results=pending" style={{ ...card, borderTop: '3px solid #f97316', textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1C2832' }}>{pendingReview}</div>
          <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.7, marginTop: 4 }}>Ülevaatust ootab</div>
        </Link>
        <Link href="/dashboard/tests?results=shared" style={{ ...card, borderTop: '3px solid #22c55e', textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1C2832' }}>{sharedCount}</div>
          <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.7, marginTop: 4 }}>Jagatud</div>
        </Link>
      </div>

      {/* Task 6a: Empty state when no tests yet */}
      {totalTests === 0 && (
        <div style={{ ...card, marginBottom: 28, textAlign: 'center', padding: '36px 28px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
            Alusta oma esimese kontrolltööga
          </h2>
          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, textAlign: 'left', maxWidth: 340, margin: '0 auto 24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Loo kontrolltöö',
                'Pildista või skaneeri õpilaste tööd',
                'AI koostab tagasiside, Sina vaatad üle',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1C2832', color: '#F8F3DA', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
          <a
            href="/dashboard/tests/new"
            style={{ display: 'inline-block', background: '#1C2832', color: '#F8F3DA', fontWeight: 700, fontSize: 14, padding: '12px 24px', textDecoration: 'none', borderRadius: 4 }}
          >
            Loo esimene kontrolltöö →
          </a>
        </div>
      )}

      {/* Pipeline — Tööde seis */}
      {totalTests > 0 && !PROTOTYPE_MODE && (
      <div style={{ ...card, marginBottom: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C2832', marginBottom: 18 }}>Tööde seis</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }} className="md:grid-cols-6">
          {PIPELINE_STATUSES.map((status) => {
            const tests = pipelineGroups[status] ?? [];
            const colColor = TEST_STATUS_COLORS[status] ?? '#6b7280';
            return (
              <div key={status} style={{ background: '#F8F3DA', borderRadius: 6, padding: '12px 10px' }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: colColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 6,
                }}>
                  {TEST_STATUS_LABELS[status]}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
                  {tests.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {tests.slice(0, 3).map((t) => (
                    <Link
                      key={t.id}
                      href={`/dashboard/tests/${t.id}`}
                      style={{
                        fontSize: 11,
                        color: '#1C2832',
                        textDecoration: 'none',
                        background: '#fff',
                        padding: '4px 6px',
                        borderRadius: 3,
                        border: '1px solid #DAD0A1',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={t.title}
                    >
                      {t.title}
                    </Link>
                  ))}
                  {tests.length > 3 && (
                    <div style={{ fontSize: 10, color: '#1C2832', opacity: 0.5, marginTop: 2 }}>
                      + {tests.length - 3} rohkem
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Needs attention */}
      <div style={{ ...card, marginBottom: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C2832', marginBottom: 16 }}>
          Vajavad tähelepanu
        </h2>
        {needsAttention.length === 0 ? (
          <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.5 }}>
            Kõik tulemused on korras — midagi ülevaatamist ei oota.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {needsAttention.map((r, i) => {
              const statusInfo = RESULT_STATUS_COLORS[r.status] ?? { bg: '#e5e7eb', color: '#374151' };
              const timeRef = r.approvedAt ?? r.analyzedAt;
              const studentName = r.student?.user?.name ?? r.studentName ?? 'Nimetu õpilane';
              return (
                <Link
                  key={r.id}
                  href={`/dashboard/tests/${r.test.id}/results/${r.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderBottom: i < needsAttention.length - 1 ? '1px solid #F8F3DA' : 'none',
                    textDecoration: 'none',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>{studentName}</div>
                    <div style={{ fontSize: 12, color: '#1C2832', opacity: 0.6, marginTop: 2 }}>
                      {r.test.title}
                      {timeRef && ` · ${timeAgo(timeRef)}`}
                    </div>
                  </div>
                  <span style={{
                    background: statusInfo.bg,
                    color: statusInfo.color,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 3,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {RESULT_STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-7">
        <Link href="/dashboard/tests/new" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#1C2832', color: '#F8F3DA', borderRadius: 8, padding: '14px 16px', cursor: 'pointer' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>➕</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Uus kontrolltöö</div>
          </div>
        </Link>
        <Link href="/dashboard/tests" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#1C2832', borderRadius: 8, padding: '14px 16px', cursor: 'pointer' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>📋</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Kontrolltööd</div>
          </div>
        </Link>
      </div>

      {/* Two-column lower section */}
      {!PROTOTYPE_MODE && <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Audit log */}
        <div style={card}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C2832', marginBottom: 16 }}>
            Viimased tegevused
          </h2>
          {auditLogs.length === 0 ? (
            <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.5 }}>Tegevusi pole veel.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {auditLogs.map((log, i) => (
                <div
                  key={log.id}
                  style={{
                    padding: '10px 0',
                    borderBottom: i < auditLogs.length - 1 ? '1px solid #F8F3DA' : 'none',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1C2832' }}>
                    {formatAuditAction(log.action)}
                  </div>
                  {log.targetType && (
                    <div style={{ fontSize: 11, color: '#1C2832', opacity: 0.6, marginTop: 1 }}>
                      {log.targetType}{log.targetId ? ` #${log.targetId.slice(0, 8)}` : ''}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#1C2832', opacity: 0.45, marginTop: 2 }}>
                    {formatTimestamp(log.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results by subject */}
        <div style={card}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C2832', marginBottom: 16 }}>
            Tulemuste jaotus aineti
          </h2>
          {subjectStats.length === 0 ? (
            <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.5 }}>Tulemused puuduvad.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {subjectStats.map((s) => {
                const avg = s.countWithScore > 0
                  ? Math.round(s.totalScore / s.countWithScore)
                  : null;
                return (
                  <div key={s.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1C2832' }}>{s.name}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#1C2832', opacity: 0.55 }}>{s.count} tulemust</span>
                        {avg != null && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1C2832' }}>{avg}%</span>
                        )}
                      </div>
                    </div>
                    {avg != null && (
                      <div style={{ height: 8, borderRadius: 4, background: '#DAD0A1' }}>
                        <div style={{ height: '100%', width: `${avg}%`, background: '#1C2832', borderRadius: 4 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>}
    </div>
  );
}
