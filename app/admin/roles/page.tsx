import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';

// ─── Access matrix definition ────────────────────────────────────────────────
// Each entry: [category, feature, SUPERADMIN, SCHOOL_ADMIN, ADMIN, TEACHER, KLASSIJUHATAJA, STUDENT, PARENT]
// Values: 'full' | 'partial' | 'own' | '-'

type Access = 'full' | 'partial' | 'own' | '-';

interface Row {
  category: string;
  feature: string;
  note?: string;
  access: {
    SUPERADMIN: Access;
    SCHOOL_ADMIN: Access;
    ADMIN: Access;
    TEACHER: Access;
    KLASSIJUHATAJA: Access;
    STUDENT: Access;
    PARENT: Access;
  };
}

const MATRIX: Row[] = [
  // ── Administration ──
  {
    category: 'Haldus',
    feature: 'Admin paneel',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'full', ADMIN: 'full', TEACHER: '-', KLASSIJUHATAJA: '-', STUDENT: '-', PARENT: '-' },
  },
  {
    category: 'Haldus',
    feature: 'Rollide & õiguste haldamine',
    note: 'See leht',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: '-', ADMIN: '-', TEACHER: '-', KLASSIJUHATAJA: '-', STUDENT: '-', PARENT: '-' },
  },
  {
    category: 'Haldus',
    feature: 'Audit logi',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'partial', ADMIN: 'full', TEACHER: '-', KLASSIJUHATAJA: '-', STUDENT: '-', PARENT: '-' },
  },
  {
    category: 'Haldus',
    feature: 'Andmehaldus & eksport',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'partial', ADMIN: 'full', TEACHER: '-', KLASSIJUHATAJA: '-', STUDENT: '-', PARENT: '-' },
  },

  // ── User management ──
  {
    category: 'Kasutajad',
    feature: 'Kasutajate nimekiri',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'partial', ADMIN: 'full', TEACHER: '-', KLASSIJUHATAJA: '-', STUDENT: '-', PARENT: '-' },
  },
  {
    category: 'Kasutajad',
    feature: 'Uue kasutaja loomine',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'partial', ADMIN: 'full', TEACHER: '-', KLASSIJUHATAJA: '-', STUDENT: '-', PARENT: '-' },
  },
  {
    category: 'Kasutajad',
    feature: 'Lisa Superadmin / Kooli admin',
    note: 'Ainult SUPERADMIN',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: '-', ADMIN: '-', TEACHER: '-', KLASSIJUHATAJA: '-', STUDENT: '-', PARENT: '-' },
  },
  {
    category: 'Kasutajad',
    feature: 'Muuda kasutaja rolli',
    note: 'SUPERADMIN saab kõiki; teised ainult madalamaid rolle',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'partial', ADMIN: 'partial', TEACHER: '-', KLASSIJUHATAJA: '-', STUDENT: '-', PARENT: '-' },
  },
  {
    category: 'Kasutajad',
    feature: 'Kustuta kasutaja',
    note: 'Ainult SUPERADMIN',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: '-', ADMIN: '-', TEACHER: '-', KLASSIJUHATAJA: '-', STUDENT: '-', PARENT: '-' },
  },

  // ── Schools ──
  {
    category: 'Koolid',
    feature: 'Koolide nimekiri',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'partial', ADMIN: 'full', TEACHER: '-', KLASSIJUHATAJA: '-', STUDENT: '-', PARENT: '-' },
  },
  {
    category: 'Koolid',
    feature: 'Lisa / muuda kool',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'own', ADMIN: 'full', TEACHER: '-', KLASSIJUHATAJA: '-', STUDENT: '-', PARENT: '-' },
  },

  // ── Students & classes ──
  {
    category: 'Õpilased & klassid',
    feature: 'Lisa õpilane klassi',
    note: 'Vanem lisab oma lapse; klassijuhataja oma klassi',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'full', ADMIN: 'full', TEACHER: '-', KLASSIJUHATAJA: 'own', STUDENT: '-', PARENT: 'own' },
  },
  {
    category: 'Õpilased & klassid',
    feature: 'Vaata õpilase andmeid',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'full', ADMIN: 'full', TEACHER: 'partial', KLASSIJUHATAJA: 'own', STUDENT: 'own', PARENT: 'own' },
  },
  {
    category: 'Õpilased & klassid',
    feature: 'Klassijuhataja määramine',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'full', ADMIN: 'full', TEACHER: '-', KLASSIJUHATAJA: '-', STUDENT: '-', PARENT: '-' },
  },

  // ── Consents ──
  {
    category: 'Nõusolekud',
    feature: 'Anna nõusolek lapse tööriista kasutuseks',
    note: 'Ainult lapsevanem',
    access: { SUPERADMIN: '-', SCHOOL_ADMIN: '-', ADMIN: '-', TEACHER: '-', KLASSIJUHATAJA: '-', STUDENT: '-', PARENT: 'own' },
  },
  {
    category: 'Nõusolekud',
    feature: 'Vali lubatud ained (opt-in/out)',
    note: 'Vanem valib; teised näevad',
    access: { SUPERADMIN: '-', SCHOOL_ADMIN: '-', ADMIN: '-', TEACHER: '-', KLASSIJUHATAJA: '-', STUDENT: '-', PARENT: 'own' },
  },
  {
    category: 'Nõusolekud',
    feature: 'Vaata nõusolekute staatust',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'full', ADMIN: 'full', TEACHER: '-', KLASSIJUHATAJA: 'own', STUDENT: 'own', PARENT: 'own' },
  },

  // ── Work upload & analysis ──
  {
    category: 'Tööde analüüs',
    feature: 'Laadi üles töö / foto',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'full', ADMIN: 'full', TEACHER: 'full', KLASSIJUHATAJA: 'full', STUDENT: 'own', PARENT: '-' },
  },
  {
    category: 'Tööde analüüs',
    feature: 'AI tagasiside genereerimine',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'full', ADMIN: 'full', TEACHER: 'full', KLASSIJUHATAJA: 'full', STUDENT: 'own', PARENT: '-' },
  },
  {
    category: 'Tööde analüüs',
    feature: 'Vaata oma tagasisidet',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'full', ADMIN: 'full', TEACHER: 'own', KLASSIJUHATAJA: 'own', STUDENT: 'own', PARENT: '-' },
  },
  {
    category: 'Tööde analüüs',
    feature: 'Vaata õpilase tagasisidet (jagatud)',
    note: 'Ainult kui õpilane on jaganud',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'full', ADMIN: 'full', TEACHER: 'partial', KLASSIJUHATAJA: 'own', STUDENT: '-', PARENT: 'own' },
  },

  // ── Assignments ──
  {
    category: 'Kodutööd',
    feature: 'Loo kodutöö',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'full', ADMIN: 'full', TEACHER: 'full', KLASSIJUHATAJA: 'own', STUDENT: '-', PARENT: '-' },
  },
  {
    category: 'Kodutööd',
    feature: 'Vaata kodutöö tulemusi (klass)',
    access: { SUPERADMIN: 'full', SCHOOL_ADMIN: 'full', ADMIN: 'full', TEACHER: 'own', KLASSIJUHATAJA: 'own', STUDENT: '-', PARENT: '-' },
  },
  {
    category: 'Kodutööd',
    feature: 'Esita kodutöö',
    access: { SUPERADMIN: '-', SCHOOL_ADMIN: '-', ADMIN: '-', TEACHER: '-', KLASSIJUHATAJA: '-', STUDENT: 'full', PARENT: '-' },
  },
  {
    category: 'Kodutööd',
    feature: 'Jaga tulemus õpetajaga',
    note: 'Õpilase valik',
    access: { SUPERADMIN: '-', SCHOOL_ADMIN: '-', ADMIN: '-', TEACHER: '-', KLASSIJUHATAJA: '-', STUDENT: 'own', PARENT: '-' },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACCESS_STYLES: Record<Access, { bg: string; color: string; label: string }> = {
  full:    { bg: '#dcfce7', color: '#16a34a', label: '✓ Täielik' },
  partial: { bg: '#fef9c3', color: '#a16207', label: '◑ Osaline' },
  own:     { bg: '#dbeafe', color: '#1d4ed8', label: '◎ Oma' },
  '-':     { bg: '#f3f4f6', color: '#9ca3af', label: '—' },
};

const ROLES = [
  { key: 'SUPERADMIN',     label: 'Super\nadmin',       color: '#dc2626' },
  { key: 'SCHOOL_ADMIN',   label: 'Kooli\nadmin',       color: '#ea580c' },
  { key: 'ADMIN',          label: 'Admin',              color: '#9333ea' },
  { key: 'TEACHER',        label: 'Õpetaja',            color: '#1C2832' },
  { key: 'KLASSIJUHATAJA', label: 'Klassi-\njuhataja',  color: '#0369a1' },
  { key: 'STUDENT',        label: 'Õpilane',            color: '#2563eb' },
  { key: 'PARENT',         label: 'Lapse-\nvanem',      color: '#16a34a' },
] as const;

type RoleKey = typeof ROLES[number]['key'];

const ROLE_DESCRIPTIONS: Record<RoleKey, { icon: string; who: string; canDo: string[]; cannotDo: string[] }> = {
  SUPERADMIN: {
    icon: '🔴',
    who: 'Platvormi haldaja, täielik kontroll',
    canDo: ['Kõik õigused ilma piiranguteta', 'Loob ja kustutab teisi kasutajaid', 'Määrab kõiki rolle, sh Superadmin', 'Vaatab kogu audit logi'],
    cannotDo: ['(piiranguid pole)'],
  },
  SCHOOL_ADMIN: {
    icon: '🟠',
    who: 'Kooli IT-haldaja või direktor',
    canDo: ['Haldab oma kooli kasutajaid', 'Loob õpetajaid, klassijuhatajaid, õpilasi', 'Vaatab oma kooli audit logi', 'Muudab kooli andmeid'],
    cannotDo: ['Ei saa luua Superadmini', 'Ei näe teiste koolide andmeid', 'Ei kustuta kasutajaid'],
  },
  ADMIN: {
    icon: '🟠',
    who: 'Üldine süsteemiadmin (mitte koolipõhine)',
    canDo: ['Haldab kasutajaid üle koolide', 'Loob ja muudab koole', 'Vaatab kogu audit logi'],
    cannotDo: ['Ei saa luua Superadmini ega Kooli admini', 'Ei kustuta kasutajaid'],
  },
  TEACHER: {
    icon: '🟢',
    who: 'Aineõpetaja',
    canDo: ['Laeb üles õpilaste töid analüüsiks', 'Loob kodutöid oma klassidele', 'Näeb jagatud tagasisidet', 'Genereerib AI tagasisidet'],
    cannotDo: ['Ei näe jagamata tagasisidet', 'Ei halda kasutajaid ega kooli', 'Ei lisa õpilasi'],
  },
  KLASSIJUHATAJA: {
    icon: '🟢',
    who: 'Klassijuhataja (homeroom teacher)',
    canDo: ['Kõik õpetaja õigused oma klassis', 'Näeb klassi nõusolekute staatust', 'Lisab õpilasi oma klassi', 'Määrab klassijuhataja kodutöid'],
    cannotDo: ['Ei muuda lapse nõusolekuid', 'Ei näe teiste klasside andmeid'],
  },
  STUDENT: {
    icon: '🟢',
    who: 'Õpilane',
    canDo: ['Esitab kodutöid', 'Näeb oma tagasisidet', 'Valib, kas jagada õpetajaga', 'Laeb üles oma töö fotosid'],
    cannotDo: ['Ei näe teiste tagasisidet', 'Ei loo kodutöid', 'Ei halda nõusolekuid (vanem teeb)'],
  },
  PARENT: {
    icon: '🟢',
    who: 'Lapsevanem / eestkostja',
    canDo: ['Annab nõusoleku lapse tööriista kasutuseks', 'Valib lubatud ained (opt-in/out)', 'Näeb lapse jagatud tagasisidet', 'Lisab oma lapse süsteemi'],
    cannotDo: ['Ei laadi üles töid', 'Ei näe teiste laste andmeid', 'Ei muuda midagi ilma nõusolekuta'],
  },
};

function AccessCell({ value }: { value: Access }) {
  const s = ACCESS_STYLES[value];
  return (
    <td
      style={{
        padding: '8px 6px',
        textAlign: 'center',
        background: s.bg,
        fontSize: 11,
        fontWeight: 600,
        color: s.color,
        whiteSpace: 'pre',
        borderRight: '1px solid #e5e7eb',
        borderBottom: '1px solid #e5e7eb',
        minWidth: 72,
      }}
    >
      {s.label}
    </td>
  );
}

export default async function RolesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  // Roles page is SUPERADMIN-only
  if (!session || session.expiresAt < new Date() || session.user.role !== 'SUPERADMIN') {
    redirect('/admin');
  }

  // Group matrix by category
  const categories = Array.from(new Set(MATRIX.map((r) => r.category)));

  return (
    <div>
      <div
        style={{
          background: '#fff',
          boxShadow: '0 2px 16px rgba(28,40,50,0.08)',
          borderRadius: 8,
          padding: '36px 32px',
          marginBottom: 24,
        }}
      >
        <Link
          href="/admin"
          style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}
        >
          ← Admin paneel
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginTop: 4, marginBottom: 6 }}>
          Rollid &amp; õigused
        </h1>
        <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.6, marginBottom: 32 }}>
          Juurdepääsumaatriiks — mida iga roll näeb ja teha saab
        </p>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          {Object.entries(ACCESS_STYLES).map(([key, s]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span
                style={{
                  background: s.bg,
                  color: s.color,
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 600,
                  fontSize: 11,
                }}
              >
                {s.label}
              </span>
              <span style={{ color: '#1C2832', opacity: 0.7 }}>
                {key === 'full' ? 'Täielik juurdepääs' :
                 key === 'partial' ? 'Osaline (nt ainult oma kool)' :
                 key === 'own' ? 'Ainult oma andmed' :
                 'Puudub'}
              </span>
            </div>
          ))}
        </div>

        {/* Access matrix table */}
        <div style={{ overflowX: 'auto', marginBottom: 40 }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
            <thead>
              <tr style={{ background: '#1C2832' }}>
                <th
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    color: '#F8F3DA',
                    fontWeight: 700,
                    fontSize: 13,
                    borderRight: '1px solid #374151',
                    minWidth: 220,
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    background: '#1C2832',
                  }}
                >
                  Funktsioon
                </th>
                {ROLES.map((r) => (
                  <th
                    key={r.key}
                    style={{
                      padding: '10px 6px',
                      textAlign: 'center',
                      color: '#F8F3DA',
                      fontWeight: 700,
                      fontSize: 11,
                      borderRight: '1px solid #374151',
                      minWidth: 72,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const rows = MATRIX.filter((r) => r.category === cat);
                return rows.map((row, ri) => (
                  <tr key={`${cat}-${ri}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    {ri === 0 && (
                      <td
                        rowSpan={rows.length}
                        style={{
                          padding: '8px 14px',
                          fontWeight: 700,
                          fontSize: 11,
                          color: '#fff',
                          background: '#374151',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          verticalAlign: 'middle',
                          borderRight: '1px solid #e5e7eb',
                          borderBottom: '2px solid #9ca3af',
                          position: 'sticky',
                          left: 0,
                          zIndex: 1,
                          display: 'none',
                        }}
                      >
                        {cat}
                      </td>
                    )}
                    <td
                      style={{
                        padding: '9px 14px',
                        color: '#1C2832',
                        borderRight: '1px solid #e5e7eb',
                        borderBottom: '1px solid #e5e7eb',
                        background: ri % 2 === 0 ? '#fff' : '#FDFAF0',
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                      }}
                    >
                      {ri === 0 && (
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: '#9ca3af',
                            marginBottom: 2,
                          }}
                        >
                          {cat}
                        </div>
                      )}
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{row.feature}</div>
                      {row.note && (
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{row.note}</div>
                      )}
                    </td>
                    {ROLES.map((r) => (
                      <AccessCell key={r.key} value={row.access[r.key as RoleKey]} />
                    ))}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role cards */}
      <div
        style={{
          background: '#fff',
          boxShadow: '0 2px 16px rgba(28,40,50,0.08)',
          borderRadius: 8,
          padding: '36px 32px',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C2832', marginBottom: 20 }}>
          Rollide kirjeldused
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {ROLES.map((r) => {
            const desc = ROLE_DESCRIPTIONS[r.key as RoleKey];
            return (
              <div
                key={r.key}
                style={{
                  border: `2px solid ${r.color}30`,
                  borderRadius: 8,
                  padding: '20px',
                  background: `${r.color}08`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>{desc.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: r.color }}>
                      {r.label.replace('\n', ' ')}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{desc.who}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#1C2832', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>✓ Saab:</div>
                  {desc.canDo.map((item, i) => (
                    <div key={i} style={{ paddingLeft: 8, lineHeight: 1.7 }}>• {item}</div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#1C2832' }}>
                  <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>✕ Ei saa:</div>
                  {desc.cannotDo.map((item, i) => (
                    <div key={i} style={{ paddingLeft: 8, lineHeight: 1.7 }}>• {item}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
