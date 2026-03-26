import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';

const DIMENSION_LABELS: Record<string, string> = {
  accuracy: 'Füüsika täpsus',
  classification: 'Vea klassifikatsioon',
  scoring: 'Hindamise järjepidevus',
  curriculum: 'Õppekava vastavus',
  tone: 'Toon ja tagasiside teadus',
  completeness: 'Täielikkus',
};

const SEVERITY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: '#fecaca', color: '#991b1b', label: 'Kriitiline' },
  important: { bg: '#fed7aa', color: '#c2410c', label: 'Oluline' },
  minor: { bg: '#fef08a', color: '#854d0e', label: 'Väiksem' },
};

export default async function AIBrainPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || session.user.role !== 'SUPERADMIN') {
    redirect('/dashboard');
  }

  // Load all patterns
  const patterns = await db.feedbackPattern.findMany({
    where: { active: true },
    orderBy: [{ frequency: 'desc' }, { updatedAt: 'desc' }],
  });

  // Load QA stats from recent results
  const recentResults = await db.testResult.findMany({
    where: { analyzedAt: { not: null } },
    select: {
      qaScore: true,
      qaLog: true,
      qaCompletedAt: true,
      analyzedAt: true,
    },
    orderBy: { analyzedAt: 'desc' },
    take: 100,
  });

  // Calculate stats
  const totalPatterns = patterns.length;
  const totalObservations = patterns.reduce((sum: number, p: { frequency: number }) => sum + p.frequency, 0);
  const qaScores = recentResults
    .map((r) => (r as Record<string, unknown>).qaScore as number | null)
    .filter((s): s is number => s !== null);
  const avgQaScore = qaScores.length > 0
    ? Math.round(qaScores.reduce((a, b) => a + b, 0) / qaScores.length)
    : null;
  const qaCompletedCount = recentResults.filter(
    (r) => (r as Record<string, unknown>).qaCompletedAt !== null
  ).length;

  // Group patterns by dimension
  const byDimension = new Map<string, typeof patterns>();
  for (const p of patterns) {
    const list = byDimension.get(p.dimension) || [];
    list.push(p);
    byDimension.set(p.dimension, list);
  }

  // Frequency distribution for "brain growth" chart
  const highFreq = patterns.filter((p: { frequency: number }) => p.frequency >= 5).length;
  const medFreq = patterns.filter((p: { frequency: number }) => p.frequency >= 2 && p.frequency < 5).length;
  const lowFreq = patterns.filter((p: { frequency: number }) => p.frequency === 1).length;

  const card = {
    background: '#fff',
    border: '1.5px solid #DAD0A1',
    padding: '20px 18px',
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'underline' }}>
          ← Admin
        </Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginBottom: 4 }}>
        AI Teacher&apos;s Brain
      </h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
        Sisemine AI-õpetaja õpib igast kontrolltööst. Mida rohkem teste analüüsitakse, seda targemaks ta saab.
      </p>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ marginBottom: 28 }}>
        <div style={{ ...card, borderTop: '3px solid #1C2832' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#1C2832' }}>{totalPatterns}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Õpitud mustreid</div>
        </div>
        <div style={{ ...card, borderTop: '3px solid #DAD0A1' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#1C2832' }}>{totalObservations}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Vaatlusi kokku</div>
        </div>
        <div style={{ ...card, borderTop: '3px solid #22c55e' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#1C2832' }}>
            {avgQaScore !== null ? `${avgQaScore}%` : '—'}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Keskmine QA skoor</div>
        </div>
        <div style={{ ...card, borderTop: '3px solid #6d28d9' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#1C2832' }}>{qaCompletedCount}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>QA läbitud</div>
        </div>
      </div>

      {/* Brain maturity indicator */}
      <div style={{ ...card, marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', marginBottom: 12 }}>
          AI Teacher&apos;s Brain — küpsus
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          Korduvad mustrid (nähtud 5+ korda) on kõige väärtuslikumad — need on kinnitatud õppetunnid, mis muudavad igat järgmist analüüsi paremaks.
        </p>
        <div style={{ display: 'flex', gap: 4, height: 24, marginBottom: 8 }}>
          {highFreq > 0 && (
            <div style={{
              flex: highFreq,
              background: '#22c55e',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              minWidth: 30,
            }}>
              {highFreq}
            </div>
          )}
          {medFreq > 0 && (
            <div style={{
              flex: medFreq,
              background: '#DAD0A1',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#1C2832',
              minWidth: 30,
            }}>
              {medFreq}
            </div>
          )}
          {lowFreq > 0 && (
            <div style={{
              flex: lowFreq,
              background: '#f3f4f6',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#6b7280',
              minWidth: 30,
            }}>
              {lowFreq}
            </div>
          )}
          {totalPatterns === 0 && (
            <div style={{
              flex: 1,
              background: '#f3f4f6',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#9ca3af',
            }}>
              Mustreid pole veel — analüüsi kontrolltöid, et AI saaks õppida
            </div>
          )}
        </div>
        {totalPatterns > 0 && (
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e' }} />
              Kinnitatud ({highFreq})
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#DAD0A1' }} />
              Arenev ({medFreq})
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f3f4f6', border: '1px solid #d1d5db' }} />
              Uus ({lowFreq})
            </span>
          </div>
        )}
      </div>

      {/* Patterns by dimension */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C2832', marginBottom: 16 }}>
        Õpitud mustrid dimensioonide kaupa
      </h2>

      {totalPatterns === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
          <p style={{ fontSize: 15, color: '#1C2832', fontWeight: 600, marginBottom: 8 }}>
            AI Teacher&apos;s Brain on tühi
          </p>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Analüüsi kontrolltöid, et QA pass saaks hakata mustreid tuvastama ja AI-d treenima.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Array.from(byDimension.entries()).map(([dimension, dimPatterns]) => (
            <div key={dimension} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C2832', margin: 0 }}>
                  {DIMENSION_LABELS[dimension] || dimension}
                </h3>
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  {dimPatterns.length} mustrit · {dimPatterns.reduce((s: number, p: { frequency: number }) => s + p.frequency, 0)} vaatlust
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dimPatterns.slice(0, 10).map((p) => {
                  const sev = SEVERITY_STYLES[p.severity] || SEVERITY_STYLES.minor;
                  return (
                    <div key={p.id} style={{ borderLeft: `3px solid ${sev.color}`, paddingLeft: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          background: sev.bg,
                          color: sev.color,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 3,
                        }}>
                          {sev.label}
                        </span>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                          {p.frequency}x nähtud
                        </span>
                        {p.topic && (
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>· {p.topic}</span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: '#1C2832', margin: '0 0 2px 0' }}>
                        <strong>Probleem:</strong> {p.pattern}
                      </p>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
                        <strong>Parandus:</strong> {p.correction}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
