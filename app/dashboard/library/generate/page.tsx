'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Subject {
  id: string;
  name: string;
}

interface TopicGroup {
  group: string;
  topics: { code: string; label: string }[];
}

// Topics by subject name — physics is detailed, others use free-text
const SUBJECT_TOPICS: Record<string, TopicGroup[]> = {
  'Füüsika': [
    {
      group: 'Soojusõpetus',
      topics: [
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
      ],
    },
    {
      group: 'Elektriõpetus',
      topics: [
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
      ],
    },
  ],
};

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
    topicFreeText: '',
    grade: '9',
    subjectId: '',
    difficulty: 'standard',
    questionCount: '8',
    duration: '45',
    prompt: '',
  });

  // File uploads for AI context
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; type: string; base64: string; size: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Extract the base64 part after the data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFileAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10 MB per file
    setError(null); // Clear previous errors

    for (const file of files) {
      if (file.size > maxSize) {
        setError(`Fail "${file.name}" on liiga suur (max 10 MB)`);
        continue;
      }
      if (attachedFiles.length >= 10) {
        setError('Maksimaalselt 10 faili korraga');
        break;
      }
      const base64 = await fileToBase64(file);
      setAttachedFiles((prev) => [...prev, { name: file.name, type: file.type, base64, size: file.size }]);
    }
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index: number) {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSubjects(data); })
      .catch(() => {});
  }, []);

  function update(field: string, value: string) {
    if (field === 'subjectId') {
      // Reset topic when subject changes
      setForm((f) => ({ ...f, subjectId: value, curriculumCode: '', topicFreeText: '' }));
    } else {
      setForm((f) => ({ ...f, [field]: value }));
    }
  }

  // Get the selected subject name to look up its topics
  const selectedSubjectName = subjects.find((s) => s.id === form.subjectId)?.name || '';
  const topicGroups = SUBJECT_TOPICS[selectedSubjectName] || [];
  const hasStructuredTopics = topicGroups.length > 0;
  const allTopics = topicGroups.flatMap((g) => g.topics);
  const selectedTopic = allTopics.find((c) => c.code === form.curriculumCode);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGeneratedQuestions('');
    setGeneratedAnswerKey('');
    setGeneratedRubric('');

    // Build topic string from structured selection or free text
    const topicLabel = selectedTopic?.label || form.topicFreeText.trim() || '';

    try {
      const res = await fetch('/api/tests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curriculumCode: form.curriculumCode || undefined,
          topic: topicLabel || undefined,
          subject: selectedSubjectName || undefined,
          grade: form.grade,
          difficulty: form.difficulty,
          questionCount: form.questionCount,
          duration: form.duration,
          prompt: form.prompt.trim(),
          files: attachedFiles.length > 0 ? attachedFiles.map((f) => ({ name: f.name, type: f.type, base64: f.base64 })) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Viga genereerimisel');
        return;
      }

      setGeneratedTitle(data.title || `${topicLabel || selectedSubjectName || 'Kontrolltöö'} — kontrolltöö`);
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
          topic: selectedTopic?.label || form.topicFreeText.trim() || undefined,
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
          {/* Subject + Class */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>
                Aine{' '}
                <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12 }}>(valikuline)</span>
              </label>
              <select value={form.subjectId} onChange={(e) => update('subjectId', e.target.value)} style={inputStyle}>
                <option value="">— Määramata —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Klass</label>
              <select value={form.grade} onChange={(e) => update('grade', e.target.value)} style={inputStyle}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={String(g)}>{g}. klass</option>
                ))}
              </select>
            </div>
          </div>

          {/* Topic — structured dropdown for subjects with curriculum codes, free text for others */}
          <div>
            <label style={labelStyle}>
              Teema{' '}
              <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12 }}>(valikuline)</span>
            </label>
            {hasStructuredTopics ? (
              <select
                value={form.curriculumCode}
                onChange={(e) => update('curriculumCode', e.target.value)}
                style={inputStyle}
              >
                <option value="">— Määramata —</option>
                {topicGroups.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.topics.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.code} — {t.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={form.topicFreeText}
                onChange={(e) => update('topicFreeText', e.target.value)}
                placeholder={form.subjectId ? 'nt: Trigonomeetria, Taimerakk, Eesti Vabadussõda...' : 'Vali esmalt aine või kirjuta teema siia'}
                style={inputStyle}
              />
            )}
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

          {/* File attachments */}
          <div>
            <label style={labelStyle}>
              Lisamaterjalid{' '}
              <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12 }}>(valikuline — PDF, pildid, dokumendid)</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '1.5px dashed #DAD0A1',
                padding: '14px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                fontSize: 13,
                color: '#6b7280',
                background: '#fefdf5',
              }}
            >
              Klõpsa failide lisamiseks (PDF, JPG, PNG, DOCX, XLSX...)
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.doc,.docx,.pptx,.xlsx,.txt,.csv,image/*,application/pdf"
              onChange={handleFileAttach}
              style={{ display: 'none' }}
            />
            {attachedFiles.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {attachedFiles.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: '#f5f3ff',
                    border: '1px solid #e5e7eb',
                    fontSize: 12,
                  }}>
                    <span style={{ color: '#1C2832' }}>
                      {f.name} <span style={{ color: '#9ca3af' }}>({formatFileSize(f.size)})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        fontSize: 14,
                        padding: '0 4px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(selectedTopic || form.topicFreeText.trim()) && (
            <div style={{
              background: '#f5f3ff',
              border: '1.5px solid #c4b5fd',
              padding: '12px 16px',
              fontSize: 13,
              color: '#4c1d95',
            }}>
              <strong>Teema:</strong> {selectedTopic ? `${selectedTopic.code} — ${selectedTopic.label}` : form.topicFreeText.trim()}
              {selectedSubjectName && <> · <strong>Aine:</strong> {selectedSubjectName}</>}
              <br />
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                AI koostab ülesanded koos hindamisjuhendiga{selectedTopic ? ' vastavalt Eesti riiklikule õppekavale' : ''}.
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
            {selectedSubjectName && (
              <span style={{ background: '#f5f3ff', color: '#6d28d9', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
                {selectedSubjectName}
              </span>
            )}
            <span style={{ background: '#f5f3ff', color: '#6d28d9', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
              {form.grade}. klass
            </span>
            {(form.curriculumCode || form.topicFreeText.trim()) && (
              <span style={{ background: '#f5f3ff', color: '#6d28d9', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
                {form.curriculumCode || form.topicFreeText.trim()}
              </span>
            )}
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
