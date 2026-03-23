'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Subject {
  id: string;
  name: string;
  category: string | null;
}

interface Props {
  subjects: Subject[];
}

// Estonian school grade levels
const GRADE_OPTIONS = [
  { value: '1', label: '1. klass' },
  { value: '2', label: '2. klass' },
  { value: '3', label: '3. klass' },
  { value: '4', label: '4. klass' },
  { value: '5', label: '5. klass' },
  { value: '6', label: '6. klass' },
  { value: '7', label: '7. klass' },
  { value: '8', label: '8. klass' },
  { value: '9', label: '9. klass' },
  { value: '10', label: '10. klass' },
  { value: '11', label: '11. klass' },
  { value: '12', label: '12. klass' },
  { value: '10a', label: '10A' },
  { value: '10b', label: '10B' },
  { value: '10c', label: '10C' },
  { value: '11a', label: '11A' },
  { value: '11b', label: '11B' },
  { value: '11c', label: '11C' },
  { value: '12a', label: '12A' },
  { value: '12b', label: '12B' },
  { value: '12c', label: '12C' },
  { value: 'põhikool', label: 'Põhikool (1.–9.)' },
  { value: 'gümnaasium', label: 'Gümnaasium (10.–12.)' },
  { value: 'kõik', label: 'Kõik klassid' },
];

export default function NewAssignmentForm({ subjects }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [grade, setGrade] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Group subjects by category for the dropdown
  const grouped = subjects.reduce<Record<string, Subject[]>>((acc, s) => {
    const cat = s.category || 'Muu';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Pealkiri ja ülesande kirjeldus on kohustuslikud.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, subjectId: subjectId || null, grade, dueDate, status }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Viga salvestamisel');
        return;
      }
      const { id } = await res.json();
      router.push(`/dashboard/assignments/${id}`);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    fontSize: 15,
    color: '#1C2832',
    background: '#fff',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block' as const,
    fontSize: 13,
    fontWeight: 600 as const,
    color: '#1C2832',
    marginBottom: 6,
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14, padding: 0 }}
        >
          ← Tagasi
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginTop: 8 }}>Uus kodutöö</h1>
        <p style={{ fontSize: 14, color: '#6b7280' }}>
          Loo ülesanne, mida õpilased saavad lahendada ja millele AI tagasisidet anda.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, padding: '12px 16px', color: '#dc2626', fontSize: 14 }}>
            {error}
          </div>
        )}

        <div>
          <label style={labelStyle}>Pealkiri *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="nt. Newtoni 2. seadus – kodutöö"
            style={inputStyle}
            required
          />
        </div>

        {/* Subject + Grade row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Õppeaine</label>
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              style={inputStyle}
            >
              <option value="">— Vali aine —</option>
              {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'et')).map(([cat, subs]) => (
                <optgroup key={cat} label={cat}>
                  {subs.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Klass / rühm</label>
            <select
              value={grade}
              onChange={e => setGrade(e.target.value)}
              style={inputStyle}
            >
              <option value="">— Vali klass —</option>
              <optgroup label="Põhikool">
                {GRADE_OPTIONS.slice(0, 9).map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </optgroup>
              <optgroup label="Gümnaasium – üldklassid">
                {GRADE_OPTIONS.slice(9, 12).map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </optgroup>
              <optgroup label="Gümnaasium – klassirühmad">
                {GRADE_OPTIONS.slice(12, 21).map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </optgroup>
              <optgroup label="Üldine">
                {GRADE_OPTIONS.slice(21).map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Ülesande kirjeldus / tekst *</label>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
            Kirjuta ülesande täistekst — kõik küsimused, nõuded, juhised. AI kasutab seda hindamisel.
          </p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Kirjuta siia ülesande täistekst…"
            rows={8}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Tähtaeg</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            style={{ ...inputStyle, maxWidth: 220 }}
          />
        </div>

        <div>
          <label style={labelStyle}>Staatus</label>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { value: 'DRAFT', label: 'Mustand', desc: 'Õpilased ei näe veel' },
              { value: 'PUBLISHED', label: 'Avalda kohe', desc: 'Õpilased näevad ja saavad esitada' },
            ].map(opt => (
              <label
                key={opt.value}
                style={{
                  flex: 1,
                  border: `2px solid ${status === opt.value ? '#1C2832' : '#e5e7eb'}`,
                  borderRadius: 6,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  background: status === opt.value ? '#F8F3DA' : '#fff',
                  display: 'block',
                }}
              >
                <input
                  type="radio"
                  name="status"
                  value={opt.value}
                  checked={status === opt.value}
                  onChange={() => setStatus(opt.value as 'DRAFT' | 'PUBLISHED')}
                  style={{ display: 'none' }}
                />
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1C2832' }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{opt.desc}</div>
              </label>
            ))}
          </div>
        </div>

        <div style={{ paddingTop: 8 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              background: saving ? '#9ca3af' : '#1C2832',
              color: '#F8F3DA',
              padding: '14px',
              borderRadius: 4,
              fontSize: 15,
              fontWeight: 600,
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Salvestan…' : status === 'PUBLISHED' ? '✓ Loo ja avalda' : '✓ Loo mustand'}
          </button>
        </div>
      </form>
    </div>
  );
}
