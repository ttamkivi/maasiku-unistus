import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import AssignmentPublishButton from './AssignmentPublishButton';

const SUB_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ootel',
  SUBMITTED: 'Esitatud',
  ANALYZING: 'Analüüsimisel',
  FEEDBACK_READY: 'Tagasiside valmis',
  SHARED_WITH_TEACHER: 'Jagatud õpetajale',
  ARCHIVED: 'Arhiveeritud',
};

const SUB_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: '#f3f4f6', color: '#6b7280' },
  SUBMITTED: { bg: '#dbeafe', color: '#1d4ed8' },
  ANALYZING: { bg: '#ede9fe', color: '#6d28d9' },
  FEEDBACK_READY: { bg: '#fef08a', color: '#854d0e' },
  SHARED_WITH_TEACHER: { bg: '#bbf7d0', color: '#15803d' },
  ARCHIVED: { bg: '#e5e7eb', color: '#4b5563' },
};

function formatDate(d: Date | string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const assignment = await db.assignment.findUnique({
    where: { id },
    include: {
      teacher: { include: { user: true } },
      subject: true,
      submissions: {
        include: { student: { include: { user: true } }, photos: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!assignment || assignment.deletedAt) redirect('/dashboard/assignments');

  // Student: redirect to their submission if it exists, else show assignment
  if (isStudent) {
    const mySubmission = assignment.submissions.find(s => s.studentId === user.studentProfile!.id);
    if (mySubmission) {
      redirect(`/dashboard/assignments/${id}/submissions/${mySubmission.id}`);
    }
    // Show assignment for student to start
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <Link href="/dashboard/assignments" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none' }}>← Tagasi</Link>

        <div style={{ marginTop: 16, background: '#F8F3DA', border: '1px solid #DAD0A1', borderRadius: 8, padding: 24 }}>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, letterSpacing: 1 }}>KODUTÖÖ</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginTop: 4 }}>{assignment.title}</h1>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
            {assignment.subject?.name && <span style={{ marginRight: 12 }}>📚 {assignment.subject.name}</span>}
            <span>👤 {assignment.teacher.user.name}</span>
            {assignment.dueDate && <span style={{ marginLeft: 12 }}>📅 Tähtaeg: {formatDate(assignment.dueDate)}</span>}
          </div>
        </div>

        <div style={{ marginTop: 20, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', marginBottom: 12 }}>Ülesanne</h2>
          <div style={{ fontSize: 15, color: '#1C2832', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {assignment.description}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <Link
            href={`/dashboard/assignments/${id}/submit`}
            style={{
              display: 'block',
              background: '#1C2832',
              color: '#F8F3DA',
              padding: '16px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            📸 Esita kodutöö
          </Link>
          <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 8 }}>
            Pildista oma vihik ja saa kohe AI tagasiside
          </p>
        </div>
      </div>
    );
  }

  // Teacher view
  if (!isTeacher || assignment.teacher.userId !== user.id) {
    redirect('/dashboard');
  }

  const sharedCount = assignment.submissions.filter(s => s.status === 'SHARED_WITH_TEACHER').length;
  const feedbackCount = assignment.submissions.filter(s => ['FEEDBACK_READY', 'SHARED_WITH_TEACHER'].includes(s.status)).length;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard/assignments" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none' }}>← Kõik kodutööd</Link>
      </div>

      {/* Header */}
      <div style={{ background: '#F8F3DA', border: '1px solid #DAD0A1', borderRadius: 8, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, letterSpacing: 1 }}>KODUTÖÖ</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginTop: 4 }}>{assignment.title}</h1>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              {assignment.subject?.name && <span style={{ marginRight: 12 }}>📚 {assignment.subject.name}</span>}
              {assignment.grade && <span style={{ marginRight: 12 }}>🎓 {assignment.grade}. klass</span>}
              {assignment.dueDate && <span>📅 Tähtaeg: {formatDate(assignment.dueDate)}</span>}
            </div>
          </div>
          <AssignmentPublishButton
            assignmentId={assignment.id}
            currentStatus={assignment.status}
          />
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1C2832' }}>{assignment.submissions.length}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>esitust</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#854d0e' }}>{feedbackCount}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>tagasisidet</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#15803d' }}>{sharedCount}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>jagatud</div>
          </div>
        </div>
      </div>

      {/* Task text */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>Ülesande tekst</h2>
        <div style={{ fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          {assignment.description}
        </div>
      </div>

      {/* Submissions list */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', marginBottom: 12 }}>
        Esitused ({assignment.submissions.length})
      </h2>

      {assignment.submissions.length === 0 ? (
        <div style={{ background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 8, padding: '32px 24px', textAlign: 'center', color: '#6b7280' }}>
          Ühtegi esitust pole veel.
          {assignment.status === 'DRAFT' && (
            <div style={{ marginTop: 8, fontSize: 13 }}>
              Avalda kodutöö, et õpilased saaksid esitada.
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {assignment.submissions.map(sub => {
            const sc = SUB_STATUS_COLORS[sub.status] || SUB_STATUS_COLORS.PENDING;
            return (
              <Link
                key={sub.id}
                href={`/dashboard/assignments/${id}/submissions/${sub.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#F8F3DA',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, color: '#1C2832',
                    flexShrink: 0,
                  }}>
                    {(sub.studentName || sub.student?.user?.name || '?')[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#1C2832', fontSize: 14 }}>
                      {sub.studentName || sub.student?.user?.name || 'Nimetu'}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {formatDate(sub.createdAt)} · {sub.photos.length} foto
                    </div>
                  </div>
                  <span style={{
                    background: sc.bg,
                    color: sc.color,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 12,
                  }}>{SUB_STATUS_LABELS[sub.status]}</span>
                  <span style={{ color: '#9ca3af' }}>›</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
