'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { resizeAndConvert } from '@/lib/imageUtils';

interface Subject {
  id: string;
  name: string;
  category: string;
}

interface Props {
  subjects: Subject[];
  userName: string;
}

const GRADE_OPTIONS = [
  { value: '', label: 'Vali klass…' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}. klass` })),
];

type Step = 'form' | 'upload' | 'review' | 'analyzing' | 'done';

export default function NewExerciseClient({ subjects, userName }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [subjectId, setSubjectId] = useState('');
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('');
  const [studentNote, setStudentNote] = useState('');

  // Photos
  const [photos, setPhotos] = useState<{ base64: string; preview: string; caption: string }[]>([]);
  const [processingPhotos, setProcessingPhotos] = useState(false);

  // UI
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState('');
  const [exerciseId, setExerciseId] = useState<string | null>(null);

  // Group subjects by category
  const byCategory = subjects.reduce<Record<string, Subject[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    setProcessingPhotos(true);
    try {
      for (const file of files) {
        const base64 = await resizeAndConvert(file);
        const preview = `data:image/jpeg;base64,${base64}`;
        setPhotos((prev) => [...prev, { base64, preview, caption: '' }]);
      }
    } catch (err) {
      console.error('Photo processing error:', err);
      setError('Foto töötlemine ebaõnnestus. Proovi teist formaati.');
    } finally {
      setProcessingPhotos(false);
    }
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCaption(idx: number, caption: string) {
    setPhotos((prev) => prev.map((p, i) => (i === idx ? { ...p, caption } : p)));
  }

  async function handleSubmit() {
    if (photos.length === 0) {
      setError('Lisa vähemalt üks foto oma harjutustest.');
      return;
    }
    setError('');
    setStep('analyzing');

    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: photos.map((p) => ({ base64Data: p.base64, caption: p.caption })),
          topic,
          subjectId: subjectId || undefined,
          grade: grade || undefined,
          studentNote: studentNote || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Viga esitamisel');
        setStep('review');
        return;
      }
      const data = await res.json();
      setExerciseId(data.id);
      setStep('done');
    } catch {
      setError('Ühenduse viga. Proovi uuesti.');
      setStep('review');
    }
  }

  // ── Step: Info form ──────────────────────────────────────────────────────
  if (step === 'form') {
    const canContinue = topic.trim().length > 0;
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 80 }}>
        <Link href="/dashboard/exercises" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
          ← Harjutused
        </Link>

        <div style={{ marginTop: 12, marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 4 }}>
            Uus harjutus
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>
            Pildista oma vihik ja saa kohene AI tagasiside. Täida kõigepealt, mida lahendad.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Topic — required */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 6 }}>
              Mida lahendasid? *
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="nt. Ülesanded 5.1–5.5, Hõõrdejõud ja raskusjõud"
              style={{
                width: '100%', padding: '11px 12px',
                border: '1.5px solid #DAD0A1', borderRadius: 6,
                fontSize: 14, color: '#1C2832', boxSizing: 'border-box',
              }}
              autoFocus
            />
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              Kirjuta peatükk, ülesannete number või teema pealkiri
            </p>
          </div>

          {/* Subject */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 6 }}>
              Aine (valikuline)
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              style={{
                width: '100%', padding: '11px 12px',
                border: '1.5px solid #DAD0A1', borderRadius: 6,
                fontSize: 14, color: '#1C2832', background: '#fff', boxSizing: 'border-box',
              }}
            >
              <option value="">Vali aine…</option>
              {Object.entries(byCategory).map(([cat, subs]) => (
                <optgroup key={cat} label={cat}>
                  {subs.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 6 }}>
              Klass (valikuline)
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              style={{
                width: '100%', padding: '11px 12px',
                border: '1.5px solid #DAD0A1', borderRadius: 6,
                fontSize: 14, color: '#1C2832', background: '#fff', boxSizing: 'border-box',
              }}
            >
              {GRADE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Student note */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 6 }}>
              Kommentaar AI-le (valikuline)
            </label>
            <textarea
              value={studentNote}
              onChange={(e) => setStudentNote(e.target.value)}
              placeholder="nt. Ma ei saanud aru ülesande 3 teisest osast, proovisin kaks korda…"
              rows={3}
              style={{
                width: '100%', padding: '10px 12px',
                border: '1.5px solid #DAD0A1', borderRadius: 6,
                fontSize: 14, color: '#1C2832', fontFamily: 'inherit',
                resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            onClick={() => { if (canContinue) setStep('upload'); }}
            disabled={!canContinue}
            style={{
              background: canContinue ? '#1C2832' : '#d1d5db',
              color: canContinue ? '#F8F3DA' : '#9ca3af',
              border: 'none', padding: '14px',
              borderRadius: 8, fontSize: 16, fontWeight: 700,
              cursor: canContinue ? 'pointer' : 'not-allowed',
            }}
          >
            Järgmine: pildista →
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Upload photos ──────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 80 }}>
        <button
          onClick={() => setStep('form')}
          style={{ background: 'none', border: 'none', fontSize: 13, color: '#6b7280', cursor: 'pointer', padding: 0, marginBottom: 16 }}
        >
          ← Muuda teemat
        </button>

        <div
          style={{
            background: '#F8F3DA', border: '1px solid #DAD0A1',
            borderRadius: 8, padding: '12px 16px', marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 1 }}>
            {subjects.find((s) => s.id === subjectId)?.name || 'HARJUTUSED'} {grade ? `· ${grade}. klass` : ''}
          </div>
          <div style={{ fontWeight: 700, color: '#1C2832', fontSize: 16, marginTop: 2 }}>{topic}</div>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C2832', marginBottom: 4 }}>
          Pildista oma vihik
        </h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
          Tee selge foto igast leheküljest. AI näeb kõiki fotosid ja analüüsib tervet lahendust.
        </p>

        {photos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
            {photos.map((p, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                <img
                  src={p.preview}
                  alt={`Foto ${idx + 1}`}
                  style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 6, border: '2px solid #DAD0A1' }}
                />
                <button
                  onClick={() => removePhoto(idx)}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                    border: 'none', borderRadius: '50%',
                    width: 24, height: 24, cursor: 'pointer',
                    fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
                <input
                  type="text"
                  placeholder="Lehekülje märkus (valikuline)"
                  value={p.caption}
                  onChange={(e) => updateCaption(idx, e.target.value)}
                  style={{
                    marginTop: 4, width: '100%', fontSize: 12,
                    padding: '4px 6px', border: '1px solid #e5e7eb',
                    borderRadius: 3, color: '#1C2832', boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          capture="environment"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="exercise-photo-input"
        />
        <label
          htmlFor="exercise-photo-input"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '18px',
            border: `2px dashed ${photos.length === 0 ? '#1C2832' : '#DAD0A1'}`,
            borderRadius: 8, cursor: processingPhotos ? 'wait' : 'pointer',
            background: photos.length === 0 ? '#F8F3DA' : '#f9fafb',
            color: '#1C2832', fontWeight: 600, fontSize: 16, boxSizing: 'border-box',
            opacity: processingPhotos ? 0.7 : 1,
          }}
        >
          {processingPhotos ? '⏳ Töötlen fotot…' : `📷 ${photos.length === 0 ? 'Pildista vihik' : 'Lisa veel fotosid'}`}
        </label>

        {photos.length > 0 && (
          <button
            onClick={() => setStep('review')}
            style={{
              marginTop: 14, width: '100%',
              background: '#1C2832', color: '#F8F3DA',
              border: 'none', padding: '16px',
              borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Vaata üle ja esita →
          </button>
        )}
      </div>
    );
  }

  // ── Step: Review ─────────────────────────────────────────────────────────
  if (step === 'review') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 80 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C2832', marginBottom: 4 }}>
          Vaata üle enne esitamist
        </h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
          Veendu, et fotod on selged ja kiri loetav.
        </p>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, padding: '12px 16px', color: '#dc2626', fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
          {photos.map((p, idx) => (
            <div key={idx}>
              <img
                src={p.preview}
                alt={`Foto ${idx + 1}`}
                style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }}
              />
              {p.caption && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{p.caption}</div>}
            </div>
          ))}
        </div>

        <div style={{ background: '#F8F3DA', border: '1px solid #DAD0A1', borderRadius: 6, padding: '12px 14px', marginBottom: 20, fontSize: 13 }}>
          <div style={{ fontWeight: 700, color: '#1C2832', marginBottom: 4 }}>{topic}</div>
          {studentNote && <div style={{ color: '#4b5563' }}>{studentNote}</div>}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setStep('upload')}
            style={{
              flex: 1, background: '#fff', color: '#1C2832',
              border: '1px solid #d1d5db', padding: '14px',
              borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ← Muuda
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 2, background: '#1C2832', color: '#F8F3DA',
              border: 'none', padding: '14px',
              borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            ✓ Esita ja saa tagasiside
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Analyzing ──────────────────────────────────────────────────────
  if (step === 'analyzing') {
    return (
      <div style={{ maxWidth: 400, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
          AI analüüsib sinu harjutusi…
        </h2>
        <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
          See võib võtta 10–30 sekundit. Palun oota.
        </p>
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: '#DAD0A1',
                animation: `pulse 1.2s ${i * 0.4}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>
      </div>
    );
  }

  // ── Step: Done ───────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 400, margin: '60px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
        Tagasiside on valmis!
      </h2>
      <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
        AI on su harjutused üle vaadanud ja tagasiside koostanud.
      </p>
      <button
        onClick={() => router.push(`/dashboard/exercises/${exerciseId}`)}
        style={{
          marginTop: 24, background: '#1C2832', color: '#F8F3DA',
          border: 'none', padding: '16px 32px',
          borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer',
        }}
      >
        Vaata tagasisidet →
      </button>
    </div>
  );
}
