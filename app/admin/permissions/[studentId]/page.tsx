import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { ConsentsSection } from './ConsentsSection';
import { EligibilitySection } from './EligibilitySection';
import { ParentLinkSection } from './ParentLinkSection';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
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
  const isSuperAdmin = user.role === 'SUPERADMIN';
  const isSchoolAdmin = user.role === 'SCHOOL_ADMIN';

  if (!isSuperAdmin && !isSchoolAdmin) {
    redirect('/dashboard');
  }

  const { studentId } = await params;

  const now = new Date();

  const student = await db.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      school: { select: { id: true, name: true } },
      class: { select: { name: true } },
      parents: {
        include: { parent: { include: { user: { select: { id: true, name: true, email: true } } } } },
      },
      consentGrants: {
        include: {
          subject: { select: { id: true, name: true } },
          parent: { include: { user: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!student) redirect('/admin/permissions');

  const subjects = await db.subject.findMany({ orderBy: { name: 'asc' } });

  const canManageEligibility = isSuperAdmin || isSchoolAdmin;

  const activeConsentsCount = student.consentGrants.filter((c) => {
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
          {student.class?.name ? ` · Klass ${student.class.name}` : ''}
        </p>
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
        <p>Funktsionaalsus uueneb peagi.</p>
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
            userId: p.parent.user?.id ?? '',
            name: p.parent.user?.name ?? p.parent.name ?? '—',
            email: p.parent.user?.email ?? p.parent.email ?? '—',
          }))}
        />
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
          consents={student.consentGrants.map((c) => ({
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

          <EligibilitySection
            studentId={studentId}
            isEligible={student.isEligible}
            note={null}
            activeConsentsCount={activeConsentsCount}
          />
        </div>
      )}
    </div>
  );
}
