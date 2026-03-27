'use client';

import { useEffect, useState, useCallback } from 'react';

/* ─── AI model catalogue (demo: all major providers) ─── */
const AI_MODELS = [
  {
    provider: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4-6',    label: 'Claude Sonnet 4.6',  desc: 'Kiire ja täpne — vaikimisi', badge: 'Vaikimisi' },
      { id: 'claude-opus-4-6',      label: 'Claude Opus 4.6',    desc: 'Kõige võimekam, aeglasem' },
      { id: 'claude-haiku-4-5',     label: 'Claude Haiku 4.5',   desc: 'Väga kiire, odav, lihtsam tagasiside' },
    ],
  },
  {
    provider: 'OpenAI',
    models: [
      { id: 'gpt-4o',               label: 'GPT-4o',             desc: 'Multimodaalne, kiire' },
      { id: 'gpt-4o-mini',          label: 'GPT-4o Mini',        desc: 'Odavam, lihtsam ülesannete jaoks' },
      { id: 'o3',                   label: 'o3',                 desc: 'Arutlev mudel — keerulisteks ülesanneteks' },
    ],
  },
  {
    provider: 'Google',
    models: [
      { id: 'gemini-2.5-pro',       label: 'Gemini 2.5 Pro',     desc: 'Pikk kontekst, hea analüüs' },
      { id: 'gemini-2.5-flash',     label: 'Gemini 2.5 Flash',   desc: 'Kiire ja kuluefektiivne' },
    ],
  },
];

/* ─── Interface language options ─── */
const LANGUAGES = [
  { id: 'et', label: 'Eesti keel' },
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Русский' },
];

/* ─── Feedback tone/style ─── */
const FEEDBACK_TONES = [
  { id: 'encouraging',  label: 'Julgustav',        desc: 'Rõhub positiivsele, leebe kriitika' },
  { id: 'balanced',     label: 'Tasakaalustatud',   desc: 'Täpne ja aus, kuid sõbralik' },
  { id: 'strict',       label: 'Range',             desc: 'Otsekohene, täpne punktiarvestus' },
];

/* ─── Scoring strictness ─── */
const SCORING_STRICTNESS = [
  { id: 'lenient',  label: 'Leebe',       desc: 'Aktsepteerib ka osaliselt õigeid vastuseid heldelt' },
  { id: 'standard', label: 'Standardne',  desc: 'Tasakaalustatud hindamine' },
  { id: 'strict',   label: 'Range',       desc: 'Nõuab täpset vastust, osaline = osaline punkt' },
];

/* ─── Settings shape ─── */
interface UserSettings {
  aiModel: string;
  language: string;
  feedbackTone: string;
  scoringStrictness: string;
  autoAnalyze: boolean;
  showAiBadge: boolean;
  emailNotifications: boolean;
  feedbackLanguage: string;
  maxPointsRounding: 'none' | 'half' | 'full';
}

