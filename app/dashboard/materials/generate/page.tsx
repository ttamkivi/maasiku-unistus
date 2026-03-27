'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AITransparencyMarker from '@/components/AITransparencyMarker';

const CURRICULUM_CODES = [
  // Soojusõpetus
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
  // Elektriõpetus
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

const TYPES = [
  { value: 'video', label: '▶ Video skript' },
  { value: 'exercise', label: '✎ Harjutus / Tööleht' },
  { value: 'reading', label: '☰ Lugemismaterjal' },
  { value: 'course', label: '◆ Tunnikava' },
];

const LANGUAGES = [
  { value: 'et', label: 'Eesti keeles' },
  { value: 'en', label: 'Inglise keeles' },
];

const DIFFICULTY_LEVELS = [
  { value: 'basic', label: 'Baastase — lihtsad ülesanded' },
  { value: 'standard', label: 'Standardtase — ainekavale vastav' },
  { value: 'advanced', label: 'Kõrgem tase — süvendatud' },
];

export default function GenerateMaterialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState('');

  const [form, setForm] = useState({
    curriculumCode: '',
    type: 'exercise',
    language: 'et',
    difficulty: 'standard',
    prompt: '',
  });

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
    setGeneratedContent(null);

    try {
      const res = await fetch('/api/materials/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curriculumCode: form.curriculumCode,
          topic: selectedTopic?.label || '',
          type: form.type,
          language: form.language,
          difficulty: form.difficulty,
          prompt: form.prompt.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Viga genereerimisel');
        return;
      }

      setGeneratedContent(data.content);
      setGeneratedTitle(data.title || `${selectedTopic?.label || form.curriculumCode} — ${TYPES.find(t => t.value === form.type)?.label || form.type}`);
    } catch {
      setError('Võrgu viga');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!generatedContent) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/materials/generate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curriculumCode: form.curriculumCode,
          topic: selectedTopic?.label || '',
          title: generatedTitle,
          type: form.type,
          language: form.language,
          content: generatedContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Viga salvestamisel');
        return;
      }

      router.push('/dashboard/materials');
    } catch {
      setError('Võrgu viga');
    } finally {
      setLoading(false);
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

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 80px' }}>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
        <Link href="/dashboard/materials" style={{ color: '#6b7280', textDecoration: 'none' }}>
          ← Õppematerjalid
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', margin: 0 }}>
          Genereeri õppematerjal
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
        AI genereerib õppematerjali vastavalt ainekavale ja Sinu juhistele. Sa saad tulemust enne salvestamist üle vaadata ja muuta.
      </p>

      {!generatedContent ? (
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

          {/* Type + Language row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Materjali tüüp *</label>
              <select value={form.type} onChange={(e) => update('type', e.target.value)} style={inputStyle}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Keel</label>
              <select value={form.language} onChange={(e) => update('language', e.target.value)} style={inputStyle}>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label style={labelStyle}>Raskusaste</label>
            <select value={form.difficulty} onChange={(e) => update('difficulty', e.target.value)} style={inputStyle}>
              {DIFFICULTY_LEVELS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Prompt */}
          <div>
            <label style={labelStyle}>
              Juhised AI-le{' '}
              <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12 }}>(valikuline — kirjelda, mida täpsemalt soovid)</span>
            </label>
            <textarea
              value={form.prompt}
              onChange={(e) => update('prompt', e.target.value)}
              rows={4}
              placeholder={
                form.type === 'exercise'
                  ? 'nt: Koosta 8 ülesannet Ohmi seaduse kohta, kus õpilane peab arvutama voolutugevust, pinget ja takistust. Lisa ka üks graafikuülesanne.'
                  : form.type === 'reading'
                    ? 'nt: Kirjuta selgitus soojusjuhtivusest igapäevaelus, kasutades näiteid köögist ja ehitusest. Sobiv 9. klassi tasemele.'
                    : form.type === 'video'
                      ? 'nt: Koosta video skript 5-minutilisele selgitusele jadaühenduse kohta. Lisa katsete kirjeldused.'
                      : 'nt: Koosta 45-minutilise tunni kava elektriohutuse teemale, lisa rühmatöö ja arutelu.'
              }
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
                AI järgib Eesti riikliku õppekava nõudeid selle teema jaoks.
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
                Genereerin... (see võib võtta kuni 30 sekundit)
              </>
            ) : (
              <>✦ Genereeri materjal</>
            )}
          </button>
        </form>
      ) : (
        /* Generated content review */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Editable title */}
          <div>
            <label style={labelStyle}>Pealkiri</label>
            <input
              type="text"
              value={generatedTitle}
              onChange={(e) => setGeneratedTitle(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Info bar */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ background: '#f5f3ff', color: '#6d28d9', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
              {form.curriculumCode}
            </span>
            <span style={{ background: '#f5f3ff', color: '#6d28d9', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
              {TYPES.find(t => t.value === form.type)?.label || form.type}
            </span>
            <span style={{ background: '#f5f3ff', color: '#6d28d9', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
              {DIFFICULTY_LEVELS.find(d => d.value === form.difficulty)?.label || form.difficulty}
            </span>
          </div>

          <AITransparencyMarker contentType="õppematerjal" />

          {/* Editable content */}
          <div>
            <label style={labelStyle}>
              Genereeritud sisu{' '}
              <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12 }}>(saad muuta enne salvestamist)</span>
            </label>
            <textarea
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
              rows={20}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
            />
          </div>

          {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                flex: 1,
                padding: '13px 24px',
                fontSize: 15,
                fontWeight: 700,
                background: loading ? '#9ca3af' : '#1C2832',
                color: '#F8F3DA',
                border: 'none',
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Salvestan...' : 'Salvesta materjal'}
            </button>
            <button
              onClick={() => { setGeneratedContent(null); setGeneratedTitle(''); }}
              disabled={loading}
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
