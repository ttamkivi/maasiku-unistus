import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';

const PAGE_SIZE = 50;

const ACTION_BADGE: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  CONSENT_APPROVED: { label: 'Nõusolek antud', bg: '#DCFCE7', color: '#166534', border: '#86EFAC' },
  CONSENT_DECLINED: { label: 'Keeldumine', bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
  CONSENT_REQUESTED: { label: 'Nõusolek saadetud', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  LOGIN: { label: 'Sisselogimine', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  LOGOUT: { label: 'Väljalogmine', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  USER_CREATED: { label: 'Kasutaja loodud', bg: '#DCFCE7', color: '#166534', border: '#86EFAC' },
  USER_DELETED: { label: 'Kasutaja kustutatud', bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
  DATA_DELETED: { label: 'Andmed kustutatud', bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
  DATA_ACCESSED: { label: 'Andmed vaadatud', bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
  ANALYSIS_CREATED: { label: 'Analüüs loodud', bg: '#DCFCE7', color: '#166534', border: '#86EFAC' },
  ANALYSIS_DELETED: { label: 'Analüüs kustutatud', bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
};

function getBadge(action: string) {
  if (ACTION_BADGE[action]) return ACTION_BADGE[action];
  // Heuristic coloring for unknown actions
  if (action.includes('DELETE') || action.includes('DECLINED') || action.includes('REMOVED')) {
    return { label: action, bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' };
  }
  if (action.includes('LOGIN') || action.includes('ACCESS')) {
    return { label: action, bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
  }
  if (action.includes('APPROVED') || action.includes('CREATED') || action.includes('ADDED')) {
    return { label: action, bg: '#DCFCE7', color: '#166534', border: '#86EFAC' };
  }
  return { label: action, bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' };
}

function formatTimestamp(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;

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

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [total, logsRaw] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  type AuditLogRow = (typeof logsRaw)[number];
  const logs: AuditLogRow[] = logsRaw;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div
        style={{
          background: '#fff',
          boxShadow: '0 2px 16px rgba(28,40,50,0.08)',
          borderRadius: 8,
          padding: '36px 32px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Link
            href="/admin"
            style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}
          >
            ← Admin paneel
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginTop: 4 }}>
            Audit logi
          </h1>
          <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, marginTop: 2 }}>
            {total} kirjet kokku · leht {page}/{totalPages || 1}
          </p>
        </div>

        {logs.length === 0 ? (
          <p style={{ color: '#1C2832', opacity: 0.5, fontSize: 14, padding: '24px 0' }}>
            Logisid ei leitud.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #DAD0A1' }}>
                  {['Aeg', 'Tegevus', 'Kasutaja', 'Sihtmärk', 'IP-aadress'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        fontWeight: 700,
                        color: '#1C2832',
                        whiteSpace: 'nowrap',
                        fontSize: 13,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const badge = getBadge(log.action);
                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid #F0EDD6',
                        background: i % 2 === 0 ? '#fff' : '#FDFAF0',
                        verticalAlign: 'top',
                      }}
                    >
                      {/* Timestamp */}
                      <td
                        style={{
                          padding: '11px 12px',
                          color: '#1C2832',
                          opacity: 0.7,
                          whiteSpace: 'nowrap',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatTimestamp(log.timestamp)}
                      </td>

                      {/* Action badge */}
                      <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            fontWeight: 700,
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 10,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* User */}
                      <td style={{ padding: '11px 12px', color: '#1C2832' }}>
                        {log.user ? (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{log.user.name}</div>
                            <div style={{ fontSize: 11, opacity: 0.6 }}>{log.user.email}</div>
                          </div>
                        ) : (
                          <span style={{ opacity: 0.4, fontSize: 12 }}>—</span>
                        )}
                      </td>

                      {/* Target */}
                      <td style={{ padding: '11px 12px', color: '#1C2832', opacity: 0.75 }}>
                        {log.targetType ? (
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 12 }}>{log.targetType}</span>
                            {(() => {
                              // Try to extract human-readable name from details JSON
                              let label: string | null = null;
                              if (log.details) {
                                try {
                                  const d = JSON.parse(log.details as string);
                                  label = d.name ?? d.email ?? d.title ?? null;
                                } catch {}
                              }
                              if (label) {
                                return <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{label}</div>;
                              }
                              if (log.targetId) {
                                return (
                                  <div style={{ fontSize: 11, opacity: 0.45, fontFamily: 'monospace', marginTop: 2 }}>
                                    {log.targetId.slice(0, 8)}…
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : (
                          <span style={{ opacity: 0.4, fontSize: 12 }}>—</span>
                        )}
                      </td>

                      {/* IP */}
                      <td
                        style={{
                          padding: '11px 12px',
                          color: '#1C2832',
                          opacity: 0.6,
                          fontFamily: 'monospace',
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {log.ipAddress ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              marginTop: 24,
              flexWrap: 'wrap',
            }}
          >
            {page > 1 && (
              <Link
                href={`/admin/audit?page=${page - 1}`}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '7px 16px',
                  borderRadius: 4,
                  textDecoration: 'none',
                  background: '#F8F3DA',
                  color: '#1C2832',
                  border: '1.5px solid #DAD0A1',
                }}
              >
                ← Eelmine
              </Link>
            )}
            <span
              style={{
                fontSize: 13,
                padding: '7px 12px',
                color: '#1C2832',
                opacity: 0.6,
              }}
            >
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/admin/audit?page=${page + 1}`}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '7px 16px',
                  borderRadius: 4,
                  textDecoration: 'none',
                  background: '#F8F3DA',
                  color: '#1C2832',
                  border: '1.5px solid #DAD0A1',
                }}
              >
                Järgmine →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
