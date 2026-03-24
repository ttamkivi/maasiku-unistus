import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Mustand',
  PUBLISHED: 'Avaldatud',
  CLOSED: 'Suletud',
  ARCHIVED: 'Arhiveeritud',
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#f3f4f6', color: '#6b7280' },
  PUBLISHED: { bg: '#bbf7d0', color: '#15803d' },
  CLOSED: { bg: '#fef08a', color: '#854d0e' },
  ARCHIVED: { bg: '#e5e7eb', color: '#4b5563' },
};

function formatDate(d: Date | string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function AssignmentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true, studentProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) redirect('/auth/login');

  const { user } = session;
  const isTeacher = !!user.teacherProfile;
  const isStudent = !!user.studentProfile;

  // Teacher: see their own assignments
  if (isTeacher) {
    const assignments = await db.assignment.findMany({
      where: { teacherId: user.teacherProfile!.id, deletedAt: null },
      include: {
        subject: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832' }}>Kodutööd</h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>Loo ja halda kodutöö ülesandeid</p>
          </div>
          <Link
            href="/dashboard/assignments/new"
            style={{
              background: '#1C2832',
              color: '#F8F3DA',
              padding: '10px 18px',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            + Uus kodutöö
          </Link>
        </div>

        {assignments.length === 0 ? (
          <div style={{
            background: '#F8F3DA',
            border: '2px dashed #DAD0A1',
            borderRadius: 8,
            padding: '48px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <p style={{ fontWeight: 600, color: '#1C2832' }}>Kodutöid pole veel</p>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
              Loo esimene kodutöö ülesanne, mida õpilased saavad lahendada ja AI tagasiside saada.
            </p>
            <Link
              href="/dashboard/assignments/new"
              style={{
                display: 'inline-block',
                marginTop: 16,
                background: '#1C2832',
                color: '#F8F3DA',
                padding: '10px 20px',
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Loo kodutöö
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {assignments.map((a) => {
              const sc = STATUS_COLORS[a.status] || STATUS_COLORS.DRAFT;
              return (
                <Link
                  key={a.id}
                  href={`/dashboard/assignments/${a.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    cursor: 'pointer',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#DAD0A1')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#1C2832', fontSize: 15 }}>{a.title}</span>
                        <span style={{
                          background: sc.bg,
                          color: sc.color,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 12,
                        }}>{STATUS_LABELS[a.status]}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                        {a.subject?.name && <span style={{ marginRight: 12 }}>📚 {a.subject.name}</span>}
                        {a.grade && <span style={{ marginRight: 12 }}>🎓 {a.grade}. klass</span>}
                        {a.dueDate && <span style={{ marginRight: 12 }}>📅 Tähtaeg: {formatDate(a.dueDate)}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#1C2832' }}>{a._count.submissions}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>vastust</div>
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: 18 }}>›</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Student: see published assignments for their school/grade
  if (isStudent) {
    const student = user.studentProfile!;
    const assignments = await db.assignment.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        OR: [
          { schoolId: student.schoolId },
          { schoolId: null },
        ],
      },
      include: {
        teacher: { include: { user: true } },
        subject: true,
        submissions: {
          where: { studentId: student.id },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832' }}>Kodutööd</h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>Lahenda ülesandeid ja saa AI tagasisidet</p>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6b7280' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ fontWeight: 600 }}>Aktiivseid kodutöid pole</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {assignments.map((a) => {
              const mySubmission = a.submissions[0];
              const done = mySubmission && mySubmission.status !== 'PENDING';
              return (
                <Link
                  key={a.id}
                  href={mySubmission ? `/dashboard/assignments/${a.id}/submissions/${mySubmission.id}` : `/dashboard/assignments/${a.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    background: '#fff',
                    border: `2px solid ${done ? '#bbf7d0' : '#e5e7eb'}`,
                    borderRadius: 8,
                    padding: '16px 20px',
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1C2832', fontSize: 15 }}>{a.title}</div>
                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                          {a.subject?.name && <span style={{ marginRight: 12 }}>📚 {a.subject.name}</span>}
                          <span>👤 {a.teacher.user.name}</span>
                          {a.dueDate && <span style={{ marginLeft: 12 }}>📅 {formatDate(a.dueDate)}</span>}
                        </div>
                        <p style={{ fontSize: 13, color: '#4b5563', marginTop: 8 }}>
                          {a.description.substring(0, 120)}{a.description.length > 120 ? '…' : ''}
                        </p>
                      </div>
                      <div style={{ flexShrink: 0, fontSize: 24 }}>
                        {done ? '✅' : '📋'}
                      </div>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600 }}>
                      {done
                        ? <span style={{ color: '#15803d' }}>Esitatud — vaata tagasisidet →</span>
                        : <span style={{ color: '#1C2832' }}>Lahenda kodutöö →</span>
                      }
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  redirect('/dashboard');
}
