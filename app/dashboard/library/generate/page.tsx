'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Subject {
  id: string;
  name: string;
}

const CURRICULUM_CODES = [
  { code: 'F9.1.1', label: 'Aine ehituse mudel ja agregaatolekud' },
  { code: 'F9.1.2', label: 'Aineosakeste liikumine ja temperatuur' },
  { code: 'F9.1.3', label: 'Soojuspaisumine ja difusioon' },
  { code: 'F9.1.4', label: 'Soojushulk ja erisoojus (Q = cm∆t)' },
  { code: 'F9.1.5', label: 'Soojusülekande liigid igapäevaelus' },
  { code: 'F9.1.6', label: 'Soojusjuhtivus, konvektsioon, soojuskiirgus' },
  { code: 'F9.1.7', label: 'Siseenergia ja soojushulk' },
  { code: 'F9.1.8', label: 'Soojushulga arvutamine Q = cm∆t' },
  { code: 'F9.1.9', label: 'Energia jäävuse seadus soojusprotsessides' },
  { code: 'F9.1.10', label: 'Sulamine ja tahkumine, sulamissoojus Q = λm' },
  { code: 'F9.1.11', label: 'Aurumine, keemine, keemissoojus Q = Lm' },
  { code: 'F9.1.12', label: 'Aine oleku muutuste graafik' },
  { code: 'F9.1.13', label: 'Sublimatsioon ja härmatumine looduses' },
  { code: 'F9.2.1', label: 'Elektrilaeng ja elektriväli' },
  { code: 'F9.2.2', label: 'Elektrivool metallides ja vooluringi osad' },
  { code: 'F9.2.3', label: 'Ohmi seadus I = U/R' },
  { code: 'F9.2.4', label: 'Elektriskeemid ja mõõtmine' },
  { code: 'F9.2.5', label: 'Elektriohutus, lühis, kaitse' },
  { code: 'F9.2.6', label: 'Jadaühenduse omadused' },
  { code: 'F9.2.7', label: 'Rööpühenduse omadused' },
  { code: 'F9.2.8', label: 'Elektrivoolu töö A = IUt ja võimsus N = IU' },
  { code: 'F9.2.9', label: 'Joule-Lenzi seadus Q = I²Rt' },
  { code: 'F9.2.10', label: 'Koguvõimsus, kaitse, energiamaksumus' },
];

const DIFFICULTY_LEVELS = [
  { value: 'basic', label: 'Baastase — lihtsad ülesanded' },
  { value: 'standard', label: 'Standardtase — ainekavale vastav' },
  { value: 'advanced', label: 'Kõrgem tase — süvendatud' },
];

const QUESTION_COUNTS = [
  { value: '5', label: '5 ülesannet' },
  { value: '8', label: '8 ülesannet' },
  { value: '10', label: '10 ülesannet' },
  { value: '12', label: '12 ülesannet' },
];

const DURATION_OPTIONS = [
  { value: '20', label: '20 min (tunnikontrolltöö)' },
  { value: '45', label: '45 min (kontrolltöö)' },
  { value: '90', label: '90 min (arvestustöö)' },
];

