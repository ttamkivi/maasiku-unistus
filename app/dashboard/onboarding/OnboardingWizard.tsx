'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const STEPS = ['Ained', 'Klassid', 'Õpilased', 'Lõpetamine'] as const;

interface Subject {
  id: string;
  name: string;
  category: string;
  gradeLevels: string;
}

interface AcademicYear {
  id: string;
  label: string;
}

interface ClassAssignment {
  subjectId: string;
  gradeLevel: number;
  parallel: string;
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

function parseGradeLevels(gradeLevels: string): number[] {
  const result: number[] = [];
  const parts = gradeLevels.split(',').map(s => s.trim());
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) result.push(i);
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n)) result.push(n);
    }
  }
  return [...new Set(result)].sort((a, b) => a - b);
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subject selection state
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Class assignment state
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [classAssignments, setClassAssignments] = useState<ClassAssignment[]>([]);
  const [parallels, setParallels] = useState<string[]>(['A', 'B', 'C']);

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((data: Subject[]) => { if (Array.isArray(data)) setAllSubjects(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/academic-year/current')
      .then((r) => r.json())
      .then((data) => { if (data.id) setAcademicYear(data); })
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

  function toggleAssignment(subjectId: string, gradeLevel: number, parallel: string) {
    setClassAssignments(prev => {
      const exists = prev.some(a =>
        a.subjectId === subjectId && a.gradeLevel === gradeLevel && a.parallel === parallel
      );
      if (exists) {
        return prev.filter(a =>
          !(a.subjectId === subjectId && a.gradeLevel === gradeLevel && a.parallel === parallel)
        );
      } else {
        return [...prev, { subjectId, gradeLevel, parallel }];
      }
    });
  }

  function addParallel() {
    const next = String.fromCharCode('A'.charCodeAt(0) + parallels.length);
    setParallels(prev => [...prev, next]);
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

  async function handleSaveClasses() {
    if (!academicYear) {
      setError('Õppeaastat ei leitud');
      return;
    }
    if (classAssignments.length === 0) {
      setError('Vali vähemalt üks klass');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/teacher/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYearId: academicYear.id,
          assignments: classAssignments,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Viga klasside salvestamisel');
      }
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga klasside salvestamisel');
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

  // Build summary of class assignments grouped by subject
  function getClassSummary(): string {
    const bySubject: Record<string, string[]> = {};
    for (const a of classAssignments) {
      const subj = selectedSubjects.find(s => s.id === a.subjectId);
      const name = subj?.name ?? a.subjectId;
      if (!bySubject[name]) bySubject[name] = [];
      bySubject[name].push(`${a.gradeLevel}${a.parallel}`);
    }
    return Object.entries(bySubject)
      .map(([name, classes]) => `${classes.join(', ')} (${name})`)
      .join(', ');
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
                {i < step ? '\u2713' : i + 1}
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
                          {s.name} <span style={{ color: '#6b7280', fontSize: 12 }}>&mdash; {s.gradeLevels}</span>
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
            {loading ? 'Salvestan...' : 'Vali ained ja jätka \u2192'}
          </button>
        </div>
      )}

      {/* Step 1 — Select classes */}
      {step === 1 && (
        <div style={card}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
            Vali oma klassid
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
            Märgi ära klassid, mida sel õppeaastal õpetad.
          </p>

          {/* Academic year badge */}
          {academicYear && (
            <div style={{
              display: 'inline-block',
              background: '#F8F3DA',
              border: '1px solid #DAD0A1',
              padding: '4px 12px',
              fontSize: 13,
              fontWeight: 700,
              color: '#1C2832',
              marginBottom: 20,
            }}>
              Õppeaasta {academicYear.label}
            </div>
          )}

          {/* Class grid per subject */}
          {selectedSubjects.map((subject) => {
            const grades = parseGradeLevels(subject.gradeLevels);
            return (
              <div key={subject.id} style={{ marginBottom: 24 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#1C2832',
                  borderBottom: '1.5px solid #DAD0A1',
                  paddingBottom: 6,
                  marginBottom: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}>
                  {subject.name} ({subject.gradeLevels})
                </div>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', fontSize: 12, color: '#6b7280', padding: '4px 8px', fontWeight: 600 }}></th>
                      {parallels.map(p => (
                        <th key={p} style={{ textAlign: 'center', fontSize: 13, color: '#1C2832', padding: '4px 8px', fontWeight: 700, width: 48 }}>
                          {p}
                        </th>
                      ))}
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map(grade => (
                      <tr key={grade}>
                        <td style={{ fontSize: 14, color: '#1C2832', padding: '4px 8px', fontWeight: 500 }}>
                          {grade}. kl
                        </td>
                        {parallels.map(p => {
                          const checked = classAssignments.some(a =>
                            a.subjectId === subject.id && a.gradeLevel === grade && a.parallel === p
                          );
                          return (
                            <td key={p} style={{ textAlign: 'center', padding: '4px 8px' }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleAssignment(subject.id, grade, p)}
                                style={{
                                  width: 20,
                                  height: 20,
                                  cursor: 'pointer',
                                  accentColor: '#22c55e',
                                }}
                              />
                            </td>
                          );
                        })}
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* Add parallel button */}
          <button
            type="button"
            onClick={addParallel}
            style={{
              background: 'none',
              border: '1px dashed #DAD0A1',
              color: '#6b7280',
              fontSize: 13,
              padding: '6px 14px',
              cursor: 'pointer',
              marginBottom: 20,
            }}
          >
            + Lisa paralleel ({String.fromCharCode('A'.charCodeAt(0) + parallels.length)})
          </button>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
              {error}
            </div>
          )}
          <button
            onClick={handleSaveClasses}
            disabled={loading || classAssignments.length === 0}
            style={{ ...primaryBtn, opacity: loading || classAssignments.length === 0 ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Salvestan...' : 'Salvesta klassid ja jätka \u2192'}
          </button>
        </div>
      )}

      {/* Step 2 — Add students */}
      {step === 2 && (
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
              Impordi &rarr;
            </Link>
          </div>
          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => setStep(3)} style={secondaryBtn}>
              Jäta praegu vahele &rarr;
            </button>
            <button onClick={() => setStep(3)} style={{ ...primaryBtn }}>
              Olen õpilased lisanud, jätka &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — All set */}
      {step === 3 && (
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>&#127881;</div>
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
                <span style={{ color: '#22c55e', fontWeight: 700 }}>{'\u2713'}</span>
                <span style={{ color: '#1C2832' }}>
                  Ained: <strong>{selectedSubjects.map((s) => s.name).join(', ')}</strong>
                </span>
              </div>
              {classAssignments.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>{'\u2713'}</span>
                  <span style={{ color: '#1C2832' }}>
                    Klassid: <strong>{getClassSummary()}</strong>
                  </span>
                </div>
              )}
              {academicYear && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>{'\u2713'}</span>
                  <span style={{ color: '#1C2832' }}>
                    Õppeaasta: <strong>{academicYear.label}</strong>
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <span style={{ color: '#6b7280' }}>{'\u2192'}</span>
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
            {loading ? 'Suunan...' : 'Mine töölauale \u2192'}
          </button>
        </div>
      )}
    </div>
  );
}
