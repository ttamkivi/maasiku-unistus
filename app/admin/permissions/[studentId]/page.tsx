import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { KlassijuhatajAssignForm } from './KlassijuhatajAssignForm';
import { ConsentsSection } from './ConsentsSection';
import { EligibilitySection } from './EligibilitySection';
import { ParentLinkSection } from './ParentLinkSection';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        include: { klassijuhatajProfile: true },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session;
}

export default async function StudentPermissionsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/auth/login');

  const user = session.user;
  const isSuperAdmin = user.isSuperAdmin && user.role === 'SUPERADMIN';
  const isSchoolAdmin = user.role === 'SCHOOL_ADMIN';
  const isKlassijuhataja = user.role === 'KLASSIJUHATAJA';

  if (!isSuperAdmin && !isSchoolAdmin && !isKlassijuhataja) {
    redirect('/dashboard');
  }

  const { studentId } = await params;

  const student = await db.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      school: { select: { id: true, name: true } },
      klassijuhatajRecord: {
        include: {
          klassijuhataj: {
            include: { user: { select: { id: true, name: true } } },
          },
          eligibility: true,
        },
      },
      parents: {
        include: { parent: { include: { user: { select: { id: true, name: true, email: true } } } } },
      },
      subjectConsents: {
        include: {
          subject: { select: { id: true, name: true } },
          parent: { include: { user: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!student) redirect('/admin/permissions');

  // For KLASSIJUHATAJA: verify they are assigned to this student
  if (isKlassijuhataja && !isSuperAdmin) {
    const kjProfile = user.klassijuhatajProfile;
    const assignedKjId = student.klassijuhatajRecord?.klassijuhatajId;
    if (!kjProfile || assignedKjId !== kjProfile.id) {
      redirect('/admin/permissions');
    }
  }

  // Fetch klassijuhatajad at the same school for the assign dropdown
  const schoolId = student.schoolId;
  const klassijuhatajad = await db.klassijuhatajProfile.findMany({
    where: schoolId ? { schoolId } : undefined,
    include: { user: { select: { id: true, name: true } } },
  });

  const subjects = await db.subject.findMany({ orderBy: { name: 'asc' } });

  const canAssignKJ = isSuperAdmin || isSchoolAdmin;
  const canManageEligibility = isSuperAdmin || isSchoolAdmin || isKlassijuhataja;

  const now = new Date();
  const activeConsentsCount = student.subjectConsents.filter((c) => {
    if (c.status !== 'ACTIVE') return false;
    if (c.duration === 'DATED' && c.endDate && c.endDate < now) return false;
    return true;
  }).length;

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/admin/permissions"
          style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}
        >
          ← Õiguste haldus
        </Link>
      </div>

      {/* Page title */}
      <div
        style={{
          background: '#fff',
          boxShadow: '0 2px 16px rgba(28,40,50,0.08)',
          padding: '28px 32px',
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
          {student.user.name}
        </h1>
        <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.6 }}>
          {student.school?.name ?? 'Kool määramata'}
          {student.class ? ` · Klass ${student.class}` : ''}
        </p>
      </div>

      {/* Section D: Lapsevanema sidumine */}
      <div
        style={{
          background: '#fff',
          boxShadow: '0 2px 16px rgba(28,40,50,0.08)',
          padding: '28px 32px',
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', marginBottom: 16 }}>
          D. Lapsevanema sidumine
        </h2>
        <ParentLinkSection
          studentId={studentId}
          linkedParents={student.parents.map((p) => ({
            id: p.parent.id,
            userId: p.parent.user.id,
            name: p.parent.user.name,
            email: p.parent.user.email,
          }))}
        />
      </div>

      {/* Section A: Klassijuhataja määramine */}
      <div
        style={{
          background: '#fff',
          boxShadow: '0 2px 16px rgba(28,40,50,0.08)',
          padding: '28px 32px',
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', marginBottom: 16 }}>
          A. Klassijuhataja määramine
        </h2>

        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: '#1C2832', opacity: 0.6 }}>Praegune klassijuhataja: </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>
            {student.klassijuhatajRecord?.klassijuhataj?.user?.name ?? 'Määramata'}
          </span>
        </div>

        {canAssignKJ ? (
          <KlassijuhatajAssignForm
            studentId={studentId}
            currentKjId={student.klassijuhatajRecord?.klassijuhatajId ?? null}
            klassijuhatajad={klassijuhatajad.map((kj) => ({
              id: kj.id,
              name: kj.user.name,
            }))}
          />
        ) : (
          <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.5, fontStyle: 'italic' }}>
            Teil puudub õigus klassijuhatajat muuta.
          </p>
        )}
      </div>

      {/* Section B: Lapsevanema nõusolekud */}
      <div
        style={{
          background: '#fff',
          boxShadow: '0 2px 16px rgba(28,40,50,0.08)',
          padding: '28px 32px',
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', marginBottom: 16 }}>
          B. Lapsevanema nõusolekud
        </h2>

        <ConsentsSection
          studentId={studentId}
          consents={student.subjectConsents.map((c) => ({
            id: c.id,
            subjectName: c.subject?.name ?? null,
            scope: c.scope,
            status: c.status,
            duration: c.duration,
            startDate: c.startDate.toISOString(),
            endDate: c.endDate?.toISOString() ?? null,
            revokedAt: c.revokedAt?.toISOString() ?? null,
            addedBy: c.parent?.user?.name ?? 'Süsteem',
            note: c.note ?? null,
          }))}
          subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>

      {/* Section C: Sobivuse kinnitamine */}
      {canManageEligibility && (
        <div
          style={{
            background: '#fff',
            boxShadow: '0 2px 16px rgba(28,40,50,0.08)',
            padding: '28px 32px',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', marginBottom: 16 }}>
            C. Sobivuse kinnitamine
          </h2>

          {!student.klassijuhatajRecord ? (
            <div
              style={{
                background: '#fef9c3',
                border: '1px solid #fde047',
                padding: '12px 16px',
                fontSize: 13,
                color: '#854d0e',
              }}
            >
              Õpilasele pole klassijuhatajat määratud. Sobivust saab kinnitada alles pärast klassijuhataja määramist.
            </div>
          ) : (
            <EligibilitySection
              studentId={studentId}
              isEligible={student.klassijuhatajRecord.eligibility?.isEligible ?? null}
              note={student.klassijuhatajRecord.eligibility?.note ?? null}
              activeConsentsCount={activeConsentsCount}
            />
          )}
        </div>
      )}
    </div>
  );
}
