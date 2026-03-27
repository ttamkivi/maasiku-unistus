'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

interface FeedbackPattern {
  id: string;
  dimension: string;
  pattern: string;
  correction: string;
  example: string | null;
  topic: string | null;
  grade: string | null;
  frequency: number;
  severity: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RecentResult {
  id: string;
  testTitle: string;
  studentName: string | null;
  score: number | null;
  maxScore: number | null;
  status: string;
  analyzedAt: string | null;
  qaScore: number | null;
  hasTeacherEdits: boolean;
}

const DIMENSION_LABELS: Record<string, string> = {
  accuracy: 'Täpsus',
  classification: 'Klassifitseerimine',
  scoring: 'Hindamine',
  curriculum: 'Õppekava',
  tone: 'Toon',
  completeness: 'Täielikkus',
  explanation: 'Selgitus',
  formula: 'Valem',
  other: 'Muu',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  important: '#d97706',
  minor: '#6b7280',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Kriitiline',
  important: 'Oluline',
  minor: 'Väike',
};

export default function AIImprovementPage() {
  const [patterns, setPatterns] = useState<FeedbackPattern[]>([]);
  const [recentResults, setRecentResults] = useState<RecentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'patterns' | 'recent' | 'add'>('patterns');

  // Add form state
  const [form, setForm] = useState({
    dimension: 'accuracy',
    pattern: '',
    correction: '',
    example: '',
    topic: '',
    grade: '',
    severity: 'important',
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/statistics/patterns').then(r => r.ok ? r.json() : { patterns: [] }),
      fetch('/api/statistics/recent-results').then(r => r.ok ? r.json() : { results: [] }),
    ])
      .then(([pData, rData]) => {
        setPatterns(pData.patterns || []);
        setRecentResults(rData.results || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAddPattern(e: React.FormEvent) {
    e.preventDefault();
    if (!form.pattern.trim() || !form.correction.trim()) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/statistics/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimension: form.dimension,
          pattern: form.pattern.trim(),
          correction: form.correction.trim(),
          example: form.example.trim() || null,
          topic: form.topic.trim() || null,
          grade: form.grade.trim() || null,
          severity: form.severity,
        }),
      });
      if (res.ok) {
        setSaveMsg('Muster salvestatud!');
        setForm({ dimension: 'accuracy', pattern: '', correction: '', example: '', topic: '', grade: '', severity: 'important' });
        loadData();
        setTimeout(() => { setSaveMsg(''); setTab('patterns'); }, 1500);
      } else {
        const err = await res.json();
        setSaveMsg(err.error || 'Salvestamine ebaõnnestus');
      }
    } catch {
      setSaveMsg('Võrgu viga');
    } finally {
      setSaving(false);
    }
  }

  async function togglePattern(id: string, active: boolean) {
    await fetch('/api/statistics/patterns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active }),
    });
    setPatterns(prev => prev.map(p => p.id === id ? { ...p, active } : p));
  }

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
            fontSize: 13, fontWeight: 700, color: '#fff', background: '#1C2832',
            padding: '7px 14px', borderRadius: 5, textDecoration: 'none',
          }}
        >
          AI mudeli parandamine
        </Link>
        <Link
          href="/dashboard/statistics/insights"
          style={{
            fontSize: 13, fontWeight: 600, color: '#1C2832', background: '#F8F3DA',
            border: '1.5px solid #DAD0A1', padding: '7px 14px', borderRadius: 5, textDecoration: 'none',
          }}
        >
          Analüüs ja nõrkused
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', margin: '0 0 8px 0' }}>
        AI mudeli parandamine
      </h1>
      <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.65, marginBottom: 20, lineHeight: 1.6 }}>
        Siin saate vaadata ja parandada AI tehtud vigu. Iga parandus salvestatakse õpimustrisse, mis muudab tulevase tagasiside täpsemaks.
      </p>

      {/* Inner tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #DAD0A1' }}>
        {([
          { key: 'patterns' as const, label: `Õpimustrid (${patterns.length})` },
          { key: 'recent' as const, label: 'Hiljutised tulemused' },
          { key: 'add' as const, label: '+ Lisa muster' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 18px', fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? '#1C2832' : '#6b7280',
              background: tab === t.key ? '#F8F3DA' : 'transparent',
              border: 'none', borderBottom: tab === t.key ? '2px solid #1C2832' : '2px solid transparent',
              cursor: 'pointer', marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Laadin...</div>
      ) : (
        <>
          {/* === PATTERNS TAB === */}
          {tab === 'patterns' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {patterns.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#6b7280', background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6 }}>
                  <p style={{ marginBottom: 12 }}>Õpimustreid pole veel lisatud.</p>
                  <button
                    onClick={() => setTab('add')}
                    style={{
                      fontSize: 13, fontWeight: 700, color: '#fff', background: '#1C2832',
                      padding: '8px 16px', border: 'none', borderRadius: 5, cursor: 'pointer',
                    }}
                  >
                    Lisa esimene muster
                  </button>
                </div>
              ) : (
                patterns.map(p => (
                  <div
                    key={p.id}
                    style={{
                      background: p.active ? '#fff' : '#f9fafb',
                      border: '1.5px solid #DAD0A1',
                      borderRadius: 6,
                      padding: '16px 20px',
                      opacity: p.active ? 1 : 0.6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                          background: '#F8F3DA', border: '1px solid #DAD0A1',
                          padding: '2px 8px', borderRadius: 3,
                        }}>
                          {DIMENSION_LABELS[p.dimension] || p.dimension}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: SEVERITY_COLORS[p.severity] || '#6b7280',
                        }}>
                          {SEVERITY_LABELS[p.severity] || p.severity}
                        </span>
                        {p.topic && (
                          <span style={{ fontSize: 11, color: '#6b7280' }}>
                            {p.topic}
                          </span>
                        )}
                        {p.grade && (
                          <span style={{ fontSize: 11, color: '#6b7280' }}>
                            Kl. {p.grade}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>
                          {p.frequency}x
                        </span>
                      </div>
                      <button
                        onClick={() => togglePattern(p.id, !p.active)}
                        style={{
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          background: p.active ? '#fef2f2' : '#f0fdf4',
                          color: p.active ? '#dc2626' : '#16a34a',
                          border: `1px solid ${p.active ? '#fecaca' : '#bbf7d0'}`,
                          padding: '3px 10px', borderRadius: 4,
                        }}
                      >
                        {p.active ? 'Keela' : 'Aktiveeri'}
                      </button>
                    </div>
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Viga: </span>
                      <span style={{ fontSize: 13, color: '#1C2832' }}>{p.pattern}</span>
                    </div>
                    <div style={{ marginBottom: p.example ? 6 : 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>Parandus: </span>
                      <span style={{ fontSize: 13, color: '#1C2832' }}>{p.correction}</span>
                    </div>
                    {p.example && (
                      <div style={{ marginTop: 6, padding: '8px 12px', background: '#f9fafb', borderRadius: 4, fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                        <strong>Näide:</strong> {p.example}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* === RECENT RESULTS TAB === */}
          {tab === 'recent' && (
            <div>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>
                Hiljutised AI-analüüsitud tulemused. Tulemused, kus õpetaja on tagasisidet muutnud, on märgitud — need aitavad AI-d õppida.
              </p>
              {recentResults.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#6b7280', background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6 }}>
                  Hiljutisi tulemusi ei leitud.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recentResults.map(r => (
                    <Link
                      key={r.id}
                      href={`/dashboard/results/${r.id}`}
                      style={{
                        background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6,
                        padding: '12px 16px', textDecoration: 'none', color: '#1C2832',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        flexWrap: 'wrap', gap: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {r.testTitle}
                          {r.studentName && <span style={{ fontWeight: 400, opacity: 0.6 }}> — {r.studentName}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                          {r.analyzedAt ? new Date(r.analyzedAt).toLocaleDateString('et-EE') : '—'}
                          {r.score !== null && r.maxScore !== null && (
                            <span> · {r.score}/{r.maxScore}</span>
                          )}
                          {r.qaScore !== null && (
                            <span> · QA: {r.qaScore.toFixed(0)}%</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {r.hasTeacherEdits && (
                          <span style={{
                            fontSize: 11, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8',
                            padding: '2px 8px', borderRadius: 3,
                          }}>
                            Õpetaja parandanud
                          </span>
                        )}
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: '#6b7280',
                          textTransform: 'uppercase',
                        }}>
                          {r.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === ADD PATTERN TAB === */}
          {tab === 'add' && (
            <form onSubmit={handleAddPattern} style={{ background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6, padding: '24px 28px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', margin: '0 0 16px 0' }}>
                Lisa uus õpimuster
              </h3>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
                Kirjeldage AI viga ja kuidas peaks õigesti olema. See muster lisatakse AI prompti, et sama viga enam ei korduks.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#1C2832', display: 'block', marginBottom: 4 }}>Dimensioon *</label>
                  <select
                    value={form.dimension}
                    onChange={e => setForm(f => ({ ...f, dimension: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #d1d5db', borderRadius: 5, fontSize: 14 }}
                  >
                    {Object.entries(DIMENSION_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#1C2832', display: 'block', marginBottom: 4 }}>Tõsidus *</label>
                  <select
                    value={form.severity}
                    onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #d1d5db', borderRadius: 5, fontSize: 14 }}
                  >
                    {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#1C2832', display: 'block', marginBottom: 4 }}>Mida AI valesti teeb? *</label>
                <textarea
                  value={form.pattern}
                  onChange={e => setForm(f => ({ ...f, pattern: e.target.value }))}
                  placeholder="Nt: AI ütleb, et voolu suund on elektronide liikumise suund, kuigi see on kokkuleppeline suund"
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #d1d5db', borderRadius: 5, fontSize: 14, resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#1C2832', display: 'block', marginBottom: 4 }}>Kuidas peaks õigesti olema? *</label>
                <textarea
                  value={form.correction}
                  onChange={e => setForm(f => ({ ...f, correction: e.target.value }))}
                  placeholder="Nt: Voolu kokkuleppeline suund on positiivse laengu liikumise suund (plussist miinusesse)"
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #d1d5db', borderRadius: 5, fontSize: 14, resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#1C2832', display: 'block', marginBottom: 4 }}>Näide (valikuline)</label>
                <textarea
                  value={form.example}
                  onChange={e => setForm(f => ({ ...f, example: e.target.value }))}
                  placeholder="Enne: 'Elektronid liiguvad plussist miinusesse' → Pärast: 'Kokkuleppeline voolu suund on plussist miinusesse, elektronid liiguvad vastupidi'"
                  rows={2}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #d1d5db', borderRadius: 5, fontSize: 14, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#1C2832', display: 'block', marginBottom: 4 }}>Teema (valikuline)</label>
                  <input
                    value={form.topic}
                    onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                    placeholder="Nt: Elektriõpetus"
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #d1d5db', borderRadius: 5, fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#1C2832', display: 'block', marginBottom: 4 }}>Klass (valikuline)</label>
                  <input
                    value={form.grade}
                    onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                    placeholder="Nt: 9"
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #d1d5db', borderRadius: 5, fontSize: 14 }}
                  />
                </div>
              </div>

              {saveMsg && (
                <div style={{
                  padding: '8px 12px', marginBottom: 12, borderRadius: 5, fontSize: 13, fontWeight: 600,
                  background: saveMsg.includes('salvestatud') ? '#f0fdf4' : '#fef2f2',
                  color: saveMsg.includes('salvestatud') ? '#16a34a' : '#dc2626',
                }}>
                  {saveMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                style={{
                  fontSize: 14, fontWeight: 700, color: '#fff', background: '#1C2832',
                  padding: '10px 24px', border: 'none', borderRadius: 5, cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Salvestan...' : 'Salvesta muster'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
