'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const STEPS = ['Ained', 'Õpilased', 'Lõpetamine'] as const;

interface Subject {
  id: string;
  name: string;
  category: string;
  gradeLevels: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  loodusained: 'Loodusained',
  matemaatika: 'Matemaatika',
  'keel ja kirjandus': 'Keel ja kirjandus',
  võõrkeeled: 'Võõrkeeled',
  sotsiaalained: 'Sotsiaalained',
  kunstiained: 'Kunstiained',
  tehnoloogia: 'Tehnoloogia',
  'kehaline kasvatus': 'Kehaline kasvatus',
  muu: 'Muu',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #DAD0A1',
  fontSize: 15,
  color: '#1C2832',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
  background: '#1C2832',
  color: '#F8F3DA',
  fontWeight: 700,
  fontSize: 15,
  padding: '12px 24px',
  border: 'none',
  cursor: 'pointer',
  width: '100%',
};

const secondaryBtn: React.CSSProperties = {
  background: '#F8F3DA',
  color: '#1C2832',
  fontWeight: 600,
  fontSize: 14,
  padding: '12px 24px',
  border: '1.5px solid #DAD0A1',
  cursor: 'pointer',
  width: '100%',
};

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subject selection state
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((data: Subject[]) => { if (Array.isArray(data)) setAllSubjects(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedIds = new Set(selectedSubjects.map((s) => s.id));
  const filtered = allSubjects.filter(
    (s) => !selectedIds.has(s.id) && (
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
    ),
  );

  const grouped: Record<string, Subject[]> = {};
  for (const s of filtered) {
    const cat = s.category || 'muu';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }

  function selectSubject(s: Subject) {
    setSelectedSubjects((prev) => [...prev, s]);
    setSearch('');
  }

  function removeSubject(id: string) {
    setSelectedSubjects((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleLinkSubjects() {
    if (selectedSubjects.length === 0) {
      setError('Vali vähemalt üks aine');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      for (const s of selectedSubjects) {
        const res = await fetch('/api/teacher/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjectId: s.id }),
        });
        if (!res.ok) {
          const data = await res.json() as { error?: string };
          throw new Error(data.error ?? 'Viga ainete sidumisel');
        }
      }
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga ainete sidumisel');
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/account/onboarding-complete', { method: 'PATCH' });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Viga');
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga');
      setLoading(false);
    }
  }

  const card: React.CSSProperties = {
    background: '#fff',
    border: '1.5px solid #DAD0A1',
    padding: '32px 28px',
    maxWidth: 520,
    margin: '0 auto',
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingTop: 16 }}>
      {/* Progress indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, alignItems: 'center' }}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: i < STEPS.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: i < step ? '#22c55e' : i === step ? '#1C2832' : '#DAD0A1',
                color: i === step || i < step ? '#fff' : '#1C2832',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: i === step ? 700 : 500, color: i === step ? '#1C2832' : '#6b7280', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < step ? '#22c55e' : '#DAD0A1', minWidth: 20 }} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — Select subjects */}
      {step === 0 && (
        <div style={card}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
            Vali oma ained
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
            Vali ained, mida õpetad. Saad hiljem rohkem aineid lisada.
          </p>

          {/* Selected chips */}
          {selectedSubjects.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {selectedSubjects.map((s) => (
                <span
                  key={s.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#F8F3DA',
                    border: '1px solid #DAD0A1',
                    padding: '4px 10px',
                    fontSize: 13,
                    color: '#1C2832',
                    fontWeight: 600,
                  }}
                >
                  {s.name}
                  <button
                    type="button"
                    onClick={() => removeSubject(s.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: 15,
                      color: '#6b7280',
                      lineHeight: 1,
                    }}
                    aria-label={`Eemalda ${s.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Searchable dropdown */}
          <div ref={wrapperRef} style={{ position: 'relative', marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
              Otsi ainet <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setDropdownOpen(true); }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="nt. Füüsika, Matemaatika, Keemia..."
              style={inputStyle}
              autoFocus
            />
            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                maxHeight: 300,
                overflowY: 'auto',
                background: '#F8F3DA',
                border: '1.5px solid #DAD0A1',
                borderTop: 'none',
                zIndex: 10,
              }}>
                {Object.keys(grouped).length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280' }}>
                    Aineid ei leitud
                  </div>
                ) : (
                  Object.entries(grouped).map(([cat, subjects]) => (
                    <div key={cat}>
                      <div style={{
                        padding: '8px 14px 4px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {CATEGORY_LABELS[cat] || cat}
                      </div>
                      {subjects.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => selectSubject(s)}
                          style={{
                            padding: '8px 14px',
                            fontSize: 14,
                            color: '#1C2832',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#EDE8C8'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                        >
                          {s.name} <span style={{ color: '#6b7280', fontSize: 12 }}>— {s.gradeLevels}</span>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
              {error}
            </div>
          )}
          <button
            onClick={handleLinkSubjects}
            disabled={loading || selectedSubjects.length === 0}
            style={{ ...primaryBtn, opacity: loading || selectedSubjects.length === 0 ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Salvestan...' : 'Vali ained ja jätka →'}
          </button>
        </div>
      )}

      {/* Step 1 — Add students */}
      {step === 1 && (
        <div style={card}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
            Lisa õpilased (valikuline)
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
            Impordi õpilased CSV-failist või jätka praegu ilma. Saad õpilasi hiljem igal ajal lisada.
          </p>
          <div style={{
            background: '#F8F3DA',
            border: '1.5px solid #DAD0A1',
            padding: '16px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1C2832' }}>Impordi CSV-failist</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Laadi üles nimekiri: nimi, e-post, klass</div>
            </div>
            <Link
              href="/dashboard/students/import"
              style={{
                background: '#1C2832',
                color: '#F8F3DA',
                fontWeight: 700,
                fontSize: 13,
                padding: '9px 16px',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Impordi →
            </Link>
          </div>
          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => setStep(2)} style={secondaryBtn}>
              Jäta praegu vahele →
            </button>
            <button onClick={() => setStep(2)} style={{ ...primaryBtn }}>
              Olen õpilased lisanud, jätka →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — All set */}
      {step === 2 && (
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
              Kõik on valmis!
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              Sinu tööplatvorm on seadistatud ja kasutamiseks valmis.
            </p>
          </div>
          <div style={{
            background: '#F8F3DA',
            border: '1.5px solid #DAD0A1',
            padding: '16px 18px',
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1C2832', marginBottom: 10 }}>Kokkuvõte</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span>
                <span style={{ color: '#1C2832' }}>
                  Ained: <strong>{selectedSubjects.map((s) => s.name).join(', ')}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <span style={{ color: '#6b7280' }}>→</span>
                <span style={{ color: '#6b7280' }}>
                  Kontrolltöö saad luua töölaualt
                </span>
              </div>
            </div>
          </div>
          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
              {error}
            </div>
          )}
          <button
            onClick={handleFinish}
            disabled={loading}
            style={{ ...primaryBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Suunan...' : 'Mine töölauale →'}
          </button>
        </div>
      )}
    </div>
  );
}