const DEFAULT_SETTINGS: UserSettings = {
  aiModel: 'claude-sonnet-4-6',
  language: 'et',
  feedbackTone: 'balanced',
  scoringStrictness: 'standard',
  autoAnalyze: true,
  showAiBadge: true,
  emailNotifications: true,
  feedbackLanguage: 'et',
  maxPointsRounding: 'half',
};

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [section, setSection] = useState<'profile' | 'ai' | 'feedback' | 'notifications'>('profile');

  const loadSettings = useCallback(() => {
    setLoading(true);
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setProfile({ name: data.name, email: data.email, role: data.role });
          setSettings({ ...DEFAULT_SETTINGS, ...data.preferences });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  function update<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaveMsg('');
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: settings }),
      });
      if (res.ok) {
        setSaveMsg('Salvestatud!');
        setTimeout(() => setSaveMsg(''), 3000);
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

  const SECTIONS = [
    { key: 'profile' as const,       label: 'Profiil' },
    { key: 'ai' as const,            label: 'AI mudel' },
    { key: 'feedback' as const,      label: 'Tagasiside seaded' },
    { key: 'notifications' as const, label: 'Teavitused' },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', margin: '0 0 8px 0' }}>
        Seaded
      </h1>
      <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.65, marginBottom: 24, lineHeight: 1.6 }}>
        Isiklikud seaded, AI mudeli valik ja tagasiside eelistused.
      </p>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #DAD0A1', flexWrap: 'wrap' }}>
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            style={{
              padding: '10px 18px', fontSize: 13, fontWeight: section === s.key ? 700 : 500,
              color: section === s.key ? '#1C2832' : '#6b7280',
              background: section === s.key ? '#F8F3DA' : 'transparent',
              border: 'none', borderBottom: section === s.key ? '2px solid #1C2832' : '2px solid transparent',
              cursor: 'pointer', marginBottom: -2,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Laadin...</div>
      ) : (
        <>
          {/* ══════════ PROFILE ══════════ */}
          {section === 'profile' && profile && (
            <Card>
              <h3 style={h3Style}>Profiil</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <Label>Nimi</Label>
                  <div style={readonlyStyle}>{profile.name}</div>
                </div>
                <div>
                  <Label>E-post</Label>
                  <div style={readonlyStyle}>{profile.email}</div>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <Label>Roll</Label>
                <div style={readonlyStyle}>
                  {profile.role === 'TEACHER' ? 'Õpetaja' : profile.role === 'SUPERADMIN' ? 'Superadmin' : profile.role}
                </div>
              </div>
              <div>
                <Label>Liidese keel</Label>
                <select
                  value={settings.language}
                  onChange={e => update('language', e.target.value)}
                  style={selectStyle}
                >
                  {LANGUAGES.map(l => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </div>
            </Card>
          )}

          {/* ══════════ AI MODEL ══════════ */}
          {section === 'ai' && (
            <Card>
              <h3 style={h3Style}>AI mudeli valik</h3>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
                Valige AI mudel, mida kasutatakse kontrolltööde analüüsimiseks ja tagasiside genereerimiseks.
                Demo versioonis saate proovida erinevaid pakkujaid.
              </p>

              {AI_MODELS.map(provider => (
                <div key={provider.provider} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1C2832', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    {provider.provider}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {provider.models.map(m => {
                      const selected = settings.aiModel === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => update('aiModel', m.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 16px', borderRadius: 6, cursor: 'pointer',
                            textAlign: 'left', width: '100%',
                            background: selected ? '#F8F3DA' : '#fff',
                            border: selected ? '2px solid #1C2832' : '1.5px solid #e5e7eb',
                          }}
                        >
                          <div style={{
                            width: 18, height: 18, borderRadius: '50%',
                            border: selected ? '5px solid #1C2832' : '2px solid #d1d5db',
                            flexShrink: 0,
                          }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>
                              {m.label}
                              {m.badge && (
                                <span style={{
                                  marginLeft: 8, fontSize: 10, fontWeight: 700,
                                  background: '#1C2832', color: '#F8F3DA',
                                  padding: '2px 6px', borderRadius: 3, verticalAlign: 'middle',
                                }}>
                                  {m.badge}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{m.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div style={{
                marginTop: 8, padding: '10px 14px', background: '#eff6ff',
                border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12, color: '#1e40af', lineHeight: 1.5,
              }}>
                Demo versioonis on kõik mudelid virtuaalselt saadaval. Tootmisversioonis kasutatakse vaikimisi Claude Sonnet mudelit, mis on hariduskontekstis kõige paremini testitud.
              </div>
            </Card>
          )}

          {/* ══════════ FEEDBACK SETTINGS ══════════ */}
          {section === 'feedback' && (
            <>
              <Card>
                <h3 style={h3Style}>Tagasiside toon</h3>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>
                  Kuidas AI peaks õpilastele tagasisidet andma?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {FEEDBACK_TONES.map(t => {
                    const selected = settings.feedbackTone === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => update('feedbackTone', t.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', borderRadius: 6, cursor: 'pointer',
                          textAlign: 'left', width: '100%',
                          background: selected ? '#F8F3DA' : '#fff',
                          border: selected ? '2px solid #1C2832' : '1.5px solid #e5e7eb',
                        }}
                      >
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%',
                          border: selected ? '5px solid #1C2832' : '2px solid #d1d5db',
                          flexShrink: 0,
                        }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>{t.label}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{t.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card style={{ marginTop: 16 }}>
                <h3 style={h3Style}>Hindamise rangus</h3>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>
                  Kui rangelt AI hindab õpilase vastuseid?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SCORING_STRICTNESS.map(s => {
                    const selected = settings.scoringStrictness === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => update('scoringStrictness', s.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', borderRadius: 6, cursor: 'pointer',
                          textAlign: 'left', width: '100%',
                          background: selected ? '#F8F3DA' : '#fff',
                          border: selected ? '2px solid #1C2832' : '1.5px solid #e5e7eb',
                        }}
                      >
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%',
                          border: selected ? '5px solid #1C2832' : '2px solid #d1d5db',
                          flexShrink: 0,
                        }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>{s.label}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{s.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card style={{ marginTop: 16 }}>
                <h3 style={h3Style}>Tagasiside keel</h3>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, lineHeight: 1.5 }}>
                  Mis keeles AI tagasisidet kirjutab?
                </p>
                <select
                  value={settings.feedbackLanguage}
                  onChange={e => update('feedbackLanguage', e.target.value)}
                  style={selectStyle}
                >
                  {LANGUAGES.map(l => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </Card>

              <Card style={{ marginTop: 16 }}>
                <h3 style={h3Style}>Punktide ümardamine</h3>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, lineHeight: 1.5 }}>
                  Kuidas ümardada osalisi punkte?
                </p>
                <select
                  value={settings.maxPointsRounding}
                  onChange={e => update('maxPointsRounding', e.target.value as UserSettings['maxPointsRounding'])}
                  style={selectStyle}
                >
                  <option value="none">Ei ümarda (nt 2.3p)</option>
                  <option value="half">0.5 sammuga (nt 2.0, 2.5, 3.0)</option>
                  <option value="full">Täisarvuni (nt 2, 3)</option>
                </select>
              </Card>

              <Card style={{ marginTop: 16 }}>
                <h3 style={h3Style}>Automaatne analüüs</h3>
                <ToggleRow
                  label="Analüüsi automaatselt pärast üleslaadimist"
                  description="Kui sees, alustab AI analüüsi kohe pärast tööde üleslaadimist. Kui väljas, peate ise nuppu vajutama."
                  checked={settings.autoAnalyze}
                  onChange={v => update('autoAnalyze', v)}
                />
                <div style={{ marginTop: 12 }} />
                <ToggleRow
                  label="Näita AI märget tagasisidel"
                  description="Kuvab tagasisidel märke, et see on AI genereeritud (EU AI Act nõue — soovitame sees hoida)."
                  checked={settings.showAiBadge}
                  onChange={v => update('showAiBadge', v)}
                />
              </Card>
            </>
          )}

          {/* ══════════ NOTIFICATIONS ══════════ */}
          {section === 'notifications' && (
            <Card>
              <h3 style={h3Style}>Teavitused</h3>
              <ToggleRow
                label="E-posti teavitused"
                description="Saate meili, kui analüüs on valmis, uued tulemused on lisatud, või nõusolekud on muutunud."
                checked={settings.emailNotifications}
                onChange={v => update('emailNotifications', v)}
              />
            </Card>
          )}

          {/* Save bar */}
          <div style={{
            position: 'sticky', bottom: 0, background: '#fff', borderTop: '1.5px solid #DAD0A1',
            padding: '12px 0', marginTop: 24, display: 'flex', alignItems: 'center', gap: 12,
            justifyContent: 'flex-end',
          }}>
            {saveMsg && (
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: saveMsg === 'Salvestatud!' ? '#16a34a' : '#dc2626',
              }}>
                {saveMsg}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                fontSize: 14, fontWeight: 700, color: '#fff', background: '#1C2832',
                padding: '10px 28px', border: 'none', borderRadius: 5,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Salvestan...' : 'Salvesta seaded'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Shared sub-components ─── */

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#fff', border: '1.5px solid #DAD0A1', borderRadius: 6,
      padding: '20px 24px', ...style,
    }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 12, fontWeight: 700, color: '#1C2832', display: 'block', marginBottom: 4 }}>
      {children}
    </label>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.5 }}>{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: checked ? '#1C2832' : '#d1d5db', position: 'relative', flexShrink: 0,
          transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3,
          left: checked ? 22 : 3, transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

const h3Style: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: '#1C2832', margin: '0 0 12px 0' };
const readonlyStyle: React.CSSProperties = {
  padding: '8px 10px', background: '#f9fafb', border: '1.5px solid #e5e7eb',
  borderRadius: 5, fontSize: 14, color: '#374151',
};
const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1.5px solid #d1d5db',
  borderRadius: 5, fontSize: 14, maxWidth: 300,
};
