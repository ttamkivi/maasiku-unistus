import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; subject?: string; q?: string }>;
}) {
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

  const params = await searchParams;
  const gradeFilter = params.grade || null;
  const searchQuery = params.q || null;

  // Load all public tests
  const tests = await db.test.findMany({
    where: {
      visibility: 'PUBLIC',
      deletedAt: null,
      ...(gradeFilter ? { grade: gradeFilter } : {}),
    },
    include: {
      subject: true,
      teacher: { include: { user: { select: { name: true } } } },
      _count: { select: { results: true, derivedTests: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Client-side search
  let filtered = tests;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = tests.filter(t =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.topic || '').toLowerCase().includes(q) ||
      (t.subject?.name || '').toLowerCase().includes(q)
    );
  }

  // Get available grades for filter
  const grades = [...new Set(tests.map(t => t.grade).filter(Boolean))].sort();

  // Group by topic for nice display
  const byTopic = new Map<string, typeof filtered>();
  for (const t of filtered) {
    const key = t.topic || t.title;
    const list = byTopic.get(key) || [];
    list.push(t);
    byTopic.set(key, list);
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', margin: 0 }}>
            Testide raamatukogu
          </h1>
          <Link
            href="/dashboard/tests/new?visibility=PUBLIC"
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
            + Lisa oma test
          </Link>
        </div>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
          Avalik kogu kontrolltöid, mida teised õpetajad on jaganud. Kopeeri endale ja kohanda vastavalt vajadusele.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <Link
          href="/dashboard/library"
          style={{
            background: !gradeFilter ? '#1C2832' : '#F8F3DA',
            color: !gradeFilter ? '#F8F3DA' : '#1C2832',
            fontWeight: 600,
            fontSize: 13,
            padding: '7px 14px',
            textDecoration: 'none',
            border: '1.5px solid #DAD0A1',
          }}
        >
          Kõik
        </Link>
        {grades.map(g => (
          <Link
            key={g}
            href={`/dashboard/library?grade=${g}${searchQuery ? `&q=${searchQuery}` : ''}`}
            style={{
              background: gradeFilter === g ? '#1C2832' : '#fff',
              color: gradeFilter === g ? '#F8F3DA' : '#1C2832',
              fontWeight: 600,
              fontSize: 13,
              padding: '7px 14px',
              textDecoration: 'none',
              border: '1.5px solid #DAD0A1',
            }}
          >
            {g}. klass
          </Link>
        ))}

        {/* Search */}
        <form method="GET" action="/dashboard/library" style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {gradeFilter && <input type="hidden" name="grade" value={gradeFilter} />}
          <input
            type="text"
            name="q"
            placeholder="Otsi teemat..."
            defaultValue={searchQuery || ''}
            style={{
              padding: '7px 12px',
              border: '1.5px solid #DAD0A1',
              fontSize: 13,
              color: '#1C2832',
              width: 180,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              background: '#DAD0A1',
              color: '#1C2832',
              fontWeight: 700,
              fontSize: 13,
              padding: '7px 14px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Otsi
          </button>
        </form>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div style={{
          background: '#F8F3DA',
          border: '2px dashed #DAD0A1',
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#1C2832', marginBottom: 8 }}>
            {searchQuery ? 'Otsingule vastavaid teste ei leitud' : 'Raamatukogu on veel tühi'}
          </p>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            {searchQuery
              ? 'Proovi teist otsingut või eemalda filtrid'
              : 'Ole esimene, kes jagab oma kontrolltöö teiste õpetajatega!'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <style>{`
            .library-card { transition: border-color 0.15s, box-shadow 0.15s; }
            .library-card:hover { border-color: #1C2832 !important; box-shadow: 0 2px 8px rgba(28,40,50,0.08); }
          `}</style>
          {filtered.map(test => (
            <Link
              key={test.id}
              href={`/dashboard/library/${test.id}`}
              className="library-card"
              style={{
                background: '#fff',
                border: '1.5px solid #DAD0A1',
                padding: '16px 20px',
                textDecoration: 'none',
                display: 'block',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', margin: 0 }}>
                    {test.title}
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {test.subject && (
                      <span style={{ fontSize: 12, color: '#1C2832', opacity: 0.6 }}>{test.subject.name}</span>
                    )}
                    {test.grade && (
                      <span style={{ fontSize: 12, background: '#F8F3DA', padding: '2px 8px', color: '#1C2832', fontWeight: 600 }}>
                        {test.grade}. klass
                      </span>
                    )}
                    {test.topic && test.topic !== test.title && (
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{test.topic}</span>
                    )}
                  </div>
                  {test.rubric && (
                    <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6, lineHeight: 1.4 }}>
                      {test.rubric.substring(0, 120)}{test.rubric.length > 120 ? '...' : ''}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {test.teacher.user.name}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 6, justifyContent: 'flex-end' }}>
                    {test._count.derivedTests > 0 && (
                      <span style={{ fontSize: 11, color: '#1C2832', opacity: 0.5 }}>
                        {test._count.derivedTests}x kopeeritud
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Stats footer */}
      <div style={{ marginTop: 20, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
        {filtered.length} testi raamatukogus
        {gradeFilter && ` · ${gradeFilter}. klass`}
        {searchQuery && ` · otsing: "${searchQuery}"`}
      </div>
    </div>
  );
}
