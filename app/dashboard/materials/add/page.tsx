'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  { value: 'video', label: '▶ Video' },
  { value: 'exercise', label: '✎ Harjutus' },
  { value: 'reading', label: '☰ Lugemismaterjal' },
  { value: 'course', label: '◆ Kursus' },
];

const LANGUAGES = [
  { value: 'et', label: 'Eesti keeles' },
  { value: 'en', label: 'Inglise keeles' },
  { value: 'et_sub', label: 'Inglise + eesti subtiitrid' },
];

export default function AddMaterialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    curriculumCode: '',
    title: '',
    url: '',
    type: 'video',
    language: 'et',
    isFree: true,
    provider: '',
    description: '',
    topic: '',
  });

  function update(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          gradeRange: '9',
          topic: form.topic || CURRICULUM_CODES.find((c) => c.code === form.curriculumCode)?.label || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Viga');
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
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 80px' }}>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
        <Link href="/dashboard/materials" style={{ color: '#6b7280', textDecoration: 'none' }}>
          ← Õppematerjalid
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', margin: '0 0 20px' }}>
        Lisa uus õppematerjal
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

        {/* Title */}
        <div>
          <label style={labelStyle}>Pealkiri *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            required
            placeholder="nt: Soojuspaisumine — selgitus ja katsed"
            style={inputStyle}
          />
        </div>

        {/* URL */}
        <div>
          <label style={labelStyle}>Link (URL) *</label>
          <input
            type="url"
            value={form.url}
            onChange={(e) => update('url', e.target.value)}
            required
            placeholder="https://..."
            style={inputStyle}
          />
        </div>

        {/* Type + Language row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Tüüp *</label>
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

        {/* Provider */}
        <div>
          <label style={labelStyle}>Platvorm / Allikas</label>
          <input
            type="text"
            value={form.provider}
            onChange={(e) => update('provider', e.target.value)}
            placeholder="nt: Khan Academy, Opiq, YouTube, e-koolikott"
            style={inputStyle}
          />
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Kirjeldus</label>
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Lühike kirjeldus — mida materjal katab?"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Free/Paid */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ ...labelStyle, margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={form.isFree}
              onChange={(e) => update('isFree', e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            Tasuta materjal
          </label>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 700,
            background: loading ? '#9ca3af' : '#1C2832',
            color: '#F8F3DA',
            border: 'none',
            cursor: loading ? 'wait' : 'pointer',
            marginTop: 8,
          }}
        >
          {loading ? 'Salvestamine...' : 'Lisa materjal'}
        </button>
      </form>
    </div>
  );
}
