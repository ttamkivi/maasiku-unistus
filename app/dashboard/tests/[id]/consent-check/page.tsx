import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import ConsentActions from './ConsentActions';

export default async function ConsentCheckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });

  const isPreview = session?.user.role === 'SUPERADMIN' && !!cookieStore.get('ot_preview_role')?.value;

  if (!session || session.expiresAt < new Date() || (!session.user.teacherProfile && !isPreview)) {
    redirect('/auth/login');
  }

  const teacherProfile = session.user.teacherProfile;

  const test = await db.test.findFirst({
    where: { id, deletedAt: null },
    include: { subject: true },
  });
  if (!test) notFound();

  // All results for this test
  const results = await db.testResult.findMany({
    where: { testId: id },
    select: { id: true, studentName: true, status: true },
    orderBy: { studentName: 'asc' },
  });

  // Group by normalised name
  const groupMap = new Map<string, { name: string; count: number; ids: string[]; status: string }>();
  for (const r of results) {
    const key = (r.studentName ?? '').trim().toLowerCase();
    const display = (r.studentName ?? '').trim() || '(Nimetu)';
    if (!groupMap.has(key)) {
      groupMap.set(key, { name: display, count: 0, ids: [], status: r.status });
    }
    const g = groupMap.get(key)!;
    g.count++;
    g.ids.push(r.id);
  }
  const groups = [...groupMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'et'));
  const hasDuplicates = groups.some((g) => g.count > 1);

  // Get AI consent for this test's subject from teacher's school students
  const teacherSchools = teacherProfile
    ? await db.teacherSchool.findMany({
        where: { teacherId: teacherProfile.id },
        select: { schoolId: true },
      })
    : [];
  const schoolIds = teacherSchools.map((ts) => ts.schoolId);

  // Students in teacher's schools with their consent for this subject
  const schoolStudents = await db.studentProfile.findMany({
    where: { schoolId: { in: schoolIds } },
    include: {
      user: { select: { name: true } },
      consentGrants: {
        where: {
          status: 'ACTIVE',
          OR: [
            { subjectId: test.subjectId ?? undefined },
            { subjectId: null }, // global consent covers all subjects
          ],
        },
      },
    },
  });

  // Build consent lookup: normalised name → has consent
  const consentByName = new Map<string, boolean>();
  for (const s of schoolStudents) {
    const key = s.user.name.trim().toLowerCase();
    const hasConsent = s.consentGrants.length > 0;
    // If student appears with multiple names, ACTIVE consent wins
    if (!consentByName.has(key) || hasConsent) {
      consentByName.set(key, hasConsent);
    }
  }

  // Annotate groups
  type ConsentStatus = 'yes' | 'no' | 'unknown';
  const annotated = groups.map((g) => {
    const key = g.name.trim().toLowerCase();
    let consent: ConsentStatus = 'unknown';
    if (consentByName.has(key)) {
      consent = consentByName.get(key)! ? 'yes' : 'no';
    }
    return { ...g, consent };
  });

  const consentYes = annotated.filter((g) => g.consent === 'yes');
  const consentNo = annotated.filter((g) => g.consent === 'no');
  const consentUnknown = annotated.filter((g) => g.consent === 'unknown');
  const withoutConsentCount = consentNo.reduce((s, g) => s + g.count, 0);
  const consentedNames = consentYes.map((g) => g.name);

  const dot = (color: string) => (
    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color, marginRight: 8, flexShrink: 0 }} />
  );

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <Link href={`/dashboard/tests/${id}`} style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}>
          ← Tagasi kontrolltöö juurde
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 4 }}>
        Nõusolekute kontroll
      </h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, marginTop: 0 }}>
        {test.title} · {test.subject?.name ?? 'Aine puudub'} · {groups.length} õpilast · {results.length} lehte
      </p>

      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Nõusolek olemas', count: consentYes.length, color: '#16a34a', bg: '#dcfce7' },
          { label: 'Nõusolek puudub', count: consentNo.length, color: '#b91c1c', bg: '#fee2e2' },
          { label: 'Süsteemis puudub', count: consentUnknown.length, color: '#92400e', bg: '#fef3c7' },
        ].map((s) => (
          <div key={s.label} style={{ background: s.bg, padding: '14px 16px', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 12, color: s.color, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '18px 20px', borderRadius: 6, marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1C2832', marginBottom: 12, marginTop: 0 }}>Toimingud</p>
        <ConsentActions
          testId={id}
          consentedNames={consentedNames}
          hasDuplicates={hasDuplicates}
          withoutConsentCount={withoutConsentCount}
        />
        {hasDuplicates && (
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 10, marginBottom: 0 }}>
            💡 Ühenda lehed enne analüüsi — nii näeb AI mõlemat lehte korraga.
          </p>
        )}
        {withoutConsentCount === 0 && !hasDuplicates && (
          <p style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, margin: 0 }}>
            ✓ Kõik korras — saad analüüsiga alustada
          </p>
        )}
      </div>

      {/* Student table */}
      <div style={{ border: '1.5px solid #DAD0A1', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#F8F3DA', borderBottom: '2px solid #DAD0A1' }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, fontSize: 12, color: '#1C2832' }}>Õpilane</th>
              <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700, fontSize: 12, color: '#1C2832' }}>Lehti</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, fontSize: 12, color: '#1C2832' }}>AI nõusolek</th>
            </tr>
          </thead>
          <tbody>
            {annotated.map((g, i) => (
              <tr key={g.name} style={{ borderBottom: i < annotated.length - 1 ? '1px solid #F0EDD6' : 'none', background: i % 2 === 0 ? '#fff' : '#FDFAF0' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1C2832' }}>{g.name}</td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  <span style={{
                    background: g.count > 1 ? '#fef08a' : '#F8F3DA',
                    color: g.count > 1 ? '#854d0e' : '#1C2832',
                    fontSize: 12, fontWeight: 700,
                    padding: '2px 10px', borderRadius: 10,
                  }}>
                    {g.count}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {g.consent === 'yes' && <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#16a34a', fontWeight: 600 }}>{dot('#16a34a')}Olemas</span>}
                  {g.consent === 'no' && <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>{dot('#b91c1c')}Puudub</span>}
                  {g.consent === 'unknown' && <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#92400e', fontWeight: 600 }}>{dot('#f59e0b')}Süsteemis puudub</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {consentUnknown.length > 0 && (
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 12 }}>
          ⚠️ &quot;Süsteemis puudub&quot; tähendab, et õpilane on PDF-ist tuvastatud, kuid ei kuulu sinu koolide nimekirja või pole nõusolekut lisatud.
        </p>
      )}
    </div>
  );
}
