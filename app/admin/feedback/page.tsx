import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  bug:        { label: 'Viga',      icon: '🐛' },
  suggestion: { label: 'Ettepanek', icon: '💡' },
  praise:     { label: 'Kiitus',    icon: '👏' },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  NEW:      { bg: '#FEF9C3', color: '#854D0E', border: '#FDE68A', label: 'Uus' },
  READ:     { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD', label: 'Loetud' },
  RESOLVED: { bg: '#DCFCE7', color: '#166534', border: '#86EFAC', label: 'Lahendatud' },
};

function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) redirect('/auth/login');
  if (session.user.role !== 'SUPERADMIN' && session.user.role !== 'SCHOOL_ADMIN') redirect('/dashboard');

  const params = await searchParams;
  const statusFilter = params.status || '';

  const where: Record<string, unknown> = {};
  if (statusFilter) where.status = statusFilter;

  const feedbacks = await db.userFeedback.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true, role: true } },
    },
    take: 200,
  });

  const counts = {
    all: await db.userFeedback.count(),
    NEW: await db.userFeedback.count({ where: { status: 'NEW' } }),
    READ: await db.userFeedback.count({ where: { status: 'READ' } }),
    RESOLVED: await db.userFeedback.count({ where: { status: 'RESOLVED' } }),
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin" style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}>
          ← Admin
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginTop: 4 }}>
          Tagasiside
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
          Kasutajate tagasiside ({counts.all} kokku, {counts.NEW} uut)
        </p>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <Link
          href="/admin/feedback"
          style={{
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: !statusFilter ? 700 : 500,
            background: !statusFilter ? '#1C2832' : '#fff',
            color: !statusFilter ? '#F8F3DA' : '#1C2832',
            border: '1.5px solid #DAD0A1',
            textDecoration: 'none',
          }}
        >
          Kõik ({counts.all})
        </Link>
        {(['NEW', 'READ', 'RESOLVED'] as const).map((s) => {
          const st = STATUS_STYLES[s];
          const active = statusFilter === s;
          return (
            <Link
              key={s}
              href={`/admin/feedback?status=${s}`}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                background: active ? st.bg : '#fff',
                color: active ? st.color : '#1C2832',
                border: active ? `1.5px solid ${st.border}` : '1.5px solid #DAD0A1',
                textDecoration: 'none',
              }}
            >
              {st.label} ({counts[s]})
            </Link>
          );
        })}
      </div>

      {/* Feedback list */}
      {feedbacks.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 15 }}>
          Tagasisidet ei ole veel.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feedbacks.map((fb) => {
            const typeInfo = TYPE_LABELS[fb.type] || { label: fb.type, icon: '📋' };
            const statusInfo = STATUS_STYLES[fb.status] || STATUS_STYLES.NEW;
            return (
              <div
                key={fb.id}
                style={{
                  border: '1.5px solid #DAD0A1',
                  padding: '18px 20px',
                  background: fb.status === 'NEW' ? '#FFFEF5' : '#fff',
                }}
              >
                {/* Top row: type + status + date */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{typeInfo.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1C2832' }}>{typeInfo.label}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        background: statusInfo.bg,
                        color: statusInfo.color,
                        border: `1px solid ${statusInfo.border}`,
                        padding: '2px 8px',
                        borderRadius: 10,
                      }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    {formatDate(fb.createdAt)}
                  </span>
                </div>

                {/* User */}
                {fb.user && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                    {fb.user.name} ({fb.user.email}) · {fb.user.role}
                  </div>
                )}

                {/* Message */}
                <div style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                  {fb.message}
                </div>

                {/* Page */}
                {fb.page && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                    Leht: {fb.page}
                  </div>
                )}

                {/* Screenshot */}
                {fb.screenshotUrl && (
                  <div style={{ marginTop: 8 }}>
                    <a href={fb.screenshotUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={fb.screenshotUrl}
                        alt="Ekraanipilt"
                        style={{
                          maxWidth: '100%',
                          maxHeight: 300,
                          border: '1.5px solid #DAD0A1',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      />
                    </a>
                  </div>
                )}

                {/* Admin actions */}
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  {fb.status === 'NEW' && (
                    <form action={`/api/feedback/${fb.id}/status`} method="POST">
                      <input type="hidden" name="status" value="READ" />
                      <button
                        type="submit"
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '4px 10px',
                          background: '#DBEAFE',
                          color: '#1E40AF',
                          border: '1px solid #93C5FD',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        Märgi loetuks
                      </button>
                    </form>
                  )}
                  {fb.status !== 'RESOLVED' && (
                    <form action={`/api/feedback/${fb.id}/status`} method="POST">
                      <input type="hidden" name="status" value="RESOLVED" />
                      <button
                        type="submit"
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '4px 10px',
                          background: '#DCFCE7',
                          color: '#166534',
                          border: '1px solid #86EFAC',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        Lahendatud
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
