'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

/* ─── Types ─── */

interface ProviderConfig {
  id: string;
  schoolId: string;
  provider: string;
  displayName: string;
  apiKeyMasked: string;
  defaultModel: string;
  allowedModels: string[];
  isActive: boolean;
  isDefault: boolean;
  school: { id: string; name: string };
}

interface ModelInfo {
  id: string;
  label: string;
  maxTokens: number;
}

interface ProviderCatalogue {
  [key: string]: {
    id: string;
    name: string;
    models: ModelInfo[];
  };
}

interface UsageLimit {
  id: string;
  schoolId: string;
  teacherProfileId: string | null;
  monthlyTokenLimit: number;
  monthlyRequestLimit: number;
  isActive: boolean;
  teacherName: string | null;
  teacherEmail: string | null;
  schoolName: string;
}

interface TeacherOption {
  teacherProfileId: string;
  name: string;
  email: string;
}

interface MonthUsageEntry {
  teacherProfileId: string;
  totalTokens: number;
  requestCount: number;
}

/* ─── Page ─── */

export default function AISettingsPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [catalogue, setCatalogue] = useState<ProviderCatalogue>({});
  const [limits, setLimits] = useState<UsageLimit[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [monthUsage, setMonthUsage] = useState<MonthUsageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'providers' | 'limits' | 'usage'>('providers');

  // Provider form
  const [provForm, setProvForm] = useState({
    schoolId: '',
    provider: 'anthropic',
    apiKey: '',
    defaultModel: '',
    allowedModels: [] as string[],
    isDefault: false,
  });
  const [provSaving, setProvSaving] = useState(false);
  const [provMsg, setProvMsg] = useState('');

  // Limit form
  const [limForm, setLimForm] = useState({
    teacherProfileId: '',
    monthlyTokenLimit: 500000,
    monthlyRequestLimit: 200,
  });
  const [limSaving, setLimSaving] = useState(false);
  const [limMsg, setLimMsg] = useState('');

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/admin/ai-providers').then(r => r.ok ? r.json() : { providers: [], catalogue: {} }),
      fetch('/api/admin/usage-limits').then(r => r.ok ? r.json() : { limits: [], teachers: [], monthUsage: [] }),
    ])
      .then(([pData, lData]) => {
        setProviders(pData.providers || []);
        setCatalogue(pData.catalogue || {});
        setLimits(lData.limits || []);
        setTeachers(lData.teachers || []);
        setMonthUsage(lData.monthUsage || []);
        // Set schoolId from first provider or first limit
        const sid = pData.providers?.[0]?.schoolId || lData.limits?.[0]?.schoolId || '';
        setProvForm(f => ({ ...f, schoolId: sid }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // When provider changes in form, set default model
  useEffect(() => {
    const cat = catalogue[provForm.provider];
    if (cat) {
      setProvForm(f => ({
        ...f,
        defaultModel: cat.models[0]?.id || '',
        allowedModels: cat.models.map(m => m.id),
      }));
    }
  }, [provForm.provider, catalogue]);

  async function handleSaveProvider(e: React.FormEvent) {
    e.preventDefault();
    if (!provForm.apiKey) return;
    setProvSaving(true);
    setProvMsg('');
    try {
      const res = await fetch('/api/admin/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provForm),
      });
      if (res.ok) {
        setProvMsg('Pakkuja salvestatud!');
        setProvForm(f => ({ ...f, apiKey: '' }));
        loadAll();
        setTimeout(() => setProvMsg(''), 3000);
      } else {
        const err = await res.json();
        setProvMsg(err.error || 'Viga');
      }
    } catch { setProvMsg('Võrgu viga'); }
    finally { setProvSaving(false); }
  }

  async function handleDeleteProvider(id: string) {
    await fetch(`/api/admin/ai-providers?id=${id}`, { method: 'DELETE' });
    loadAll();
  }

  async function handleSaveLimit(e: React.FormEvent) {
    e.preventDefault();
    setLimSaving(true);
    setLimMsg('');
    try {
      const res = await fetch('/api/admin/usage-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: provForm.schoolId,
          teacherProfileId: limForm.teacherProfileId || null,
          monthlyTokenLimit: limForm.monthlyTokenLimit,
          monthlyRequestLimit: limForm.monthlyRequestLimit,
        }),
      });
      if (res.ok) {
        setLimMsg('Limiit salvestatud!');
        loadAll();
        setTimeout(() => setLimMsg(''), 3000);
      } else {
        const err = await res.json();
        setLimMsg(err.error || 'Viga');
      }
    } catch { setLimMsg('Võrgu viga'); }
    finally { setLimSaving(false); }
  }

  async function handleDeleteLimit(id: string) {
    await fetch(`/api/admin/usage-limits?id=${id}`, { method: 'DELETE' });
    loadAll();
  }

  const TABS = [
    { key: 'providers' as const, label: 'AI pakkujad & API võtmed' },
    { key: 'limits' as const,    label: 'Kasutuslimiidid' },
    { key: 'usage' as const,     label: 'Kuu kasutus' },
  ];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/admin" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>← Admin</Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', margin: '0 0 8px 0' }}>
        AI seaded
      </h1>
      <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.65, marginBottom: 24, lineHeight: 1.6 }}>
        Konfigureerige AI pakkujad, API võtmed ja õpetajate kasutuslimiidid.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #DAD0A1', flexWrap: 'wrap' }}>
        {TABS.map(t => (
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
          {/* ════════ PROVIDERS TAB ════════ */}
          {tab === 'providers' && (
            <>
              {/* Existing providers */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1C2832', marginBottom: 12 }}>
                  Konfigureeritud pakkujad
                </h3>
                {providers.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6 }}>
                    Ühtegi AI pakkujat pole veel seadistatud. Süsteem kasutab vaikimisi Anthropic Claude mudelit.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {providers.map(p => (
                      <div key={p.id} style={{
                        background: p.isActive ? '#fff' : '#f9fafb',
                        border: '1.5px solid #DAD0A1', borderRadius: 6,
                        padding: '14px 18px', opacity: p.isActive ? 1 : 0.5,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        flexWrap: 'wrap', gap: 8,
                      }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#1C2832' }}>
                            {p.displayName}
                            {p.isDefault && (
                              <span style={{
                                marginLeft: 8, fontSize: 10, fontWeight: 700,
                                background: '#1C2832', color: '#F8F3DA',
                                padding: '2px 6px', borderRadius: 3,
                              }}>
                                Vaikimisi
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                            Mudel: {p.defaultModel} · Võti: {p.apiKeyMasked}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                            Lubatud mudelid: {p.allowedModels.join(', ')}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteProvider(p.id)}
                          style={{
                            fontSize: 12, fontWeight: 600, color: '#dc2626', background: '#fef2f2',
                            border: '1px solid #fecaca', padding: '5px 12px', borderRadius: 4, cursor: 'pointer',
                          }}
                        >
                          Eemalda
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add provider form */}
              <form onSubmit={handleSaveProvider} style={{
                background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6, padding: '20px 24px',
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1C2832', margin: '0 0 16px 0' }}>
                  Lisa AI pakkuja
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Pakkuja *</label>
                    <select
                      value={provForm.provider}
                      onChange={e => setProvForm(f => ({ ...f, provider: e.target.value }))}
                      style={selectStyle}
                    >
                      {Object.values(catalogue).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Vaikimisi mudel *</label>
                    <select
                      value={provForm.defaultModel}
                      onChange={e => setProvForm(f => ({ ...f, defaultModel: e.target.value }))}
                      style={selectStyle}
                    >
                      {(catalogue[provForm.provider]?.models || []).map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>API võti *</label>
                  <input
                    type="password"
                    value={provForm.apiKey}
                    onChange={e => setProvForm(f => ({ ...f, apiKey: e.target.value }))}
                    placeholder={provForm.provider === 'anthropic' ? 'sk-ant-...' : provForm.provider === 'openai' ? 'sk-...' : 'AIza...'}
                    style={{ ...selectStyle, fontFamily: 'monospace' }}
                    required
                  />
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    Võti krüpteeritakse ja salvestatakse turvaliselt. Seda ei kuvata kunagi tagasi.
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Lubatud mudelid</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(catalogue[provForm.provider]?.models || []).map(m => {
                      const checked = provForm.allowedModels.includes(m.id);
                      return (
                        <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setProvForm(f => ({
                                ...f,
                                allowedModels: checked
                                  ? f.allowedModels.filter(x => x !== m.id)
                                  : [...f.allowedModels, m.id],
                              }));
                            }}
                          />
                          {m.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={provForm.isDefault}
                    onChange={e => setProvForm(f => ({ ...f, isDefault: e.target.checked }))}
                  />
                  <strong>Määra kooli vaikimisi pakkujaks</strong>
                </label>

                {provMsg && (
                  <div style={{
                    padding: '8px 12px', marginBottom: 12, borderRadius: 5, fontSize: 13, fontWeight: 600,
                    background: provMsg.includes('salvestatud') ? '#f0fdf4' : '#fef2f2',
                    color: provMsg.includes('salvestatud') ? '#16a34a' : '#dc2626',
                  }}>
                    {provMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={provSaving}
                  style={btnStyle(provSaving)}
                >
                  {provSaving ? 'Salvestan...' : 'Salvesta pakkuja'}
                </button>
              </form>
            </>
          )}

          {/* ════════ LIMITS TAB ════════ */}
          {tab === 'limits' && (
            <>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1C2832', marginBottom: 12 }}>
                  Kehtivad limiidid
                </h3>
                {limits.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6 }}>
                    Limiite pole seatud. Kõik õpetajad saavad kasutada AI-d piiranguteta.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {limits.map(l => {
                      const usage = monthUsage.find(u => l.teacherProfileId && u.teacherProfileId === l.teacherProfileId);
                      const pct = usage ? Math.min(100, (usage.totalTokens / l.monthlyTokenLimit) * 100) : 0;
                      return (
                        <div key={l.id} style={{
                          background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6, padding: '14px 18px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                            <div>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#1C2832' }}>
                                {l.teacherProfileId ? (l.teacherName || 'Õpetaja') : 'Kooli vaikimisi limiit'}
                              </span>
                              {l.teacherEmail && (
                                <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>{l.teacherEmail}</span>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteLimit(l.id)}
                              style={{
                                fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fef2f2',
                                border: '1px solid #fecaca', padding: '3px 10px', borderRadius: 4, cursor: 'pointer',
                              }}
                            >
                              Eemalda
                            </button>
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                            Tokenid: {l.monthlyTokenLimit.toLocaleString()} / kuu · Päringud: {l.monthlyRequestLimit} / kuu
                          </div>
                          {usage && (
                            <>
                              <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                                <div style={{
                                  height: '100%', borderRadius: 3, width: `${pct}%`,
                                  background: pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#16a34a',
                                }} />
                              </div>
                              <div style={{ fontSize: 11, color: '#6b7280' }}>
                                Kasutatud: {usage.totalTokens.toLocaleString()} tokenid ({pct.toFixed(0)}%), {usage.requestCount} päringut
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add limit form */}
              <form onSubmit={handleSaveLimit} style={{
                background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6, padding: '20px 24px',
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1C2832', margin: '0 0 16px 0' }}>
                  Lisa limiit
                </h3>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Õpetaja</label>
                  <select
                    value={limForm.teacherProfileId}
                    onChange={e => setLimForm(f => ({ ...f, teacherProfileId: e.target.value }))}
                    style={selectStyle}
                  >
                    <option value="">Kooli vaikimisi (kõik õpetajad)</option>
                    {teachers.map(t => (
                      <option key={t.teacherProfileId} value={t.teacherProfileId}>
                        {t.name} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Tokenite limiit / kuu</label>
                    <input
                      type="number"
                      value={limForm.monthlyTokenLimit}
                      onChange={e => setLimForm(f => ({ ...f, monthlyTokenLimit: Number(e.target.value) }))}
                      min={1000}
                      max={10000000}
                      step={10000}
                      style={selectStyle}
                    />
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                      ~500 000 tokenid ≈ 100 kontrolltöö analüüsi
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Päringute limiit / kuu</label>
                    <input
                      type="number"
                      value={limForm.monthlyRequestLimit}
                      onChange={e => setLimForm(f => ({ ...f, monthlyRequestLimit: Number(e.target.value) }))}
                      min={1}
                      max={10000}
                      style={selectStyle}
                    />
                  </div>
                </div>

                {limMsg && (
                  <div style={{
                    padding: '8px 12px', marginBottom: 12, borderRadius: 5, fontSize: 13, fontWeight: 600,
                    background: limMsg.includes('salvestatud') ? '#f0fdf4' : '#fef2f2',
                    color: limMsg.includes('salvestatud') ? '#16a34a' : '#dc2626',
                  }}>
                    {limMsg}
                  </div>
                )}

                <button type="submit" disabled={limSaving} style={btnStyle(limSaving)}>
                  {limSaving ? 'Salvestan...' : 'Salvesta limiit'}
                </button>
              </form>
            </>
          )}

          {/* ════════ USAGE TAB ════════ */}
          {tab === 'usage' && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1C2832', marginBottom: 12 }}>
                Selle kuu kasutus
              </h3>
              {monthUsage.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6 }}>
                  Sel kuul pole veel AI päringuid tehtud.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {monthUsage
                    .sort((a, b) => b.totalTokens - a.totalTokens)
                    .map(u => {
                      const teacher = teachers.find(t => t.teacherProfileId === u.teacherProfileId);
                      const limit = limits.find(l =>
                        l.teacherProfileId === u.teacherProfileId || l.teacherProfileId === null
                      );
                      const maxTokens = limit?.monthlyTokenLimit || 0;
                      const pct = maxTokens > 0 ? Math.min(100, (u.totalTokens / maxTokens) * 100) : 0;

                      return (
                        <div key={u.teacherProfileId} style={{
                          background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6, padding: '14px 18px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>
                              {teacher?.name || u.teacherProfileId}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: pct >= 90 ? '#dc2626' : '#1C2832' }}>
                              {u.totalTokens.toLocaleString()} tokenid · {u.requestCount} päringut
                            </span>
                          </div>
                          {maxTokens > 0 && (
                            <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 3, width: `${pct}%`,
                                background: pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#16a34a',
                              }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#1C2832', display: 'block', marginBottom: 4 };
const selectStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1.5px solid #d1d5db', borderRadius: 5, fontSize: 14 };
function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    fontSize: 14, fontWeight: 700, color: '#fff', background: '#1C2832',
    padding: '10px 24px', border: 'none', borderRadius: 5,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
  };
}
