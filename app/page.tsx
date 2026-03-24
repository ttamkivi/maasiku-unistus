import Link from 'next/link';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getLoggedInRole(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) return null;
    const session = await db.session.findUnique({
      where: { token },
      select: { expiresAt: true, user: { select: { role: true } } },
    });
    if (!session || session.expiresAt < new Date()) return null;
    const realRole = session.user.role;
    if (realRole === 'SUPERADMIN') {
      const previewRole = cookieStore.get('ot_preview_role')?.value;
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

// ─── SVG Icons ──────────────────────────────────────────────────────────────

function CameraIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1C2832" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1C2832" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1C2832" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1C2832" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1C2832" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function TeacherIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1C2832" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function StudentIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
    </svg>
  );
}

function ParentIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function WaveDivider({ color = '#DAD0A1', opacity = 0.3 }: { color?: string; opacity?: number }) {
  return (
    <div style={{ width: '100%', overflow: 'hidden', lineHeight: 0, opacity }}>
      <svg viewBox="0 0 1200 40" preserveAspectRatio="none" style={{ width: '100%', height: 40 }}>
        <path d="M0,20 C150,40 350,0 600,20 C850,40 1050,0 1200,20 L1200,40 L0,40 Z" fill={color} />
      </svg>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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
          marginBottom: 0,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
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
          <Badge color="#DAD0A1">AI-põhine tagasiside platvorm õpetajatele</Badge>
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
            Õpetaja Tagasiside
          </h1>
          <p style={{ fontSize: 18, color: '#F8F3DA', opacity: 0.8, maxWidth: 520, lineHeight: 1.6, marginBottom: 32 }}>
            Säästa igal nädalal tunde. AI aitab sul anda igale õpilasele põhjalikku, personaalset tagasisidet — kõikides ainetes.
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
              <>
                <Link
                  href="/auth/register"
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
                  Registreeru →
                </Link>
                <Link
                  href="/auth/login"
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
                  Logi sisse
                </Link>
              </>
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
                border: '1.5px solid rgba(248,243,218,0.2)',
              }}
            >
              Vaata näidist
            </Link>
          </div>
        </div>
      </div>

      <WaveDivider />

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 48, marginTop: 40 }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 12 }}>
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
          <div style={{ marginBottom: 10 }}><ClipboardIcon /></div>
          <Badge color="#1C2832">Kontrolltöö</Badge>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1C2832', marginTop: 10, marginBottom: 8 }}>
            Pildista, analüüsi, jaga
          </h3>
          <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.65, marginBottom: 20 }}>
            Õpetaja pildistab õpilaste töid. AI analüüsib iga tööd ainekava järgi ja koostab isikliku tagasiside.
            Õpetaja vaatab üle, kinnitab ja jagab.
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
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 12 }}>
          Rollid
        </p>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginBottom: 28 }}>
          Mida see tähendab sinu jaoks?
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Teacher */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #1C2832', borderRadius: 8, padding: '24px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <TeacherIcon />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1C2832' }}>Õpetajale</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Aineõpetaja · Klassijuhataja</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
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
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #2563eb', borderRadius: 8, padding: '24px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <StudentIcon />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1C2832' }}>Õpilasele</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Põhikool · Gümnaasium</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
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
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #16a34a', borderRadius: 8, padding: '24px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <ParentIcon />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1C2832' }}>Lapsevanemale</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Eestkostja · Vanem</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
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

      <WaveDivider />

      {/* ── HOW AI WORKS ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#FAF8F0',
          border: '1.5px solid #DAD0A1',
          borderRadius: 10,
          padding: '32px 32px',
          marginBottom: 40,
          marginTop: 40,
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
            { Icon: CameraIcon, title: 'Foto üles', text: 'Pildistab töövihiku, kontrolltöö lehe' },
            { Icon: SparkleIcon, title: 'AI analüüs', text: 'Claude loeb teksti ja hindab ainekava järgi' },
            { Icon: DocumentIcon, title: 'Tagasiside', text: 'Tugevused, paranduskohad, soovitused' },
            { Icon: ShieldIcon, title: 'Privaatne', text: 'Fotosid ei salvestata, GDPR-iga kooskõlas' },
          ].map(({ Icon, title, text }) => (
            <div key={title} style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Icon /></div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1C2832', marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5 }}>{text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SUBJECTS ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 48 }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 12 }}>
          Ained
        </p>
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
                background: s.startsWith('+') ? '#1C2832' : '#FAF8F0',
                color: s.startsWith('+') ? '#F8F3DA' : '#1C2832',
                border: '1.5px solid #DAD0A1',
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <WaveDivider />

      {/* ── CTA BOTTOM ───────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#1C2832',
          borderRadius: 10,
          padding: '36px 36px',
          textAlign: 'center',
          marginTop: 40,
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#F8F3DA', marginBottom: 8 }}>
          Valmis alustama?
        </h2>
        <p style={{ fontSize: 15, color: '#F8F3DA', opacity: 0.75, marginBottom: 28 }}>
          {isLoggedIn ? 'Jätka oma töölaual.' : 'Loo konto ja alusta minutitega.'}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {isLoggedIn ? (
            <Link
              href={dashHref}
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
              Mine töölauale →
            </Link>
          ) : (
            <>
              <Link
                href="/auth/register"
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
                Registreeru →
              </Link>
              <Link
                href="/auth/login"
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
                Logi sisse
              </Link>
            </>
          )}
        </div>
        <p style={{ fontSize: 12, color: '#F8F3DA', opacity: 0.45, marginTop: 20 }}>
          Loodud Eesti koolide jaoks · <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>Privaatsuspoliitika</Link>
        </p>
      </div>

    </div>
  );
}
