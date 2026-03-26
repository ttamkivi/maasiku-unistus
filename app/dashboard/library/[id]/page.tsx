import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import CloneButton from './CloneButton';
import PrintButton from './PrintButton';

export default async function LibraryTestDetailPage({
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
  if (!session || session.expiresAt < new Date() || !session.user.teacherProfile) {
    redirect('/auth/login');
  }

  const test = await db.test.findFirst({
    where: { id, visibility: 'PUBLIC', deletedAt: null },
    include: {
      subject: true,
      teacher: { include: { user: { select: { name: true } } } },
      curriculumLinks: true,
      _count: { select: { results: true, derivedTests: true } },
    },
  });

  if (!test) notFound();

  const isOwnTest = test.teacherId === session.user.teacherProfile.id;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
        <Link href="/dashboard/library" style={{ color: '#6b7280', textDecoration: 'underline' }}>Raamatukogu</Link>
        <span style={{ color: '#d1d5db' }}>&gt;</span>
        <span style={{ color: '#1C2832' }}>{test.title}</span>
      </div>

      {/* Header */}
      <div style={{ background: '#F8F3DA', padding: '20px 22px', marginBottom: 20, borderBottom: '3px solid #DAD0A1' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', margin: 0 }}>{test.title}</h1>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              {test.subject && <span style={{ fontSize: 13, color: '#1C2832', opacity: 0.7 }}>{test.subject.name}</span>}
              {test.grade && <span style={{ fontSize: 13, color: '#1C2832', opacity: 0.7 }}>{test.grade}. klass</span>}
              {test.topic && <span style={{ fontSize: 13, color: '#1C2832', opacity: 0.7 }}>{test.topic}</span>}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
              Autor: {test.teacher.user.name} · {test._count.derivedTests} kopeeritud
            </div>
          </div>
          {!isOwnTest ? (
            <CloneButton testId={test.id} />
          ) : (
            <Link
              href={`/dashboard/tests/${test.id}`}
              style={{
                background: '#1C2832',
                color: '#F8F3DA',
                fontWeight: 700,
                fontSize: 14,
                padding: '10px 18px',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Ava oma test
            </Link>
          )}
        </div>
      </div>

      {/* Content sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Test content / questions */}
        {test.content && (
          <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1C2832', opacity: 0.6, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Kontrolltöö ülesanded
              </h2>
              <PrintButton
                title={test.title}
                subject={test.subject?.name || ''}
                grade={test.grade || ''}
                content={test.content}
              />
            </div>
            <div style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {test.content}
            </div>
          </div>
        )}

        {/* Rubric */}
        {test.rubric && (
          <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '18px 20px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1C2832', opacity: 0.6, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Hindamisjuhend
            </h2>
            <div style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {test.rubric}
            </div>
          </div>
        )}

        {/* Answer key */}
        {test.answerKey && (
          <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '18px 20px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1C2832', opacity: 0.6, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Õiged vastused
            </h2>
            <div style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {test.answerKey}
            </div>
          </div>
        )}

        {/* Curriculum links */}
        {test.curriculumLinks.length > 0 && (
          <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '18px 20px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1C2832', opacity: 0.6, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Seosed õppekavaga
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {test.curriculumLinks.map(cl => (
                <div key={cl.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9', background: '#ede9fe', padding: '2px 8px' }}>
                    {cl.curriculumCode}
                  </span>
                  {cl.topicLabel && <span style={{ fontSize: 13, color: '#1C2832' }}>{cl.topicLabel}</span>}
                  {cl.weightPercent && <span style={{ fontSize: 11, color: '#6b7280' }}>({cl.weightPercent}%)</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {test.blankTestNotes && (
          <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '18px 20px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1C2832', opacity: 0.6, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Märkused
            </h2>
            <div style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {test.blankTestNotes}
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      {!isOwnTest && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <CloneButton testId={test.id} large />
        </div>
      )}
    </div>
  );
}
