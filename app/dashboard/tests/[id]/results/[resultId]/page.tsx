import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { ResultStatus } from '@/lib/generated/prisma/client';
import { FeedbackData } from '@/lib/types';
import ResultReviewClient from './ResultReviewClient';

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

const LIFECYCLE: ResultStatus[] = [
  'PENDING',
  'UPLOADED',
  'ANALYZING',
  'DRAFT',
  'REVIEWED',
  'EDITED',
  'APPROVED',
  'SHARED',
];

export default async function ResultReviewPage({
  params,
}: {
  params: Promise<{ id: string; resultId: string }>;
}) {
  const { id, resultId } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });

  if (!session || session.expiresAt < new Date() || !session.user.teacherProfile) {
    redirect('/auth/login');
  }

  const teacherProfile = session.user.teacherProfile;

  const result = await db.testResult.findFirst({
    where: {
      id: resultId,
      testId: id,
      test: { teacherId: teacherProfile.id },
    },
    include: {
      test: { include: { subject: true } },
      trainingConsent: true,
    },
  });

  if (!result) notFound();

  // ── Compute next/prefetch result IDs for the review queue ──────────────────
  // 1. All results for this test ordered by creation
  const allResults = await db.testResult.findMany({
    where: { testId: id },
    select: { id: true, studentName: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  // 2. Build set of consented student names
  const teacherSchools = await db.teacherSchool.findMany({
    where: { teacherId: teacherProfile.id },
    select: { schoolId: true },
  });
  const schoolIds = teacherSchools.map((ts) => ts.schoolId);

  const schoolStudents = await db.studentProfile.findMany({
    where: { schoolId: { in: schoolIds } },
    include: {
      user: { select: { name: true } },
      consentGrants: {
        where: {
          status: 'ACTIVE',
          OR: [
            { subjectId: result.test.subjectId ?? undefined },
            { subjectId: null },
          ],
        },
        select: { id: true },
      },
    },
  });

  const consentedNames = new Set(
    schoolStudents
      .filter((s) => s.consentGrants.length > 0)
      .map((s) => s.user.name.trim().toLowerCase())
  );

  // 3. All consented results in order (any status) — for position tracking
  // Fall back to ALL results if no consent data is set up yet
  const consentedQueue = allResults.filter((r) =>
    consentedNames.size > 0
      ? consentedNames.has((r.studentName ?? '').trim().toLowerCase())
      : true
  );

  const currentIdx = consentedQueue.findIndex((r) => r.id === resultId);

  // Next = first result after current that is not yet shared/archived
  const nextResult =
    currentIdx >= 0
      ? consentedQueue.slice(currentIdx + 1).find((r) => !['SHARED', 'ARCHIVED'].includes(r.status)) ?? null
      : null;

  // Prefetch = first UPLOADED result after next (for background analysis)
  const nextIdx = nextResult ? consentedQueue.findIndex((r) => r.id === nextResult.id) : -1;
  const prefetchResult =
    nextIdx >= 0
      ? consentedQueue.slice(nextIdx + 1).find((r) => r.status === 'UPLOADED') ?? null
      : null;

  const nextResultId = nextResult?.id ?? null;
  const prefetchResultId = prefetchResult?.id ?? null;

  // Queue progress: position among not-yet-shared consented results
  const pendingQueue = consentedQueue.filter((r) => !['SHARED', 'ARCHIVED'].includes(r.status));
  // currentIdx in pendingQueue (may differ from consentedQueue index)
  const pendingIdx = pendingQueue.findIndex((r) => r.id === resultId);
  // ──────────────────────────────────────────────────────────────────────────

  const rawFeedback: FeedbackData | null = result.rawFeedback
    ? (() => { try { return JSON.parse(result.rawFeedback); } catch { return null; } })()
    : null;

  const editedFeedback: FeedbackData | null = result.editedFeedback
    ? (() => { try { return JSON.parse(result.editedFeedback); } catch { return null; } })()
    : null;

  const statusColor = RESULT_STATUS_COLORS[result.status as ResultStatus];
  const currentStatusIndex = LIFECYCLE.indexOf(result.status as ResultStatus);

  const hasTrainingConsent = !!result.trainingConsent;
  const isApprovedOrBeyond = ['APPROVED', 'SHARED', 'ARCHIVED'].includes(result.status);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 100 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
        <Link href="/dashboard/tests" style={{ color: '#6b7280', textDecoration: 'underline' }}>Kontrolltööd</Link>
        <span style={{ color: '#d1d5db' }}>&gt;</span>
        <Link href={`/dashboard/tests/${id}`} style={{ color: '#6b7280', textDecoration: 'underline' }}>{result.test.title}</Link>
        <span style={{ color: '#d1d5db' }}>&gt;</span>
        <span style={{ color: '#1C2832' }}>{result.studentName || 'Nimetu õpilane'}</span>
      </div>

      {/* Header */}
      <div style={{ background: '#F8F3DA', padding: '18px 20px', marginBottom: 18, borderBottom: '3px solid #DAD0A1' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C2832', margin: 0 }}>
              {result.studentName || 'Nimetu õpilane'}
            </h1>
            <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.7, marginTop: 4 }}>
              {result.test.title}
              {result.test.subject && ` · ${result.test.subject.name}`}
              {result.test.grade && ` · ${result.test.grade}. klass`}
            </p>
            {(result.score != null || result.maxScore != null) && (
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1C2832', marginTop: 6 }}>
                {result.score != null ? result.score : '?'}
                {result.maxScore != null ? ` / ${result.maxScore} punkti` : ' punkti'}
              </p>
            )}
          </div>
          <span
            style={{
              background: statusColor.bg,
              color: statusColor.color,
              fontSize: 12,
              fontWeight: 700,
              padding: '4px 12px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {RESULT_STATUS_LABELS[result.status as ResultStatus]}
          </span>
        </div>
      </div>

      {/* Status lifecycle bar */}
      <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {LIFECYCLE.map((step, i) => {
            const isDone = i < currentStatusIndex;
            const isCurrent = i === currentStatusIndex;
            const isFuture = i > currentStatusIndex;
            return (
              <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {i > 0 && (
                  <div style={{
                    position: 'absolute', top: 9, left: '-50%', right: '50%', height: 2,
                    background: isDone || isCurrent ? '#1C2832' : '#DAD0A1', zIndex: 0,
                  }} />
                )}
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: isCurrent ? '#1C2832' : isDone ? '#DAD0A1' : '#F8F3DA',
                  border: `2px solid ${isCurrent ? '#1C2832' : isDone ? '#1C2832' : '#DAD0A1'}`,
                  zIndex: 1, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isDone && <span style={{ fontSize: 9, color: '#1C2832', fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{
                  fontSize: 9, fontWeight: isCurrent ? 700 : 400,
                  color: isFuture ? '#9ca3af' : '#1C2832',
                  marginTop: 4, textAlign: 'center', lineHeight: 1.2,
                }}>
                  {RESULT_STATUS_LABELS[step]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main interactive content */}
      <ResultReviewClient
        testId={id}
        resultId={resultId}
        status={result.status as ResultStatus}
        rawFeedback={rawFeedback}
        editedFeedback={editedFeedback}
        teacherNotes={result.teacherNotes ?? ''}
        teacherComment={result.teacherComment ?? ''}
        hasTrainingConsent={hasTrainingConsent}
        isApprovedOrBeyond={isApprovedOrBeyond}
        nextResultId={nextResultId}
        prefetchResultId={prefetchResultId}
        queuePosition={pendingIdx >= 0 ? pendingIdx + 1 : null}
        queueTotal={pendingQueue.length}
      />
    </div>
  );
}
