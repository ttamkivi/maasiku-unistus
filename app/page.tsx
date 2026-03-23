import Link from 'next/link';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getLoggedInRole(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('mu_session')?.value;
    if (!token) return null;
    const session = await db.session.findUnique({
      where: { token },
      select: { expiresAt: true, user: { select: { role: true } } },
    });
    if (!session || session.expiresAt < new Date()) return null;
    const realRole = session.user.role;
    // Respect preview role for SUPERADMIN (cookie is not httpOnly so readable server-side)
    if (realRole === 'SUPERADMIN') {
      const previewRole = cookieStore.get('mu_preview_role')?.value;
      if (previewRole) return previewRole;
    }
    return realRole;
  } catch {
    return null;
  }
}

function dashboardHref(role: string) {
  switch (role) {
    case 'TEACHER':        return '/dashboard/teacher';
    case 'STUDENT':        return '/dashboard/student';
    case 'KLASSIJUHATAJA': return '/dashboard/klassijuhataja';
    case 'PARENT':         return '/dashboard/parent';
    case 'ADMIN':
    case 'SCHOOL_ADMIN':
    case 'SUPERADMIN':     return '/admin';
    default:               return '/dashboard';
  }
}

// ─── Sub-components (inline, no extra files) ─────────────────────────────────

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: color + '18',
        color: color,
        fontWeight: 700,
        fontSize: 11,
        padding: '3px 10px',
        borderRadius: 12,
        border: `1px solid ${color}30`,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: '#1C2832',
          color: '#F8F3DA',
          fontWeight: 700,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {n}
      </div>
      <p style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function Home() {
  const effectiveRole = await getLoggedInRole();
  const isLoggedIn = !!effectiveRole;
  const dashHref = effectiveRole ? dashboardHref(effectiveRole) : '/dashboard';

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 80 }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1C2832 0%, #2d3f4f 100%)',
          borderRadius: 12,
          padding: '52px 44px',
          marginBottom: 40,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative blob */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: '#F8F3DA',
            opacity: 0.05,
          }}
        />
        <div style={{ position: 'relative' }}>
          <Badge color="#DAD0A1">Eesti kooli AI tööriist · prototüüp</Badge>
          <h1
            style={{
              fontSize: 38,
              fontWeight: 700,
              color: '#F8F3DA',
              lineHeight: 1.15,
              marginTop: 16,
              marginBottom: 12,
            }}
          >
            Maasiku Unistus
          </h1>
          <p style={{ fontSize: 18, color: '#F8F3DA', opacity: 0.8, maxWidth: 480, lineHeight: 1.6, marginBottom: 32 }}>
            Isiklik AI tagasiside igale õpilasele — kontrolltöödel ja kodutöödel. Toetab õpetajat, kaasab lapsevanemaid.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {isLoggedIn ? (
              <Link
                href={dashHref}
                style={{
                  background: '#F8F3DA',
                  color: '#1C2832',
                  fontWeight: 700,
                  fontSize: 15,
                  padding: '13px 28px',
                  textDecoration: 'none',
                  borderRadius: 6,
                }}
              >
                Mine töölauale →
              </Link>
            ) : (
              <Link
                href="/auth/login"
                style={{
                  background: '#F8F3DA',
                  color: '#1C2832',
                  fontWeight: 700,
                  fontSize: 15,
                  padding: '13px 28px',
                  textDecoration: 'none',
                  borderRadius: 6,
                }}
              >
                Logi sisse →
              </Link>
            )}
            <Link
              href="/demo"
              style={{
                background: 'transparent',
                color: '#F8F3DA',
                fontWeight: 600,
                fontSize: 15,
                padding: '13px 28px',
                textDecoration: 'none',
                borderRadius: 6,
                border: '1.5px solid rgba(248,243,218,0.4)',
              }}
            >
              Vaata näidist
            </Link>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 48 }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 12 }}>
          Kuidas see toimib?
        </p>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginBottom: 28 }}>
          AI-tagasiside kogu klassile minutitega
        </h2>

        <div
          style={{
            background: '#fff',
            border: '2px solid #1C2832',
            borderRadius: 10,
            padding: '28px 24px',
            maxWidth: 560,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
          <Badge color="#1C2832">Kontrolltöö</Badge>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1C2832', marginTop: 10, marginBottom: 8 }}>
            Klass kirjutab kontrolltöö
          </h3>
          <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.65, marginBottom: 20 }}>
            Õpetaja pildistab kõikide õpilaste töid. AI analüüsib iga töö eraldi ja koostab isikliku tagasiside.
            Õpetaja vaatab üle, kinnitab ja jagab õpilastele.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <Step n="1" text="Õpetaja loob kontrolltöö ja pildistab paberid" />
            <Step n="2" text="AI analüüsib iga tööd riikliku ainekava järgi" />
            <Step n="3" text="Õpetaja vaatab tagasiside üle ja kinnitab" />
            <Step n="4" text="Kõik õpilased saavad personaalse tagasiside" />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Sobib:</span>
            <Badge color="#1C2832">Õpetaja</Badge>
            <Badge color="#0369a1">Klassijuhataja</Badge>
          </div>
        </div>
      </div>

      {/* ── ROLE CARDS ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 48 }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 12 }}>
          Rollid
        </p>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginBottom: 28 }}>
          Mida see tähendab sinu jaoks?
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Teacher */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderLeft: '4px solid #1C2832',
              borderRadius: 8,
              padding: '24px 24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>🧑‍🏫</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1C2832' }}>Õpetajale</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Aineõpetaja · Klassijuhataja</div>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 8,
              }}
            >
              {[
                'Analüüsi terve klass minutitega',
                'Vaata iga õpilase tagasisidet',
                'Kinnita ja jaga tulemusi kontrollitult',
                'Näed kogu klassi edusamme ühes vaates',
                'Säästab tunde tagasiside kirjutamise pealt',
              ].map((item) => (
                <div key={item} style={{ fontSize: 13, color: '#4b5563', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Student */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderLeft: '4px solid #2563eb',
              borderRadius: 8,
              padding: '24px 24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>🎓</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1C2832' }}>Õpilasele</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Põhikool · Gümnaasium</div>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 8,
              }}
            >
              {[
                'Vaata oma kontrolltöö tagasisidet',
                'Tea täpselt mis läks hästi ja mis mitte',
                'Jälgi edusamme aja jooksul',
                'Saa soovitused, mida edasi harjutada',
              ].map((item) => (
                <div key={item} style={{ fontSize: 13, color: '#4b5563', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ color: '#2563eb', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Parent */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderLeft: '4px solid #16a34a',
              borderRadius: 8,
              padding: '24px 24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>👨‍👩‍👧</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1C2832' }}>Lapsevanemale</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Eestkostja · Vanem</div>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 8,
              }}
            >
              {[
                'Otsusta millistes ainetes AI-d kasutada',
                'Vali ained milles soovid tagasisidet',
                'Näe lapse edusamme ühes kohas',
                'Tühjenda nõusolek igal ajal',
                'Sinu otsus, sinu kontroll',
                'Lapse andmeid ei jagata kolmandatele',
              ].map((item) => (
                <div key={item} style={{ fontSize: 13, color: '#4b5563', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── HOW AI WORKS ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#F8F3DA',
          border: '1.5px solid #DAD0A1',
          borderRadius: 10,
          padding: '32px 32px',
          marginBottom: 40,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
          Kuidas AI tagasiside toimib?
        </h2>
        <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6, marginBottom: 24 }}>
          Rakendus kasutab Claude AI mudelit (Anthropic), mis analüüsib fotot eesti riikliku ainekava kontekstis
          ja koostab isikliku, konstruktiivse tagasiside eesti keeles.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 16,
          }}
        >
          {[
            { icon: '📷', title: 'Foto üles', text: 'Pildistab töövihiku, kontrolltöö lehe' },
            { icon: '🤖', title: 'AI analüüs', text: 'Claude loeb teksti ja hindab ainekava järgi' },
            { icon: '📝', title: 'Tagasiside', text: 'Tugevused, paranduskohad, soovitused' },
            { icon: '🔒', title: 'Privaatne', text: 'Fotosid ei salvestata, GDPR-iga kooskõlas' },
          ].map(({ icon, title, text }) => (
            <div key={title} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1C2832', marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5 }}>{text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SUBJECTS ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
          Toetatud ained
        </h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
          Tagasiside põhineb Eesti riiklikul õppekaval (RÕK 2024) põhikooli ja gümnaasiumi ainetes.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            'Füüsika', 'Matemaatika', 'Keemia', 'Bioloogia', 'Geograafia',
            'Eesti keel', 'Kirjandus', 'Ajalugu', 'Inglise keel', 'Vene keel',
            'Ühiskonnaõpetus', 'Loodusõpetus', 'Muusika', 'Kunst', '+ veel 45 ainet',
          ].map((s) => (
            <span
              key={s}
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '5px 12px',
                borderRadius: 20,
                background: s.startsWith('+') ? '#1C2832' : '#F8F3DA',
                color: s.startsWith('+') ? '#F8F3DA' : '#1C2832',
                border: '1.5px solid #DAD0A1',
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* ── CTA BOTTOM ───────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#1C2832',
          borderRadius: 10,
          padding: '36px 36px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#F8F3DA', marginBottom: 8 }}>
          Valmis alustama?
        </h2>
        <p style={{ fontSize: 15, color: '#F8F3DA', opacity: 0.75, marginBottom: 28 }}>
          Logi sisse oma kontoga või küsi koolihaldurit sind registreerima.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href={isLoggedIn ? dashHref : '/auth/login'}
            style={{
              background: '#F8F3DA',
              color: '#1C2832',
              fontWeight: 700,
              fontSize: 15,
              padding: '13px 32px',
              textDecoration: 'none',
              borderRadius: 6,
            }}
          >
            {isLoggedIn ? 'Mine töölauale →' : 'Logi sisse →'}
          </Link>
          <Link
            href="/demo"
            style={{
              background: 'transparent',
              color: '#F8F3DA',
              fontWeight: 600,
              fontSize: 15,
              padding: '13px 28px',
              textDecoration: 'none',
              borderRadius: 6,
              border: '1.5px solid rgba(248,243,218,0.35)',
            }}
          >
            Vaata näidiseid
          </Link>
        </div>
        <p style={{ fontSize: 12, color: '#F8F3DA', opacity: 0.45, marginTop: 20 }}>
          Prototüüp · Loodud Eesti koolide jaoks · <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>Privaatsuspoliitika</Link>
        </p>
      </div>

    </div>
  );
}
