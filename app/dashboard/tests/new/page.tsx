'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PROTOTYPE_MODE } from '@/lib/prototype-mode';

interface Subject {
  id: string;
  name: string;
  category: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #DAD0A1',
  fontSize: 14,
  color: '#1C2832',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: '#1C2832',
  marginBottom: 6,
};

export default function NewTestPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('');
  const [subjectId, setSubjectId] = useState('');
  // Default to today's date in YYYY-MM-DD format
  const todayStr = new Date().toISOString().slice(0, 10);
  const [plannedDate, setPlannedDate] = useState(todayStr);
  const [notes, setNotes] = useState('');
  const [rubric, setRubric] = useState('');
  const [answerKey, setAnswerKey] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSubjects(data);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Pealkiri on kohustuslik');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          topic: topic.trim() || undefined,
          grade: grade || undefined,
          subjectId: subjectId || undefined,
          plannedDate: plannedDate || undefined,
          notes: notes.trim() || undefined,
          rubric: rubric.trim() || undefined,
          answerKey: answerKey.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Viga loomisel');
      router.push(`/dashboard/tests/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga loomisel');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/dashboard/tests"
          style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}
        >
          ← Tagasi kontrolltööde nimekirja
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 24 }}>
        Uus kontrolltöö
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={labelStyle}>
            Kontrolltöö pealkiri <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="nt. Kinemaatika kontrolltöö"
            required
            style={inputStyle}
          />
        </div>

        {!PROTOTYPE_MODE && <div>
          <label style={labelStyle}>Teema</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="nt. Ühtlaselt kiirenev liikumine"
            style={inputStyle}
          />
        </div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Klass</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              style={{ ...inputStyle, appearance: 'auto' }}
            >
              <option value="">Vali klass</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={String(g)}>
                  {g}. klass
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Aine</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              style={{ ...inputStyle, appearance: 'auto' }}
            >
              <option value="">Vali aine</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Kontrolltöö kuupäev</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {[
              { label: 'Eile', offset: -1 },
              { label: 'Täna', offset: 0 },
              { label: 'Homme', offset: 1 },
            ].map(({ label, offset }) => {
              const d = new Date();
              d.setDate(d.getDate() + offset);
              const val = d.toISOString().slice(0, 10);
              const isActive = plannedDate === val;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPlannedDate(val)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    fontSize: 13,
                    fontWeight: 700,
                    border: isActive ? '2px solid #1C2832' : '1.5px solid #DAD0A1',
                    background: isActive ? '#1C2832' : '#fff',
                    color: isActive ? '#F8F3DA' : '#1C2832',
                    cursor: 'pointer',
                    borderRadius: 4,
                    transition: 'all 0.1s',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <input
            type="date"
            value={plannedDate}
            onChange={(e) => setPlannedDate(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          />
          <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
            Või vali mõni muu kuupäev kalendrist
          </p>
        </div>

        {/* AI prompt — always visible */}
        <div>
          <label style={labelStyle}>
            Juhised AI-le{' '}
            <span style={{ fontWeight: 400, opacity: 0.6, fontSize: 12 }}>(valikuline)</span>
          </label>
          <textarea
            value={rubric}
            onChange={(e) => setRubric(e.target.value)}
            rows={3}
            placeholder="nt. Ülesanne 1 (4p): valem 1p, asendus 1p, arvutus 1p, ühik 1p. Teema on Ohmi seadus. Hinda rangelt ühikute kasutamist."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
            Kirjelda hindamisjuhendit, õigeid vastuseid või muid juhiseid — AI kasutab neid tagasiside andmisel
          </p>
        </div>

        {/* Collapsible advanced section */}
        {!PROTOTYPE_MODE && <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: '#6b7280',
              padding: '8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▶</span>
            Täpsemad seaded (hindamisjuhend, vastused, märkmed)
          </button>

          {showAdvanced && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 8, paddingLeft: 4, borderLeft: '2px solid #DAD0A1' }}>
              <div style={{ paddingLeft: 12 }}>
                <label style={labelStyle}>Õpetaja märkmed (blanki kohta)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Märkused kontrolltöö blanki, korralduse jms kohta..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div style={{ paddingLeft: 12 }}>
                <label style={labelStyle}>
                  Hindamisjuhend / rubriik{' '}
                  <span style={{ fontWeight: 400, opacity: 0.6, fontSize: 12 }}>(aitab AI-l täpsemalt hinnata)</span>
                </label>
                <textarea
                  value={rubric}
                  onChange={(e) => setRubric(e.target.value)}
                  rows={4}
                  placeholder="nt. Ülesanne 1 (4p): valem 1p, asendus 1p, arvutus 1p, ühik 1p..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div style={{ paddingLeft: 12 }}>
                <label style={labelStyle}>
                  Õiged vastused{' '}
                  <span style={{ fontWeight: 400, opacity: 0.6, fontSize: 12 }}>(aitab AI-l vigu tuvastada)</span>
                </label>
                <textarea
                  value={answerKey}
                  onChange={(e) => setAnswerKey(e.target.value)}
                  rows={4}
                  placeholder="nt. 1a) v = 5 m/s; 1b) a = 2 m/s²; 2) F = 12 N..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>
          )}
        </div>}

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', fontSize: 13, color: '#b91c1c' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              background: loading ? '#6b7280' : '#1C2832',
              color: '#F8F3DA',
              fontWeight: 700,
              fontSize: 15,
              padding: '13px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Loon...' : 'Loo kontrolltöö'}
          </button>
          <Link
            href="/dashboard/tests"
            style={{
              background: '#F8F3DA',
              color: '#1C2832',
              fontWeight: 700,
              fontSize: 15,
              padding: '13px 20px',
              border: '1.5px solid #DAD0A1',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Tühista
          </Link>
        </div>
      </form>
    </div>
  );
}
