import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function StudentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: { include: { schools: true, subjects: { include: { subject: true } } } } } } },
  });
  if (!session || session.expiresAt < new Date()) redirect('/auth/login');

  const { user } = session;
  if (!user.teacherProfile) redirect('/dashboard');

  const teacher = user.teacherProfile;

  // Fetch all schools this teacher belongs to, with their students
  const teacherSchools = await db.teacherSchool.findMany({
    where: { teacherId: teacher.id },
    include: {
      school: {
        include: {
          students: {
            include: {
              user: { select: { name: true, email: true } },
              subjectConsents: {
                where: { status: 'ACTIVE' },
                select: { scope: true, startDate: true },
              },
              klassijuhatajRecord: {
                include: { eligibility: true },
              },
            },
            orderBy: [{ grade: 'asc' }, { class: 'asc' }],
          },
        },
      },
    },
  });

  // Group students by school → class
  type StudentRow = (typeof teacherSchools)[number]['school']['students'][number];
  type ClassGroup = { className: string; grade: number | null; students: StudentRow[] };
  type SchoolGroup = { schoolName: string; schoolId: string; classes: ClassGroup[] };

  const schoolGroups: SchoolGroup[] = teacherSchools.map(({ school }) => {
    const classMap = new Map<string, ClassGroup>();
    for (const student of school.students) {
      const key = student.class ?? '—';
      if (!classMap.has(key)) {
        classMap.set(key, { className: key, grade: student.grade, students: [] });
      }
      classMap.get(key)!.students.push(student);
    }
    // Sort classes: by grade asc, then alphabetically
    const classes = Array.from(classMap.values()).sort((a, b) => {
      const ga = a.grade ?? 999;
      const gb = b.grade ?? 999;
      if (ga !== gb) return ga - gb;
      return a.className.localeCompare(b.className, 'et');
    });
    return { schoolName: school.name, schoolId: school.id, classes };
  });

  const card = {
    background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)' as const,
    borderRadius: 8,
    padding: '20px 24px',
    marginBottom: 24,
  };

  const totalStudents = schoolGroups.reduce(
    (n, sg) => n + sg.classes.reduce((m, cg) => m + cg.students.length, 0),
    0
  );
  const withConsent = schoolGroups.reduce(
    (n, sg) =>
      n +
      sg.classes.reduce(
        (m, cg) => m + cg.students.filter((s) => s.subjectConsents.length > 0).length,
        0
      ),
    0
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginBottom: 4 }}>Minu õpilased</h1>
        <p style={{ fontSize: 14, color: '#6b7280' }}>
          {totalStudents} õpilast · {withConsent} AI analüüsi nõusolekuga
        </p>
      </div>

      {schoolGroups.length === 0 && (
        <div style={{ background: '#F8F3DA', border: '2px dashed #DAD0A1', borderRadius: 8, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏫</div>
          <p style={{ fontWeight: 600, color: '#1C2832' }}>Ühtegi kooli pole lisatud</p>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Õpilased ilmuvad siia, kui Sind on kooli õpetajaks lisatud.</p>
        </div>
      )}

      {schoolGroups.map((sg) => (
        <div key={sg.schoolId} style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C2832', marginBottom: 20 }}>
            🏫 {sg.schoolName}
          </h2>

          {sg.classes.length === 0 && (
            <p style={{ fontSize: 14, color: '#6b7280' }}>Selles koolis pole õpilasi.</p>
          )}

          {sg.classes.map((cg) => (
            <div key={cg.className} style={{ marginBottom: 24 }}>
              {/* Class header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                paddingBottom: 8, borderBottom: '2px solid #F8F3DA',
              }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#1C2832' }}>
                  {cg.className === '—' ? 'Klass määramata' : cg.className}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: '#F8F3DA', color: '#6b7280',
                }}>
                  {cg.students.length} õpilast
                </span>
              </div>

              {/* Student rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cg.students.map((student) => {
                  const hasConsent = student.subjectConsents.length > 0;
                  const isEligible = student.klassijuhatajRecord?.eligibility?.isEligible ?? false;
                  const aiReady = hasConsent && isEligible;

                  return (
                    <div
                      key={student.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        borderRadius: 6,
                        background: '#fafafa',
                        border: '1px solid #f0f0f0',
                      }}
                    >
                      {/* AI consent indicator */}
                      <div
                        title={aiReady ? 'AI analüüs lubatud' : hasConsent ? 'Nõusolek on, KJ kinnitus puudub' : 'AI nõusolek puudub'}
                        style={{
                          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                          background: aiReady ? '#16a34a' : hasConsent ? '#f97316' : '#d1d5db',
                        }}
                      />

                      {/* Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>
                          {student.user.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
                          {student.user.email}
                        </div>
                      </div>

                      {/* Consent badge */}
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, flexShrink: 0,
                        background: aiReady ? '#dcfce7' : hasConsent ? '#ffedd5' : '#f3f4f6',
                        color: aiReady ? '#15803d' : hasConsent ? '#c2410c' : '#6b7280',
                      }}>
                        {aiReady ? 'AI ✓' : hasConsent ? 'Ootab KJ' : 'Pole nõus'}
                      </span>

                      {/* Consent date */}
                      {hasConsent && (
                        <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
                          {formatDate(student.subjectConsents[0].startDate)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Subject context */}
          {teacher.subjects.length > 0 && (
            <div style={{ marginTop: 4, paddingTop: 14, borderTop: '1px solid #F8F3DA' }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                Sinu ained: {teacher.subjects.map((s) => s.subject.name).join(', ')}
              </span>
            </div>
          )}
        </div>
      ))}

      {/* Legend */}
      {totalStudents > 0 && (
        <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#6b7280', flexWrap: 'wrap' }}>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#16a34a', marginRight: 5 }} />AI analüüs lubatud</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f97316', marginRight: 5 }} />Nõusolek on, KJ kinnitus puudub</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#d1d5db', marginRight: 5 }} />Nõusolek puudub</span>
        </div>
      )}
    </div>
  );
}
