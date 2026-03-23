import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { isFeatureEnabled } from '@/lib/features';

const STATUS_LABELS: Record<string, string> = {
  ANALYZING: 'Analüüsimisel',
  FEEDBACK_READY: 'Tagasiside valmis',
  SHARED_WITH_TEACHER: 'Jagatud',
  ARCHIVED: 'Arhiveeritud',
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ANALYZING:          { bg: '#fef9c3', color: '#854d0e' },
  FEEDBACK_READY:     { bg: '#bbf7d0', color: '#15803d' },
  SHARED_WITH_TEACHER:{ bg: '#99f6e4', color: '#0f766e' },
  ARCHIVED:           { bg: '#f3f4f6', color: '#6b7280' },
};

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function ExercisesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { studentProfile: true, teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) redirect('/auth/login');

  const { user } = session;
  const studentId = user.studentProfile?.id;
  const isTeacher = !!user.teacherProfile;

  // Students: see their own exercises; teachers: see shared
  if (!studentId && !isTeacher) redirect('/dashboard');

  const isStudent = !!studentId && !isTeacher;
  if (isStudent) {
    const exercisesEnabled = await isFeatureEnabled('STUDENT_EXERCISES');
    if (!exercisesEnabled) {
      return (
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2832' }}>Harjutused tulemas</h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>See funktsionaalsus pole veel sinu koolis aktiveeritud.</p>
        </div>
      );
    }
  }

  const exercises = await db.exercise.findMany({
    where: studentId
      ? { studentId, status: { not: 'ARCHIVED' } }
      : { status: 'SHARED_WITH_TEACHER' },
    include: { subject: true },
    orderBy: studentId ? { createdAt: 'desc' } : { sharedAt: 'desc' },
    take: 50,
  });

  return (
    <div>
      <div
        className="flex items-center justify-between mb-6"
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832' }}>
            {isTeacher ? 'Jagatud harjutused' : 'Minu harjutused'}
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
            {isTeacher
              ? 'Õpilased on jaganud neid harjutusi sinuga'
              : 'Pildista vihik ja saa kohene AI tagasiside'
            }
          </p>
        </div>
        {!isTeacher && (
          <Link
            href="/dashboard/exercises/new"
            style={{
              background: '#1C2832', color: '#F8F3DA',
              padding: '10px 18px', borderRadius: 4,
              fontSize: 14, fontWeight: 600, textDecoration: 'none',
            }}
          >
            + Uus harjutus
          </Link>
        )}
      </div>

      {exercises.length === 0 ? (
        <div
          style={{
            background: '#F8F3DA', border: '2px dashed #DAD0A1',
            borderRadius: 8, padding: '48px 24px', textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📓</div>
          <p style={{ fontWeight: 600, color: '#1C2832' }}>
            {isTeacher ? 'Ühtegi jagatud harjutust pole' : 'Harjutusi pole veel'}
          </p>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
            {isTeacher
              ? 'Kui õpilased jagavad oma harjutusi, ilmuvad need siia.'
              : 'Pildista oma vihik ja saa kohest tagasisidet oma harjutuste kohta.'
            }
          </p>
          {!isTeacher && (
            <Link
              href="/dashboard/exercises/new"
              style={{
                display: 'inline-block', marginTop: 16,
                background: '#1C2832', color: '#F8F3DA',
                padding: '10px 20px', borderRadius: 4,
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
              }}
            >
              Alusta esimese harjutusega →
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {exercises.map((ex) => {
            const sc = STATUS_COLORS[ex.status] || STATUS_COLORS.FEEDBACK_READY;
            return (
              <Link
                key={ex.id}
                href={`/dashboard/exercises/${ex.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    background: '#fff', border: '1px solid #e5e7eb',
                    borderRadius: 8, padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 24, flexShrink: 0 }}>📓</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, color: '#1C2832', fontSize: 15 }}>{ex.topic}</span>
                      <span
                        style={{
                          background: sc.bg, color: sc.color,
                          fontSize: 11, fontWeight: 700,
                          padding: '2px 8px', borderRadius: 12,
                        }}
                      >
                        {STATUS_LABELS[ex.status]}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      {ex.subject?.name && <span style={{ marginRight: 10 }}>📚 {ex.subject.name}</span>}
                      {ex.grade && <span style={{ marginRight: 10 }}>🎓 {ex.grade}. klass</span>}
                      {isTeacher && ex.studentName && <span style={{ marginRight: 10 }}>👤 {ex.studentName}</span>}
                      <span>📅 {formatDate(ex.createdAt)}</span>
                    </div>
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: 18, flexShrink: 0 }}>›</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
