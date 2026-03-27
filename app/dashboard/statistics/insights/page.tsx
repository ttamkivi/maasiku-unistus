'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface TopicStat {
  topic: string;
  testCount: number;
  resultCount: number;
  avgScore: number | null;
  weakAreas: string[];
}

interface ClassStat {
  classId: string | null;
  className: string;
  studentCount: number;
  resultCount: number;
  avgScore: number | null;
}

interface StudentStat {
  studentId: string | null;
  studentName: string;
  resultCount: number;
  avgScore: number | null;
  weakTopics: string[];
}

interface InsightsData {
  topicStats: TopicStat[];
  classStats: ClassStat[];
  studentStats: StudentStat[];
  weakSpots: { topic: string; issue: string; count: number }[];
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'topics' | 'classes' | 'students' | 'weak'>('topics');

  useEffect(() => {
    fetch('/api/statistics/insights')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Sub-navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        <Link
          href="/dashboard/statistics"
          style={{
            fontSize: 13, fontWeight: 600, color: '#1C2832', background: '#F8F3DA',
            border: '1.5px solid #DAD0A1', padding: '7px 14px', borderRadius: 5, textDecoration: 'none',
          }}
        >
          Ülevaade
        </Link>
        <Link
          href="/dashboard/statistics/ai-improvement"
          style={{
            fontSize: 13, fontWeight: 600, color: '#1C2832', background: '#F8F3DA',
            border: '1.5px solid #DAD0A1', padding: '7px 14px', borderRadius: 5, textDecoration: 'none',
          }}
        >
          AI mudeli parandamine
        </Link>
        <Link
          href="/dashboard/statistics/insights"
          style={{
            fontSize: 13, fontWeight: 700, color: '#fff', background: '#1C2832',
            padding: '7px 14px', borderRadius: 5, textDecoration: 'none',
          }}
        >
          Analüüs ja nõrkused
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', margin: '0 0 8px 0' }}>
        Analüüs ja nõrkused
      </h1>
      <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.65, marginBottom: 20, lineHeight: 1.6 }}>
        Ülevaade kontrolltööde tulemustest teemade, klasside ja õpilaste lõikes. Aitab mõista, kus on nõrgad kohad ja kuhu fookust suunata.
      </p>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #DAD0A1' }}>
        {([
          { key: 'topics' as const, label: 'Teemad' },
          { key: 'classes' as const, label: 'Klassid' },
          { key: 'students' as const, label: 'Õpilased' },
          { key: 'weak' as const, label: 'Nõrgad kohad' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            style={{
              padding: '10px 18px', fontSize: 13, fontWeight: view === t.key ? 700 : 500,
              color: view === t.key ? '#1C2832' : '#6b7280',
              background: view === t.key ? '#F8F3DA' : 'transparent',
              border: 'none', borderBottom: view === t.key ? '2px solid #1C2832' : '2px solid transparent',
              cursor: 'pointer', marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Laadin...</div>
      ) : !data ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Andmete laadimine ebaõnnestus.</div>
      ) : (
        <>
          {/* === TOPICS VIEW === */}
          {view === 'topics' && (
            <div>
              {data.topicStats.length === 0 ? (
                <EmptyState text="Teemade statistikat pole veel piisavalt andmeid." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.topicStats.map((t, i) => (
                    <div key={i} style={{
                      background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6,
                      padding: '14px 18px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1C2832' }}>
                          {t.topic || 'Teema määramata'}
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280' }}>
                          <span>{t.testCount} tööd</span>
                          <span>{t.resultCount} tulemust</span>
                          {t.avgScore !== null && (
                            <span style={{
                              fontWeight: 700,
                              color: t.avgScore >= 70 ? '#16a34a' : t.avgScore >= 50 ? '#d97706' : '#dc2626',
                            }}>
                              {t.avgScore.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                      {t.avgScore !== null && (
                        <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3, width: `${Math.min(100, t.avgScore)}%`,
                            background: t.avgScore >= 70 ? '#16a34a' : t.avgScore >= 50 ? '#d97706' : '#dc2626',
                          }} />
                        </div>
                      )}
                      {t.weakAreas.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626', lineHeight: 1.5 }}>
                          Nõrgad kohad: {t.weakAreas.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === CLASSES VIEW === */}
          {view === 'classes' && (
            <div>
              {data.classStats.length === 0 ? (
                <EmptyState text="Klasside statistikat pole veel piisavalt andmeid." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.classStats.map((c, i) => (
                    <div key={i} style={{
                      background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6,
                      padding: '14px 18px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1C2832' }}>
                          {c.className}
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280' }}>
                          <span>{c.studentCount} õpilast</span>
                          <span>{c.resultCount} tulemust</span>
                          {c.avgScore !== null && (
                            <span style={{
                              fontWeight: 700,
                              color: c.avgScore >= 70 ? '#16a34a' : c.avgScore >= 50 ? '#d97706' : '#dc2626',
                            }}>
                              {c.avgScore.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                      {c.avgScore !== null && (
                        <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
                          <div style={{
                            height: '100%', borderRadius: 3, width: `${Math.min(100, c.avgScore)}%`,
                            background: c.avgScore >= 70 ? '#16a34a' : c.avgScore >= 50 ? '#d97706' : '#dc2626',
                          }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === STUDENTS VIEW === */}
          {view === 'students' && (
            <div>
              {data.studentStats.length === 0 ? (
                <EmptyState text="Õpilaste statistikat pole veel piisavalt andmeid." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.studentStats.map((s, i) => (
                    <div key={i} style={{
                      background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6,
                      padding: '12px 16px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      flexWrap: 'wrap', gap: 8,
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>
                          {s.studentName}
                        </div>
                        {s.weakTopics.length > 0 && (
                          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>
                            Vajab harjutamist: {s.weakTopics.join(', ')}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, color: '#6b7280' }}>
                        <span>{s.resultCount} tulemust</span>
                        {s.avgScore !== null && (
                          <span style={{
                            fontWeight: 700, fontSize: 14,
                            color: s.avgScore >= 70 ? '#16a34a' : s.avgScore >= 50 ? '#d97706' : '#dc2626',
                          }}>
                            {s.avgScore.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === WEAK SPOTS VIEW === */}
          {view === 'weak' && (
            <div>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>
                AI tagasiside põhjal tuvastatud sagedased probleemid. Mida rohkem esinemisi, seda suurem vajadus seda teemat korrata.
              </p>
              {data.weakSpots.length === 0 ? (
                <EmptyState text="Nõrkade kohtade analüüsiks pole veel piisavalt andmeid." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.weakSpots.map((w, i) => (
                    <div key={i} style={{
                      background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6,
                      padding: '12px 16px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      flexWrap: 'wrap', gap: 8,
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>
                          {w.topic}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                          {w.issue}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 13, fontWeight: 700,
                        color: w.count >= 5 ? '#dc2626' : w.count >= 3 ? '#d97706' : '#6b7280',
                      }}>
                        {w.count}x
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{
      padding: 32, textAlign: 'center', color: '#6b7280',
      background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6,
    }}>
      {text}
    </div>
  );
}
