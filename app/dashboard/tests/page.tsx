import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { TestStatus, ResultStatus } from '@/lib/generated/prisma/client';

const STATUS_LABELS: Record<TestStatus, string> = {
  PREPARING: 'Ettevalmistamine',
  READY: 'Valmis',
  DISTRIBUTED: 'Jagatud',
  COLLECTING: 'Kogumine',
  PROCESSING: 'Töötlemisel',
  COMPLETE: 'Lõpetatud',
  ARCHIVED: 'Arhiveeritud',
};

const STATUS_COLORS: Record<TestStatus, { bg: string; color: string }> = {
  PREPARING: { bg: '#e5e7eb', color: '#374151' },
  READY: { bg: '#dbeafe', color: '#1d4ed8' },
  DISTRIBUTED: { bg: '#fed7aa', color: '#c2410c' },
  COLLECTING: { bg: '#fef08a', color: '#854d0e' },
  PROCESSING: { bg: '#e9d5ff', color: '#6d28d9' },
  COMPLETE: { bg: '#bbf7d0', color: '#15803d' },
  ARCHIVED: { bg: '#f3f4f6', color: '#9ca3af' },
};

// Map query param to result statuses and display label
const RESULT_FILTERS: Record<string, { statuses: ResultStatus[]; label: string; color: string }> = {
  analyzed: {
    statuses: ['DRAFT', 'REVIEWED', 'EDITED', 'APPROVED', 'SHARED', 'ARCHIVED'],
    label: 'Analüüsitud',
    color: '#DAD0A1',
  },
  pending: {
    statuses: ['DRAFT', 'REVIEWED'],
    label: 'Ülevaatust ootab',
    color: '#f97316',
  },
  shared: {
    statuses: ['SHARED'],
    label: 'Jagatud',
    color: '#22c55e',
  },
};

export default async function TestsPage({
  searchParams,
}: {
  searchParams: Promise<{ results?: string }>;
}) {
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
  const params = await searchParams;
  const resultFilter = params.results && RESULT_FILTERS[params.results] ? params.results : null;
  const filterDef = resultFilter ? RESULT_FILTERS[resultFilter] : null;

  const tests = await db.test.findMany({
    where: { teacherId: teacherProfile.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      subject: true,
      results: { select: { id: true, status: true } },
      _count: { select: { results: true } },
    },
  });

  // Apply result-status filter: show only tests that have results matching the filter
  const filteredTests = filterDef
    ? tests.filter((t) =>
        t.results.some((r) => filterDef.statuses.includes(r.status as ResultStatus))
      )
    : tests;

  // Count matching results per test (for display when filtered)
  const matchingResultCount = (test: typeof tests[0]) => {
    if (!filterDef) return test._count.results;
    return test.results.filter((r) => filterDef.statuses.includes(r.status as ResultStatus)).length;
  };

  const pageTitle = filterDef ? filterDef.label : 'Kontrolltööd';
  const pageSubtitle = filterDef
    ? `${filteredTests.reduce((sum, t) => sum + matchingResultCount(t), 0)} tulemust ${filteredTests.length} kontrolltöös`
    : tests.length === 0
      ? 'Ühtegi kontrolltööd pole veel lisatud'
      : `${tests.length} kontrolltöö`;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', margin: 0 }}>{pageTitle}</h1>
            {filterDef && (
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: filterDef.color, flexShrink: 0 }} />
            )}
          </div>
          <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.6, marginTop: 4 }}>
            {pageSubtitle}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {resultFilter && (
            <Link
              href="/dashboard/tests"
              style={{
                background: '#f3f4f6',
                color: '#374151',
                fontWeight: 600,
                fontSize: 13,
                padding: '8px 14px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Kõik
            </Link>
          )}
          <Link
            href="/dashboard/tests/new"
            style={{
              background: '#1C2832',
              color: '#F8F3DA',
              fontWeight: 700,
              fontSize: 14,
              padding: '10px 18px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            + Uus kontrolltöö
          </Link>
        </div>
      </div>

      {filteredTests.length === 0 ? (
        <div
          style={{
            background: '#F8F3DA',
            border: '2px dashed #DAD0A1',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 16, color: '#1C2832', marginBottom: 16 }}>
            {resultFilter ? 'Selle filtriga tulemusi ei leitud' : 'Alusta oma esimese kontrolltöö lisamisega'}
          </p>
          {resultFilter ? (
            <Link
              href="/dashboard/tests"
              style={{
                background: '#1C2832',
                color: '#F8F3DA',
                fontWeight: 700,
                fontSize: 14,
                padding: '12px 24px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Vaata kõiki kontrolltöid
            </Link>
          ) : (
            <Link
              href="/dashboard/tests/new"
              style={{
                background: '#1C2832',
                color: '#F8F3DA',
                fontWeight: 700,
                fontSize: 14,
                padding: '12px 24px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              + Uus kontrolltöö
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredTests.map((test) => {
            const statusColor = STATUS_COLORS[test.status as TestStatus];
            const count = matchingResultCount(test);
            return (
              <Link
                key={test.id}
                href={`/dashboard/tests/${test.id}`}
                style={{
                  background: '#fff',
                  border: '1.5px solid #DAD0A1',
                  padding: '16px 18px',
                  textDecoration: 'none',
                  display: 'block',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {test.title}
                    </p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                      {test.subject && (
                        <span style={{ fontSize: 12, color: '#1C2832', opacity: 0.6 }}>{test.subject.name}</span>
                      )}
                      {test.grade && (
                        <span style={{ fontSize: 12, color: '#1C2832', opacity: 0.6 }}>{test.grade}. klass</span>
                      )}
                      {test.plannedDate && (
                        <span style={{ fontSize: 12, color: '#1C2832', opacity: 0.6 }}>
                          {new Date(test.plannedDate).toLocaleDateString('et-EE')}
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: filterDef ? filterDef.color : '#1C2832', opacity: filterDef ? 1 : 0.5, fontWeight: filterDef ? 700 : 400 }}>
                        {count} {filterDef ? filterDef.label.toLowerCase() : 'tulemust'}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      background: statusColor.bg,
                      color: statusColor.color,
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '3px 10px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {STATUS_LABELS[test.status as TestStatus]}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
