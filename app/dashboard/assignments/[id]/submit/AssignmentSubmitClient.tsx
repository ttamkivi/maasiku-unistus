'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { resizeAndConvert } from '@/lib/imageUtils';

interface Props {
  assignmentId: string;
  assignmentTitle: string;
  assignmentDescription: string;
  subjectName: string | null;
  teacherName: string;
  studentName: string;
}

export default function AssignmentSubmitClient({
  assignmentId,
  assignmentTitle,
  assignmentDescription,
  subjectName,
  teacherName,
  studentName,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<{ base64: string; preview: string; caption: string }[]>([]);
  const [studentNote, setStudentNote] = useState('');
  const [step, setStep] = useState<'upload' | 'review' | 'analyzing' | 'done'>('upload');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [processingPhotos, setProcessingPhotos] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    setProcessingPhotos(true);
    try {
      for (const file of files) {
        const base64 = await resizeAndConvert(file);
        const preview = `data:image/jpeg;base64,${base64}`;
        setPhotos(prev => [...prev, { base64, preview, caption: '' }]);
      }
    } catch (err) {
      console.error('Photo processing error:', err);
      setError('Foto töötlemine ebaõnnestus. Proovi teist formaati.');
    } finally {
      setProcessingPhotos(false);
    }
  }

  function removePhoto(idx: number) {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  }

  function updateCaption(idx: number, caption: string) {
    setPhotos(prev => prev.map((p, i) => i === idx ? { ...p, caption } : p));
  }

  async function handleSubmit() {
    if (photos.length === 0) {
      setError('Lisa vähemalt üks foto oma kodutööst.');
      return;
    }
    setError('');
    setStep('analyzing');

    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: photos.map(p => ({ base64Data: p.base64, caption: p.caption })),
          studentNote,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Viga esitamisel');
        setStep('review');
        return;
      }
      const data = await res.json();
      setSubmissionId(data.id);
      setStep('done');
    } catch {
      setError('Ühenduse viga. Proovi uuesti.');
      setStep('review');
    }
  }

  // Step: Upload photos
  if (step === 'upload') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 0 80px' }}>
        {/* Assignment context */}
        <div style={{
          background: '#F8F3DA',
          border: '1px solid #DAD0A1',
          borderRadius: 8,
          padding: '14px 16px',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 1 }}>
            {subjectName || 'KODUTÖÖ'} · {teacherName}
          </div>
          <div style={{ fontWeight: 700, color: '#1C2832', fontSize: 17, marginTop: 2 }}>{assignmentTitle}</div>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C2832', marginBottom: 4 }}>
          Pildista oma kodutöö
        </h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
          Tee selge foto igast vihiku leheküljest, kus on kodutöö. AI analüüsib su tööd ja annab tagasisidet.
        </p>

        {/* Photo grid */}
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
                >✕</button>
                <input
                  type="text"
                  placeholder={`Lehekülje märkus (valikuline)`}
                  value={p.caption}
                  onChange={e => updateCaption(idx, e.target.value)}
                  style={{
                    marginTop: 4, width: '100%', fontSize: 12,
                    padding: '4px 6px', border: '1px solid #e5e7eb',
                    borderRadius: 3, color: '#1C2832',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Add photo button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            capture="environment"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="photo-input"
          />
          <label
            htmlFor="photo-input"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '16px',
              border: `2px dashed ${photos.length === 0 ? '#1C2832' : '#DAD0A1'}`,
              borderRadius: 8,
              cursor: 'pointer',
              background: photos.length === 0 ? '#F8F3DA' : '#f9fafb',
              color: '#1C2832',
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            📷 {photos.length === 0 ? 'Pildista kodutöö' : 'Lisa veel fotosid'}
          </label>
        </div>

        {photos.length > 0 && (
          <>
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 6 }}>
                Kommentaar (valikuline)
              </label>
              <textarea
                value={studentNote}
                onChange={e => setStudentNote(e.target.value)}
                placeholder="Kirjuta mida tahtsid teha aga ei saanud, mis oli raske, küsimused…"
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px',
                  border: '1px solid #d1d5db', borderRadius: 4,
                  fontSize: 14, color: '#1C2832', fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep('review')}
                style={{
                  flex: 1,
                  background: '#1C2832',
                  color: '#F8F3DA',
                  border: 'none',
                  padding: '16px',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Vaata üle ja esita →
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Step: Review before submit
  if (step === 'review') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 0 80px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C2832', marginBottom: 4 }}>
          Vaata üle enne esitamist
        </h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
          Veendu, et kõik fotod on selged ja loetavad.
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

        {studentNote && (
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Sinu kommentaar</div>
            <div style={{ fontSize: 14, color: '#1C2832' }}>{studentNote}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setStep('upload')}
            style={{
              flex: 1,
              background: '#fff',
              color: '#1C2832',
              border: '1px solid #d1d5db',
              padding: '14px',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Muuda
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 2,
              background: '#1C2832',
              color: '#F8F3DA',
              border: 'none',
              padding: '14px',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ✓ Esita ja saa tagasiside
          </button>
        </div>
      </div>
    );
  }

  // Step: Analyzing
  if (step === 'analyzing') {
    return (
      <div style={{ maxWidth: 400, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
          AI analüüsib sinu tööd…
        </h2>
        <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
          See võib võtta 10–30 sekundit. Palun oota.
        </p>
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 8 }}>
          {[0, 1, 2].map(i => (
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

  // Step: Done
  return (
    <div style={{ maxWidth: 400, margin: '60px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
        Tagasiside on valmis!
      </h2>
      <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
        AI on su kodutöö üle vaadanud ja tagasiside koostanud.
      </p>
      <button
        onClick={() => router.push(`/dashboard/assignments/${assignmentId}/submissions/${submissionId}`)}
        style={{
          marginTop: 24,
          background: '#1C2832',
          color: '#F8F3DA',
          border: 'none',
          padding: '16px 32px',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Vaata tagasisidet →
      </button>
    </div>
  );
}
