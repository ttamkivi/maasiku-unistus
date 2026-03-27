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
  // Teaching profile
  activeSubjectIds: string[];
  activeClassIds: string[];
  activeGrades: number[];
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
  activeSubjectIds: [],
  activeClassIds: [],
  activeGrades: [],
};

/* ─── Teaching data types ─── */
interface SubjectInfo {
  id: string;
  name: string;
  category: string;
  gradeLevels?: string;
}

interface ClassAssignment {
  id: string;
  classId: string | null;
  className: string;
  gradeLevel: number;
  subjectId: string;
  subjectName: string;
}

interface UniqueClass {
  id: string;
  name: string;
  gradeLevel: number;
}

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

interface SchoolProviderInfo {
  provider: string;
  displayName: string;
  defaultModel: string;
  allowedModels: string[];
  isDefault: boolean;
}

interface UsageInfo {
  tokensUsed: number;
  requestsUsed: number;
  tokenLimit: number | null;
  requestLimit: number | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [schoolProviders, setSchoolProviders] = useState<SchoolProviderInfo[]>([]);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [mySubjects, setMySubjects] = useState<SubjectInfo[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectInfo[]>([]);
  const [myClasses, setMyClasses] = useState<ClassAssignment[]>([]);
  const [uniqueClasses, setUniqueClasses] = useState<UniqueClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [section, setSection] = useState<'teaching' | 'profile' | 'ai' | 'feedback' | 'notifications'>('teaching');

  const loadSettings = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/settings').then(r => r.ok ? r.json() : null),
      fetch('/api/settings/school-models').then(r => r.ok ? r.json() : null),
      fetch('/api/settings/my-teaching').then(r => r.ok ? r.json() : null),
    ])
      .then(([settingsData, schoolData, teachingData]) => {
        if (settingsData) {
          setProfile({ name: settingsData.name, email: settingsData.email, role: settingsData.role });
          const prefs = { ...DEFAULT_SETTINGS, ...settingsData.preferences };
          // Ensure arrays are always arrays
          prefs.activeSubjectIds = prefs.activeSubjectIds || [];
          prefs.activeClassIds = prefs.activeClassIds || [];
          prefs.activeGrades = prefs.activeGrades || [];
          setSettings(prefs);
        }
        if (schoolData) {
          setSchoolProviders(schoolData.schoolProviders || []);
          setSchoolName(schoolData.schoolName || null);
          setUsage(schoolData.usage || null);
        }
        if (teachingData) {
          setMySubjects(teachingData.mySubjects || []);
          setAllSubjects(teachingData.allSubjects || []);
          setMyClasses(teachingData.myClasses || []);
          setUniqueClasses(teachingData.uniqueClasses || []);
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
        body: JSON.stringify({ preferences: settings, name: profile?.name, email: profile?.email }),
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
    { key: 'teaching' as const,      label: 'Minu õpetamine' },
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
          {/* ══════════ TEACHING (Subjects & Classes) ══════════ */}
          {section === 'teaching' && (
            <>
              <Card>
                <h3 style={h3Style}>Minu ained</h3>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>
                  Valige ained, mida praegu õpetate. See filtreerib testide loomise, raamatukogu ja AI analüüsi — näete ainult asjakohaseid valikuid.
                </p>
                {allSubjects.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#6b7280', fontStyle: 'italic' }}>
                    Aineid ei leitud. Paluge administraatoril ained süsteemi lisada.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {allSubjects.map(s => {
                      const isLinked = mySubjects.some(ms => ms.id === s.id);
                      const isActive = settings.activeSubjectIds.length === 0
                        ? isLinked  // If no explicit selection, default to linked subjects
                        : settings.activeSubjectIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            const current = settings.activeSubjectIds.length === 0
                              ? mySubjects.map(ms => ms.id)
                              : [...settings.activeSubjectIds];
                            const next = current.includes(s.id)
                              ? current.filter(id => id !== s.id)
                              : [...current, s.id];
                            update('activeSubjectIds', next);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px', borderRadius: 6, cursor: 'pointer',
                            textAlign: 'left', width: '100%',
                            background: isActive ? '#F8F3DA' : '#fff',
                            border: isActive ? '2px solid #1C2832' : '1.5px solid #e5e7eb',
                          }}
                        >
                          <div style={{
                            width: 18, height: 18, borderRadius: 3,
                            border: isActive ? 'none' : '2px solid #d1d5db',
                            background: isActive ? '#1C2832' : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, fontSize: 12, color: '#fff', fontWeight: 700,
                          }}>
                            {isActive ? '✓' : ''}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>
                              {s.name}
                              {isLinked && (
                                <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, color: '#16a34a' }}>
                                  (seotud)
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                              {s.category}{s.gradeLevels ? ` · ${s.gradeLevels}. klass` : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card style={{ marginTop: 16 }}>
                <h3 style={h3Style}>Minu klassid</h3>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>
                  Valige klassid, kellele praegu õpetate. See filtreerib õpilaste nimekirju ja tulemuste vaateid.
                </p>
                {uniqueClasses.length === 0 && myClasses.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#6b7280', fontStyle: 'italic' }}>
                    Klassi määranguid ei leitud. Paluge administraatoril klassid määrata.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {uniqueClasses.map(c => {
                      const isActive = settings.activeClassIds.length === 0 || settings.activeClassIds.includes(c.id);
                      const classSubjects = myClasses
                        .filter(mc => mc.classId === c.id)
                        .map(mc => mc.subjectName);
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            const current = settings.activeClassIds.length === 0
                              ? uniqueClasses.map(uc => uc.id)
                              : [...settings.activeClassIds];
                            const next = current.includes(c.id)
                              ? current.filter(id => id !== c.id)
                              : [...current, c.id];
                            update('activeClassIds', next);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px', borderRadius: 6, cursor: 'pointer',
                            textAlign: 'left', width: '100%',
                            background: isActive ? '#F8F3DA' : '#fff',
                            border: isActive ? '2px solid #1C2832' : '1.5px solid #e5e7eb',
                          }}
                        >
                          <div style={{
                            width: 18, height: 18, borderRadius: 3,
                            border: isActive ? 'none' : '2px solid #d1d5db',
                            background: isActive ? '#1C2832' : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, fontSize: 12, color: '#fff', fontWeight: 700,
                          }}>
                            {isActive ? '✓' : ''}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>{c.name}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                              {c.gradeLevel}. klass{classSubjects.length > 0 ? ` · ${classSubjects.join(', ')}` : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card style={{ marginTop: 16 }}>
                <h3 style={h3Style}>Aktiivsed klassiastmed</h3>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>
                  Milliseid klassiastmeid õpetate? See aitab AI-l valida õiget õppekava ja raskusastet.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[7, 8, 9, 10, 11, 12].map(grade => {
                    const isActive = settings.activeGrades.length === 0 || settings.activeGrades.includes(grade);
                    return (
                      <button
                        key={grade}
                        onClick={() => {
                          const current = settings.activeGrades.length === 0
                            ? [7, 8, 9, 10, 11, 12]
                            : [...settings.activeGrades];
                          const next = current.includes(grade)
                            ? current.filter(g => g !== grade)
                            : [...current, grade].sort((a, b) => a - b);
                          update('activeGrades', next);
                        }}
                        style={{
                          padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
                          fontSize: 14, fontWeight: 600,
                          background: isActive ? '#1C2832' : '#fff',
                          color: isActive ? '#F8F3DA' : '#6b7280',
                          border: isActive ? '2px solid #1C2832' : '1.5px solid #e5e7eb',
                          minWidth: 56, textAlign: 'center',
                        }}
                      >
                        {grade}. kl
                      </button>
                    );
                  })}
                </div>
              </Card>

              {(settings.activeSubjectIds.length > 0 || settings.activeGrades.length > 0) && (
                <div style={{
                  marginTop: 16, padding: '12px 16px', background: '#f0fdf4',
                  border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 13, color: '#166534', lineHeight: 1.5,
                }}>
                  <strong>Kuluoptimeerimine:</strong> Teie valikute põhjal saadab süsteem AI-le ainult asjakohase õppekava — mitte tervet ainekava.
                  See vähendab iga analüüsi maksumust ~15% ja parandab tagasiside täpsust.
                </div>
              )}
            </>
          )}

          {/* ══════════ PROFILE ══════════ */}
          {section === 'profile' && profile && (
            <Card>
              <h3 style={h3Style}>Profiil</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <Label>Nimi</Label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={e => setProfile({ ...profile, name: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <Label>E-post</Label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                    style={inputStyle}
                  />
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
            <>
              {/* Usage meter (if school has limits) */}
              {usage && usage.tokenLimit && (
                <Card style={{ marginBottom: 16 }}>
                  <h3 style={h3Style}>Kuu kasutus{schoolName ? ` — ${schoolName}` : ''}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Tokenid</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#1C2832' }}>
                        {usage.tokensUsed.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 400, color: '#6b7280' }}>/ {usage.tokenLimit.toLocaleString()}</span>
                      </div>
                      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${Math.min(100, (usage.tokensUsed / usage.tokenLimit) * 100)}%`,
                          background: usage.tokensUsed / usage.tokenLimit >= 0.9 ? '#dc2626' : usage.tokensUsed / usage.tokenLimit >= 0.7 ? '#d97706' : '#16a34a',
                        }} />
                      </div>
                    </div>
                    {usage.requestLimit && (
                      <div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Päringud</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#1C2832' }}>
                          {usage.requestsUsed} <span style={{ fontSize: 12, fontWeight: 400, color: '#6b7280' }}>/ {usage.requestLimit}</span>
                        </div>
                        <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${Math.min(100, (usage.requestsUsed / usage.requestLimit) * 100)}%`,
                            background: usage.requestsUsed / usage.requestLimit >= 0.9 ? '#dc2626' : '#16a34a',
                          }} />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* School-configured models */}
              {schoolProviders.length > 0 && (
                <Card style={{ marginBottom: 16 }}>
                  <h3 style={h3Style}>Kooli poolt seadistatud mudelid</h3>
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>
                    Teie kooli admin on konfigureerinud järgmised AI pakkujad. Need kasutavad kooli API võtit.
                  </p>
                  {schoolProviders.map(sp => (
                    <div key={sp.provider} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1C2832', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                        {sp.displayName}
                        {sp.isDefault && (
                          <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: '#16a34a', color: '#fff', padding: '2px 6px', borderRadius: 3 }}>
                            Kooli vaikimisi
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {sp.allowedModels.map(modelId => {
                          const selected = settings.aiModel === modelId;
                          const modelInfo = AI_MODELS.flatMap(p => p.models).find(m => m.id === modelId);
                          return (
                            <button
                              key={modelId}
                              onClick={() => update('aiModel', modelId)}
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
                                  {modelInfo?.label || modelId}
                                  {modelId === sp.defaultModel && (
                                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: '#1C2832', color: '#F8F3DA', padding: '2px 6px', borderRadius: 3, verticalAlign: 'middle' }}>
                                      Vaikimisi
                                    </span>
                                  )}
                                </div>
                                {modelInfo?.desc && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{modelInfo.desc}</div>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </Card>
              )}

              {/* Full demo catalogue */}
              <Card>
                <h3 style={h3Style}>
                  {schoolProviders.length > 0 ? 'Kõik mudelid (demo)' : 'AI mudeli valik'}
                </h3>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
                  {schoolProviders.length > 0
                    ? 'Demo režiimis saate proovida ka teisi mudeleid. Tootmises kasutatakse ainult kooli poolt seadistatud pakkujaid.'
                    : 'Valige AI mudel, mida kasutatakse kontrolltööde analüüsimiseks ja tagasiside genereerimiseks.'}
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
                  {schoolProviders.length > 0
                    ? 'Tootmises kasutab süsteem kooli administraatori poolt seadistatud pakkujat ja API võtit. Demo režiimis saate kõiki mudeleid proovida.'
                    : 'Demo versioonis on kõik mudelid virtuaalselt saadaval. Paluge oma kooli adminil seadistada AI pakkuja, et kasutada kooli enda API võtit.'}
                </div>
              </Card>
            </>
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
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1.5px solid #d1d5db',
  borderRadius: 5, fontSize: 14, color: '#1C2832', background: '#fff',
  boxSizing: 'border-box',
};
const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1.5px solid #d1d5db',
  borderRadius: 5, fontSize: 14, maxWidth: 300,
};
