import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';

const TYPE_LABELS: Record<string, string> = {
  video: 'Video',
  exercise: 'Harjutus',
  reading: 'Lugemismaterjal',
  course: 'Kursus',
};

const TYPE_ICONS: Record<string, string> = {
  video: '▶',
  exercise: '✎',
  reading: '☰',
  course: '◆',
};

const LANG_LABELS: Record<string, string> = {
  et: 'Eesti',
  en: 'English',
  et_sub: 'EN + eesti subtiitrid',
};

const CURRICULUM_SECTIONS = [
  { label: 'Soojusõpetus', prefix: 'F9.1' },
  { label: 'Elektriõpetus', prefix: 'F9.2' },
];

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; language?: string; section?: string; search?: string; free?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) redirect('/auth/login');

  const params = await searchParams;
  const filterType = params.type || '';
  const filterLang = params.language || '';
  const filterSection = params.section || '';
  const filterSearch = params.search || '';
  const filterFree = params.free || '';

  // Build query
  const where: Record<string, unknown> = {};
  if (filterType) where.type = filterType;
  if (filterLang) where.language = filterLang;
  if (filterFree === 'true') where.isFree = true;
  if (filterFree === 'false') where.isFree = false;

  // Filter by curriculum section prefix
  if (filterSection) {
    where.curriculumCode = { startsWith: filterSection };
  }

  let materials = await db.learningResource.findMany({
    where,
    orderBy: [{ quality: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  });

  // Client-side text search
  if (filterSearch) {
    const q = filterSearch.toLowerCase();
    materials = materials.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.description ?? '').toLowerCase().includes(q) ||
        (m.topic ?? '').toLowerCase().includes(q) ||
        (m.provider ?? '').toLowerCase().includes(q)
    );
  }

  // Group by curriculum code
  const grouped: Record<string, typeof materials> = {};
  for (const m of materials) {
    if (!grouped[m.curriculumCode]) grouped[m.curriculumCode] = [];
    grouped[m.curriculumCode].push(m);
  }

  const sortedCodes = Object.keys(grouped).sort();

  const isTeacherOrAdmin =
    session.user.role === 'TEACHER' ||
    session.user.role === 'SUPERADMIN' ||
    session.user.role === 'SCHOOL_ADMIN';

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    const merged = { type: filterType, language: filterLang, section: filterSection, search: filterSearch, free: filterFree, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    const qs = p.toString();
    return `/dashboard/materials${qs ? '?' + qs : ''}`;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', margin: 0 }}>
            Raamatukogu
          </h1>
          {isTeacherOrAdmin && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link
                href="/dashboard/materials/add"
                style={{
                  background: '#1C2832',
                  color: '#F8F3DA',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '10px 16px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                ⬆ Lae üles
              </Link>
              <Link
                href="/dashboard/materials/generate"
                style={{
                  background: 'linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '10px 16px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                ✦ Genereeri AI-ga
              </Link>
            </div>
          )}
        </div>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
          Kureeritud videod, harjutused, artiklid ja kursused — organiseeritud ainekava järgi. AI kasutab neid tagasiside andmisel.
        </p>
      </div>

      {/* Sub-navigation */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #DAD0A1' }}>
        <Link
          href="/dashboard/library"
          style={{
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 500,
            color: '#6b7280',
            textDecoration: 'none',
            borderBottom: '3px solid transparent',
            marginBottom: -2,
          }}
        >
          Kontrolltööd
        </Link>
        <span
          style={{
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 700,
            color: '#1C2832',
            borderBottom: '3px solid #1C2832',
            marginBottom: -2,
          }}
        >
          Õppematerjalid
        </span>
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {/* Section filter */}
        {CURRICULUM_SECTIONS.map((sec) => (
          <a
            key={sec.prefix}
            href={buildUrl({ section: filterSection === sec.prefix ? '' : sec.prefix })}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              background: filterSection === sec.prefix ? '#1C2832' : '#fff',
              color: filterSection === sec.prefix ? '#F8F3DA' : '#1C2832',
              border: '1.5px solid #DAD0A1',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            {sec.label}
          </a>
        ))}

        <span style={{ borderLeft: '1px solid #DAD0A1', margin: '0 4px' }} />

        {/* Type filter */}
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <a
            key={key}
            href={buildUrl({ type: filterType === key ? '' : key })}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 500,
              background: filterType === key ? '#1C2832' : '#fff',
              color: filterType === key ? '#F8F3DA' : '#374151',
              border: '1.5px solid #DAD0A1',
              textDecoration: 'none',
            }}
          >
            {TYPE_ICONS[key]} {label}
          </a>
        ))}

        <span style={{ borderLeft: '1px solid #DAD0A1', margin: '0 4px' }} />

        {/* Free/Paid filter */}
        <a
          href={buildUrl({ free: filterFree === 'true' ? '' : 'true' })}
          style={{
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 500,
            background: filterFree === 'true' ? '#16a34a' : '#fff',
            color: filterFree === 'true' ? '#fff' : '#374151',
            border: '1.5px solid #DAD0A1',
            textDecoration: 'none',
          }}
        >
          Tasuta
        </a>
        <a
          href={buildUrl({ free: filterFree === 'false' ? '' : 'false' })}
          style={{
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 500,
            background: filterFree === 'false' ? '#f97316' : '#fff',
            color: filterFree === 'false' ? '#fff' : '#374151',
            border: '1.5px solid #DAD0A1',
            textDecoration: 'none',
          }}
        >
          Tasuline
        </a>
      </div>

      {/* Search */}
      <form action="/dashboard/materials" method="GET" style={{ marginBottom: 24 }}>
        {filterType && <input type="hidden" name="type" value={filterType} />}
        {filterLang && <input type="hidden" name="language" value={filterLang} />}
        {filterSection && <input type="hidden" name="section" value={filterSection} />}
        {filterFree && <input type="hidden" name="free" value={filterFree} />}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            name="search"
            defaultValue={filterSearch}
            placeholder="Otsi materjali..."
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: 14,
              border: '1.5px solid #DAD0A1',
              background: '#fff',
              color: '#1C2832',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 700,
              background: '#1C2832',
              color: '#F8F3DA',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Otsi
          </button>
        </div>
      </form>

      {/* Stats */}
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        {materials.length} materjali{sortedCodes.length > 0 ? ` · ${sortedCodes.length} teemat` : ''}
      </div>

      {/* Materials grouped by curriculum code */}
      {sortedCodes.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 15 }}>
          {filterSearch || filterType || filterSection
            ? 'Otsingule vastavaid materjale ei leitud.'
            : 'Materjale pole veel lisatud. Alusta "Lisa uus materjal" nupuga.'}
        </div>
      ) : (
        sortedCodes.map((code) => (
          <div key={code} style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#1C2832',
              opacity: 0.6,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}>
              {code} · {grouped[code][0].topic || '—'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {grouped[code].map((m) => (
                <a
                  key={m.id}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="material-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr auto',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    background: '#fff',
                    border: '1.5px solid #DAD0A1',
                    textDecoration: 'none',
                    color: '#1C2832',
                    transition: 'background 0.12s',
                  }}
                >
                  {/* Icon */}
                  <span style={{
                    fontSize: 18,
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#F8F3DA',
                    flexShrink: 0,
                  }}>
                    {TYPE_ICONS[m.type] || '•'}
                  </span>

                  {/* Content */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                      {m.provider && <span>{m.provider}</span>}
                      <span>{LANG_LABELS[m.language] || m.language}</span>
                      <span>{TYPE_LABELS[m.type] || m.type}</span>
                      {m.isFree ? (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>Tasuta</span>
                      ) : (
                        <span style={{ color: '#f97316', fontWeight: 600 }}>Tasuline</span>
                      )}
                      {m.verified && <span style={{ color: '#16a34a' }}>✓ Kontrollitud</span>}
                    </div>
                    {m.description && (
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.description}
                      </div>
                    )}
                  </div>

                  {/* Quality stars */}
                  <div style={{ fontSize: 12, color: '#DAD0A1', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {'★'.repeat(m.quality)}{'☆'.repeat(5 - m.quality)}
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))
      )}

      <style>{`.material-row:hover { background: #F8F3DA !important; }`}</style>
    </div>
  );
}
