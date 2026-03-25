'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PROTOTYPE_MODE } from '@/lib/prototype-mode';

interface Subject {
  id: string;
  name: string;
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

interface ExistingAssignment {
  id: string;
  subjectId: string;
  gradeLevel: number;
  parallel: string;
  subject: Subject;
}

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

export default function ClassesPage() {
  const router = useRouter();

  useEffect(() => {
    if (PROTOTYPE_MODE) router.replace('/dashboard/teacher');
  }, [router]);

  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classAssignments, setClassAssignments] = useState<ClassAssignment[]>([]);
  const [parallels, setParallels] = useState<string[]>(['A', 'B', 'C']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Fetch academic year + subjects in parallel
      const [yearRes, subjectsRes] = await Promise.all([
        fetch('/api/academic-year/current'),
        fetch('/api/teacher/subjects'),
      ]);

      const yearData = await yearRes.json();
      const subjectsData = await subjectsRes.json();

      if (yearData.id) setAcademicYear(yearData);

      const subjectsList: Subject[] = Array.isArray(subjectsData)
        ? subjectsData.map((ts: { subject: Subject }) => ts.subject)
        : [];
      setSubjects(subjectsList);

      // Fetch existing assignments if we have an academic year
      if (yearData.id) {
        const assignRes = await fetch(`/api/teacher/classes?academicYearId=${yearData.id}`);
        const assignData: ExistingAssignment[] = await assignRes.json();
        if (Array.isArray(assignData)) {
          const assignments = assignData.map(a => ({
            subjectId: a.subjectId,
            gradeLevel: a.gradeLevel,
            parallel: a.parallel,
          }));
          setClassAssignments(assignments);

          // Expand parallels if existing data has more than A,B,C
          const existingParallels = new Set(assignData.map(a => a.parallel));
          const defaultParallels = ['A', 'B', 'C'];
          for (const p of existingParallels) {
            if (!defaultParallels.includes(p)) {
              defaultParallels.push(p);
            }
          }
          defaultParallels.sort();
          setParallels(defaultParallels);
        }
      }
    } catch {
      setError('Andmete laadimine ebaõnnestus');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function toggleAssignment(subjectId: string, gradeLevel: number, parallel: string) {
    setSuccess(false);
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

  async function handleSave() {
    if (!academicYear) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
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
        throw new Error(data.error ?? 'Viga salvestamisel');
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga salvestamisel');
    } finally {
      setSaving(false);
    }
  }

  const card: React.CSSProperties = {
    background: '#fff',
    border: '1.5px solid #DAD0A1',
    padding: '32px 28px',
    maxWidth: 520,
    margin: '0 auto',
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', paddingTop: 32 }}>
        <div style={card}>
          <p style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>Laadin...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingTop: 32 }}>
      <div style={card}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
          Minu klassid
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
          Märgi ära klassid, mida sel õppeaastal õpetad.
        </p>

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

        {subjects.length === 0 && (
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            Sul pole veel aineid valitud. Mine esmalt ainete seadistamisse.
          </p>
        )}

        {subjects.map((subject) => {
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {subjects.length > 0 && (
          <>
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
            {success && (
              <div style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '10px 14px', fontSize: 13, color: '#166534', marginBottom: 16 }}>
                Klassid salvestatud!
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...primaryBtn, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Salvestan...' : 'Salvesta'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
