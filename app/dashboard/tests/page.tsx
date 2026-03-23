import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { TestStatus } from '@/lib/generated/prisma/client';

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

export default async function TestsPage() {
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

  const tests = await db.test.findMany({
    where: { teacherId: teacherProfile.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      subject: true,
      _count: { select: { results: true } },
    },
  });

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', margin: 0 }}>Kontrolltööd</h1>
          <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.6, marginTop: 4 }}>
            {tests.length === 0 ? 'Ühtegi kontrolltööd pole veel lisatud' : `${tests.length} kontrolltöö`}
          </p>
        </div>
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

      {tests.length === 0 ? (
        <div
          style={{
            background: '#F8F3DA',
            border: '2px dashed #DAD0A1',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 16, color: '#1C2832', marginBottom: 16 }}>
            Alusta oma esimese kontrolltöö lisamisega
          </p>
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
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tests.map((test) => {
            const statusColor = STATUS_COLORS[test.status as TestStatus];
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
                      <span style={{ fontSize: 12, color: '#1C2832', opacity: 0.5 }}>
                        {test._count.results} tulemust
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