export default function GenerateTestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Generated content
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState('');
  const [generatedAnswerKey, setGeneratedAnswerKey] = useState('');
  const [generatedRubric, setGeneratedRubric] = useState('');

  const [form, setForm] = useState({
    curriculumCode: '',
    grade: '9',
    subjectId: '',
    difficulty: 'standard',
    questionCount: '8',
    duration: '45',
    prompt: '',
  });

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSubjects(data); })
      .catch(() => {});
  }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const selectedTopic = CURRICULUM_CODES.find((c) => c.code === form.curriculumCode);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.curriculumCode) {
      setError('Vali ainekava teema');
      return;
    }
    setLoading(true);
    setError(null);
    setGeneratedQuestions('');
    setGeneratedAnswerKey('');
    setGeneratedRubric('');

    try {
      const res = await fetch('/api/tests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curriculumCode: form.curriculumCode,
          topic: selectedTopic?.label || '',
          grade: form.grade,
          difficulty: form.difficulty,
          questionCount: form.questionCount,
          duration: form.duration,
          prompt: form.prompt.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Viga genereerimisel');
        return;
      }

      setGeneratedTitle(data.title || `${selectedTopic?.label || form.curriculumCode} — kontrolltöö`);
      setGeneratedQuestions(data.questions);
      setGeneratedAnswerKey(data.answerKey);
      setGeneratedRubric(data.rubric);
    } catch {
      setError('Võrgu viga');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!generatedQuestions) return;
    setSaving(true);
    setError(null);

    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedTitle,
          topic: selectedTopic?.label || form.curriculumCode,
          grade: form.grade,
          subjectId: form.subjectId || undefined,
          plannedDate: todayStr,
          notes: generatedQuestions,
          rubric: generatedRubric,
          answerKey: generatedAnswerKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Viga salvestamisel');
        return;
      }

      router.push(`/dashboard/tests/${data.id}`);
    } catch {
      setError('Võrgu viga');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    border: '1.5px solid #DAD0A1',
    background: '#fff',
    color: '#1C2832',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 700 as const,
    color: '#1C2832',
    marginBottom: 4,
  };

  const showGenerated = generatedQuestions.length > 0;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 80px' }}>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
        <Link href="/dashboard/library" style={{ color: '#6b7280', textDecoration: 'none' }}>
          ← Kontrolltööd
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', margin: 0 }}>
          Genereeri kontrolltöö
        </h1>
        <span style={{
          background: 'linear-gradient(135deg, #6d28d9, #4f46e5)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 4,
        }}>
          AI
        </span>
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
        AI koostab kontrolltöö koos ülesannete, vastuste ja hindamisjuhendiga. Sa saad kõike enne salvestamist muuta.
      </p>

      {!showGenerated ? (
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Curriculum code */}
          <div>
            <label style={labelStyle}>Ainekava teema *</label>
            <select
              value={form.curriculumCode}
              onChange={(e) => update('curriculumCode', e.target.value)}
              required
              style={inputStyle}
            >
              <option value="">— Vali teema —</option>
              <optgroup label="Soojusõpetus">
                {CURRICULUM_CODES.filter((c) => c.code.startsWith('F9.1')).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Elektriõpetus">
                {CURRICULUM_CODES.filter((c) => c.code.startsWith('F9.2')).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Grade + Subject */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Klass</label>
              <select value={form.grade} onChange={(e) => update('grade', e.target.value)} style={inputStyle}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={String(g)}>{g}. klass</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Aine</label>
              <select value={form.subjectId} onChange={(e) => update('subjectId', e.target.value)} style={inputStyle}>
                <option value="">Vali aine</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Difficulty + Question count */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Raskusaste</label>
              <select value={form.difficulty} onChange={(e) => update('difficulty', e.target.value)} style={inputStyle}>
                {DIFFICULTY_LEVELS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Ülesannete arv</label>
              <select value={form.questionCount} onChange={(e) => update('questionCount', e.target.value)} style={inputStyle}>
                {QUESTION_COUNTS.map((q) => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label style={labelStyle}>Aeg</label>
            <select value={form.duration} onChange={(e) => update('duration', e.target.value)} style={inputStyle}>
              {DURATION_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Prompt */}
          <div>
            <label style={labelStyle}>
              Juhised AI-le{' '}
              <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12 }}>(valikuline)</span>
            </label>
            <textarea
              value={form.prompt}
              onChange={(e) => update('prompt', e.target.value)}
              rows={3}
              placeholder="nt: Lisa vähemalt 2 graafikuülesannet. Üks ülesanne olgu igapäevaeluga seotud. Ühikute teisendamine peab olema esindatud."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {selectedTopic && (
            <div style={{
              background: '#f5f3ff',
              border: '1.5px solid #c4b5fd',
              padding: '12px 16px',
              fontSize: 13,
              color: '#4c1d95',
            }}>
              <strong>Ainekava teema:</strong> {selectedTopic.code} — {selectedTopic.label}
              <br />
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                AI järgib Eesti riikliku õppekava nõudeid ja koostab ülesanded koos hindamisjuhendiga.
              </span>
            </div>
          )}

          {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px 24px',
              fontSize: 15,
              fontWeight: 700,
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%)',
              color: '#fff',
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 16 }}>⟳</span>
                Genereerin... (kuni 30 sekundit)
              </>
            ) : (
              <>✦ Genereeri kontrolltöö</>
            )}
          </button>
        </form>
      ) : (
        /* Review generated test */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Kontrolltöö pealkiri</label>
            <input
              type="text"
              value={generatedTitle}
              onChange={(e) => setGeneratedTitle(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Info badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ background: '#f5f3ff', color: '#6d28d9', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
              {form.curriculumCode}
            </span>
            <span style={{ background: '#f5f3ff', color: '#6d28d9', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
              {form.grade}. klass
            </span>
            <span style={{ background: '#f5f3ff', color: '#6d28d9', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
              {DIFFICULTY_LEVELS.find(d => d.value === form.difficulty)?.label || form.difficulty}
            </span>
            <span style={{ background: '#f5f3ff', color: '#6d28d9', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
              {form.duration} min
            </span>
          </div>

          {/* Questions */}
          <div>
            <label style={labelStyle}>
              Ülesanded{' '}
              <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12 }}>(saad muuta)</span>
            </label>
            <textarea
              value={generatedQuestions}
              onChange={(e) => setGeneratedQuestions(e.target.value)}
              rows={16}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
            />
          </div>

          {/* Answer key */}
          <div>
            <label style={labelStyle}>
              Õiged vastused{' '}
              <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12 }}>(saad muuta)</span>
            </label>
            <textarea
              value={generatedAnswerKey}
              onChange={(e) => setGeneratedAnswerKey(e.target.value)}
              rows={10}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
            />
          </div>

          {/* Rubric */}
          <div>
            <label style={labelStyle}>
              Hindamisjuhend{' '}
              <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12 }}>(saad muuta)</span>
            </label>
            <textarea
              value={generatedRubric}
              onChange={(e) => setGeneratedRubric(e.target.value)}
              rows={8}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
            />
          </div>

          {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                padding: '13px 24px',
                fontSize: 15,
                fontWeight: 700,
                background: saving ? '#9ca3af' : '#1C2832',
                color: '#F8F3DA',
                border: 'none',
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              {saving ? 'Salvestan...' : 'Salvesta kontrolltöö'}
            </button>
            <button
              onClick={() => { setGeneratedQuestions(''); setGeneratedAnswerKey(''); setGeneratedRubric(''); setGeneratedTitle(''); }}
              disabled={saving}
              style={{
                padding: '13px 20px',
                fontSize: 15,
                fontWeight: 700,
                background: '#F8F3DA',
                color: '#1C2832',
                border: '1.5px solid #DAD0A1',
                cursor: 'pointer',
              }}
            >
              Genereeri uuesti
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
