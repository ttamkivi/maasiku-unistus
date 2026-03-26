import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { TestStatus, ResultStatus } from '@/lib/generated/prisma/client';
import { PROTOTYPE_MODE } from '@/lib/prototype-mode';
import ArchivedSection from './ArchivedSection';

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
  if (diff < 0) {
    // Future date — show as upcoming
    const minutes = Math.floor(-diff / 60000);
    if (minutes < 60) return `${minutes} min pärast`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} tunni pärast`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} päeva pärast`;
    const months = Math.floor(days / 30);
    return `${months} kuu pärast`;
  }
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
          class: { select: { name: true } },
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
        orderBy: { updatedAt: 'desc' },
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

  // Compute if there's draft or approved work needing attention
  const hasDraft = allResults.some((r) => (r.status as ResultStatus) === 'DRAFT');
  const hasApproved = allResults.some((r) => (r.status as ResultStatus) === 'APPROVED');

  // Split tests into active vs archived
  const activeTests = allTests.filter((t) => !(['COMPLETE', 'ARCHIVED'] as string[]).includes(t.status));
  const completedTests = allTests.filter((t) => (['COMPLETE', 'ARCHIVED'] as string[]).includes(t.status));

  // Sort active tests by urgency: tests needing action first
  const testUrgency = (t: typeof allTests[number]) => {
    const hasDraftsLocal = t.results.some((r: { status: string }) => r.status === 'DRAFT');
    const hasApprovedLocal = t.results.some((r: { status: string }) => r.status === 'APPROVED');
    const hasUploaded = t.results.some((r: { status: string }) => r.status === 'UPLOADED');
    const hasAnalyzing = t.results.some((r: { status: string }) => r.status === 'ANALYZING');
    if (hasDraftsLocal) return 0; // most urgent: review needed
    if (hasApprovedLocal) return 1; // share needed
    if (hasUploaded) return 2; // analysis needed
    if (hasAnalyzing) return 3; // waiting
    if (t.results.length === 0 && t.status === 'READY') return 4; // ready to scan
    if (t.status === 'PREPARING') return 5; // still preparing
    return 6;
  };
  activeTests.sort((a, b) => testUrgency(a) - testUrgency(b));

  // Helper: get the most recent activity date for a test (excludes future plannedDate)
  const lastActivity = (t: typeof allTests[number]): Date => {
    const now = Date.now();
    const dates = [t.updatedAt, t.createdAt];
    // Only include plannedDate if it's in the past (i.e., the test already happened)
    if (t.plannedDate && new Date(t.plannedDate).getTime() <= now) dates.push(t.plannedDate);
    if (t.distributedDate) dates.push(t.distributedDate);
    if (t.completedDate) dates.push(t.completedDate);
    for (const r of t.results) {
      if (r.analyzedAt) dates.push(r.analyzedAt);
      if (r.approvedAt) dates.push(r.approvedAt);
      if (r.sharedAt) dates.push(r.sharedAt);
    }
    return new Date(Math.max(...dates.map(d => new Date(d).getTime())));
  };

  // Helper: short date like "25. märts" or "25.03"
  const shortDate = (d: Date | string | null | undefined): string => {
    if (!d) return '';
    const date = new Date(d);
    const day = date.getDate();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
  };

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
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1C2832', marginBottom: 4 }}>
          Tere, {user.name}!
        </h1>
        <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.6 }}>Õpetaja töölaud</p>
      </div>


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

      {/* Active work section */}
      {activeTests.length > 0 && (
        <div style={{ ...card, marginBottom: 20, background: '#F8F3DA', border: '2px solid #DAD0A1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C2832', margin: 0 }}>
                Pooleliolevad tööd
              </h2>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 0 }}>
                {activeTests.length} aktiivne{activeTests.length !== 1 ? 't' : ''} kontrolltöö{activeTests.length !== 1 ? 'd' : ''}
              </p>
            </div>
            <Link
              href="/dashboard/tests/new"
              style={{ background: '#1C2832', color: '#F8F3DA', fontSize: 12, fontWeight: 700, padding: '8px 14px', textDecoration: 'none', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              + Uus kontrolltöö
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeTests.map((t) => {
              const total = t.results.length;
              const hasUploaded = t.results.some((r: { status: string }) => r.status === 'UPLOADED');
              const hasAnalyzing = t.results.some((r: { status: string }) => r.status === 'ANALYZING');
              const hasDraftsLocal = t.results.some((r: { status: string }) => r.status === 'DRAFT');
              const hasApprovedLocal = t.results.some((r: { status: string }) => r.status === 'APPROVED');
              const allSharedOrArchived = total > 0 && t.results.every((r: { status: string }) => ['SHARED', 'ARCHIVED'].includes(r.status));

              // Status description
              let statusLine = '';
              if (total === 0) {
                statusLine = TEST_STATUS_LABELS[t.status] ?? t.status;
              } else {
                const uploaded = t.results.filter((r: { status: string }) => r.status === 'UPLOADED').length;
                const analyzing = t.results.filter((r: { status: string }) => r.status === 'ANALYZING').length;
                const drafts = t.results.filter((r: { status: string }) => r.status === 'DRAFT').length;
                const reviewed = t.results.filter((r: { status: string }) => ['REVIEWED', 'EDITED'].includes(r.status)).length;
                const approved = t.results.filter((r: { status: string }) => r.status === 'APPROVED').length;
                const shared = t.results.filter((r: { status: string }) => r.status === 'SHARED').length;
                const parts: string[] = [];
                if (uploaded > 0) parts.push(`${uploaded} ootab`);
                if (analyzing > 0) parts.push(`${analyzing} hindamisel`);
                if (drafts > 0) parts.push(`${drafts} mustand`);
                if (reviewed > 0) parts.push(`${reviewed} ülevaadatud`);
                if (approved > 0) parts.push(`${approved} kinnitatud`);
                if (shared > 0) parts.push(`${shared} jagatud`);
                statusLine = parts.length > 0 ? `${total} tulemust: ${parts.join(', ')}` : `${total} tulemust`;
              }

              // Action button
              let href: string;
              let label: string;
              let bg: string;
              if (allSharedOrArchived) {
                href = `/dashboard/tests/${t.id}`;
                label = 'Lõpetatud';
                bg = '#166534';
              } else if (hasApprovedLocal) {
                href = `/dashboard/tests/${t.id}`;
                label = 'Jaga';
                bg = '#7c3aed';
              } else if (hasDraftsLocal) {
                href = `/dashboard/tests/${t.id}`;
                label = 'Vaata';
                bg = '#1C2832';
              } else if (hasAnalyzing) {
                href = `/dashboard/tests/${t.id}`;
                label = 'Hindamisel...';
                bg = '#6b7280';
              } else if (hasUploaded) {
                href = `/dashboard/tests/${t.id}`;
                label = 'Hinda';
                bg = '#c2410c';
              } else if (t.status === 'READY' || t.status === 'DISTRIBUTED' || t.status === 'COLLECTING') {
                href = `/dashboard/tests/${t.id}/batch-import`;
                label = 'Lae üles';
                bg = '#c2410c';
              } else {
                href = `/dashboard/tests/${t.id}`;
                label = 'Ettevalmistus';
                bg = '#6b7280';
              }

              // Timestamp line
              const activity = lastActivity(t);
              const timeLabel = timeAgo(activity);
              const className = t.class?.name;
              const metaParts: string[] = [];
              if (className) metaParts.push(className);
              if (t.subject?.name) metaParts.push(t.subject.name);
              if (t.plannedDate && t.status === 'PREPARING') metaParts.push(`planeeritud ${shortDate(t.plannedDate)}`);
              if (timeLabel) metaParts.push(timeLabel);

              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #DAD0A1', borderRadius: 6, padding: '12px 14px', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2832', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#1C2832', opacity: 0.7, marginTop: 2 }}>
                      {statusLine}
                    </div>
                    {metaParts.length > 0 && (
                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                        {metaParts.join(' · ')}
                      </div>
                    )}
                  </div>
                  <Link
                    href={href}
                    style={{ background: bg, color: bg === '#166534' ? '#fff' : '#F8F3DA', fontSize: 12, fontWeight: 700, padding: '7px 14px', textDecoration: 'none', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {label}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Completed / Archived tests — collapsed */}
      {completedTests.length > 0 && (
        <ArchivedSection count={completedTests.length}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {completedTests.map((t) => {
              const total = t.results.length;
              const shared = t.results.filter((r: { status: string }) => r.status === 'SHARED').length;
              const className = t.class?.name;
              const metaParts: string[] = [];
              if (className) metaParts.push(className);
              if (t.subject?.name) metaParts.push(t.subject.name);
              if (t.completedDate) metaParts.push(`lõpetatud ${shortDate(t.completedDate)}`);
              else metaParts.push(timeAgo(t.updatedAt));

              return (
                <Link
                  key={t.id}
                  href={`/dashboard/tests/${t.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    padding: '10px 14px',
                    gap: 12,
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1C2832', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                      {total > 0 ? `${total} tulemust` : 'Tulemusteta'}
                      {shared > 0 ? ` · ${shared} jagatud` : ''}
                      {metaParts.length > 0 ? ` · ${metaParts.join(' · ')}` : ''}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: t.status === 'ARCHIVED' ? '#6b7280' : '#166534',
                    background: t.status === 'ARCHIVED' ? '#f3f4f6' : '#dcfce7',
                    padding: '4px 10px',
                    borderRadius: 3,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {t.status === 'ARCHIVED' ? 'Arhiveeritud' : 'Lõpetatud'}
                  </span>
                </Link>
              );
            })}
          </div>
        </ArchivedSection>
      )}

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
