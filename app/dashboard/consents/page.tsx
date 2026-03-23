import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ootel',
  APPROVED: 'Heaks kiidetud',
  DECLINED: 'Keeldutud',
  EXPIRED: 'Aegunud',
};

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  PENDING: { bg: '#FEF9C3', color: '#854D0E', border: '#FDE68A' },
  APPROVED: { bg: '#DCFCE7', color: '#166534', border: '#86EFAC' },
  DECLINED: { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
  EXPIRED: { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
};

function formatDate(date: Date | null): string {
  if (!date) return '—';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export default async function ConsentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;

  if (!token) {
    redirect('/auth/login');
  }

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    redirect('/auth/login');
  }

  if (session.user.role !== 'TEACHER') {
    redirect('/dashboard');
  }

  const teacherProfile = await db.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!teacherProfile) {
    redirect('/dashboard');
  }

  // Mark expired requests
  await db.parentConsentRequest.updateMany({
    where: {
      teacherId: teacherProfile.id,
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  });

  const requestsRaw = await db.parentConsentRequest.findMany({
    where: { teacherId: teacherProfile.id },
    orderBy: { sentAt: 'desc' },
    include: {
      student: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
    },
  });
  type ConsentRequestRow = (typeof requestsRaw)[number];
  const requests: ConsentRequestRow[] = requestsRaw;

  const canReinvite = (status: string) => status === 'EXPIRED' || status === 'DECLINED';

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 28,
          }}
        >
          <div>
            <Link
              href="/dashboard"
              style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}
            >
              ← Töölaud
            </Link>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginTop: 4 }}>
              Nõusolekud
            </h1>
            <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, marginTop: 2 }}>
              Saadetud lapsevanema nõusolekutaotlused ({requests.length})
            </p>
          </div>
        </div>

        {requests.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 0',
              color: '#1C2832',
              opacity: 0.5,
              fontSize: 14,
            }}
          >
            <p>Ühtegi nõusolekutaotlust ei ole veel saadetud.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map((req) => {
              const colors = STATUS_COLORS[req.status] ?? STATUS_COLORS.EXPIRED;
              return (
                <div
                  key={req.id}
                  style={{
                    border: '1.5px solid #DAD0A1',
                    borderRadius: 8,
                    padding: '20px 22px',
                    background: '#FDFAF0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 16,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {/* Student info */}
                      <div style={{ marginBottom: 10 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#1C2832',
                            opacity: 0.5,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Õpilane
                        </span>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: '#1C2832',
                            marginTop: 2,
                          }}
                        >
                          {req.student.user.name}
                        </div>
                        <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.65 }}>
                          {req.student.user.email}
                        </div>
                      </div>

                      {/* Parent info */}
                      <div style={{ marginBottom: 10 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#1C2832',
                            opacity: 0.5,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Lapsevanem
                        </span>
                        <div style={{ fontSize: 13, color: '#1C2832', opacity: 0.8, marginTop: 2 }}>
                          {req.parentName ? `${req.parentName} — ` : ''}
                          {req.parentEmail}
                        </div>
                      </div>

                      {/* Dates */}
                      <div
                        style={{
                          display: 'flex',
                          gap: 20,
                          fontSize: 12,
                          color: '#1C2832',
                          opacity: 0.6,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>Saadetud: {formatDate(req.sentAt)}</span>
                        {req.respondedAt && (
                          <span>Vastatud: {formatDate(req.respondedAt)}</span>
                        )}
                        {req.status === 'PENDING' && (
                          <span>Aegub: {formatDate(req.expiresAt)}</span>
                        )}
                      </div>

                      {req.declineReason && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 13,
                            color: '#991B1B',
                            background: '#FEE2E2',
                            padding: '6px 10px',
                            borderRadius: 4,
                            border: '1px solid #FCA5A5',
                          }}
                        >
                          Keeldumise põhjus: {req.declineReason}
                        </div>
                      )}
                    </div>

                    {/* Status + action */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 10,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          background: colors.bg,
                          color: colors.color,
                          border: `1px solid ${colors.border}`,
                          fontWeight: 700,
                          fontSize: 12,
                          padding: '4px 12px',
                          borderRadius: 12,
                        }}
                      >
                        {STATUS_LABELS[req.status]}
                      </span>

                      {canReinvite(req.status) && (
                        <a
                          href={`/api/consent/request?reinvite=${req.id}`}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#1C2832',
                            background: '#F8F3DA',
                            border: '1.5px solid #DAD0A1',
                            borderRadius: 4,
                            padding: '6px 12px',
                            textDecoration: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Kutsu uuesti
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
