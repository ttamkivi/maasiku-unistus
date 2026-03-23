'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { PhotoStorageChoice } from '@/lib/types';
import { resizeAndConvert } from '@/lib/imageUtils';

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

type EligibleStudent = {
  id: string;
  userId: string;
  name: string;
  class: string | null;
  school: string | null;
  consentScope: string;
};

// Get test subject id from test detail — we'll fetch it client-side
function useTestSubjectId(testId: string) {
  const [subjectId, setSubjectId] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/tests/${testId}`)
      .then((r) => r.json())
      .then((d) => { if (d?.subjectId) setSubjectId(d.subjectId); })
      .catch(() => {});
  }, [testId]);
  return subjectId;
}

export default function NewResultPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const testId = params.id;
  const testSubjectId = useTestSubjectId(testId);

  // Student search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EligibleStudent[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<EligibleStudent | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Other form state
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [storageMode, setStorageMode] = useState<PhotoStorageChoice>('local_only');
  const [trainingConsent, setTrainingConsent] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const qs = new URLSearchParams({ search: searchQuery.trim() });
        if (testSubjectId) qs.set('subjectId', testSubjectId);
        const res = await fetch(`/api/students/eligible?${qs.toString()}`);
        if (res.ok) {
          const data: EligibleStudent[] = await res.json();
          setSearchResults(data);
          setShowDropdown(true);
        }
      } catch {
        // ignore
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, testSubjectId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectStudent = (student: EligibleStudent) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setShowDropdown(false);
    setSearchResults([]);
  };

  const clearStudent = () => {
    setSelectedStudent(null);
    setSearchQuery('');
  };

  const processFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    if (photos.length + files.length > 8) {
      alert('Maksimaalselt 8 fotot lubatud.');
      return;
    }
    setProcessingPhotos(true);
    try {
      const newB64: string[] = [];
      const newPrev: string[] = [];
      for (const file of files) {
        const b64 = await resizeAndConvert(file);
        newB64.push(b64);
        newPrev.push(`data:image/jpeg;base64,${b64}`);
      }
      setPhotos((prev) => [...prev, ...newB64]);
      setPreviews((prev) => [...prev, ...newPrev]);
    } catch {
      alert('Foto töötlemine ebaõnnestus.');
    } finally {
      setProcessingPhotos(false);
    }
  }, [photos]);

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setError('Vali õpilane nimekirjast');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          score: score ? parseFloat(score) : undefined,
          maxScore: maxScore ? parseFloat(maxScore) : undefined,
          storageMode,
          photos: photos.length > 0 ? photos : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Viga loomisel');

      if (trainingConsent) {
        await fetch(`/api/tests/${testId}/results/${data.id}/training-consent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consentType: 'teacher' }),
        }).catch(() => {});
      }

      router.push(`/dashboard/tests/${testId}/results/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga loomisel');
      setLoading(false);
    }
  };

  return (
    <div>
      <style>{`
        @media (min-width: 1024px) {
          .new-result-grid { display: grid !important; grid-template-columns: 1fr 1fr; gap: 32px; align-items: start; }
        }
      `}</style>

      <div style={{ marginBottom: 16 }}>
        <Link
          href={`/dashboard/tests/${testId}`}
          style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}
        >
          ← Tagasi kontrolltöö juurde
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 24 }}>
        Lisa õpilase tulemus
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="new-result-grid" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* LEFT COLUMN — student + scores + settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Student search */}
            <div>
              <label style={labelStyle}>
                Õpilane <span style={{ color: '#ef4444' }}>*</span>
              </label>

              {selectedStudent ? (
                <div
                  style={{
                    border: '1.5px solid #86efac',
                    background: '#f0fdf4',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1C2832' }}>
                      {selectedStudent.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#1C2832', opacity: 0.6, marginTop: 2 }}>
                      {selectedStudent.school ?? ''}
                      {selectedStudent.class ? ` · ${selectedStudent.class}` : ''}
                      {' · '}
                      <span style={{ color: '#166534' }}>
                        {selectedStudent.consentScope === 'ALL_SUBJECTS' ? 'Kõik ained' : 'Konkreetne aine'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearStudent}
                    style={{
                      background: 'transparent',
                      border: '1px solid #9ca3af',
                      color: '#6b7280',
                      fontSize: 13,
                      padding: '4px 10px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Muuda
                  </button>
                </div>
              ) : (
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                      placeholder="Otsi õpilast..."
                      autoComplete="off"
                      style={inputStyle}
                    />
                    {searchLoading && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: 12,
                          color: '#9ca3af',
                        }}
                      >
                        Otsin...
                      </div>
                    )}
                  </div>

                  {showDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#fff',
                        border: '1.5px solid #DAD0A1',
                        borderTop: 'none',
                        maxHeight: 260,
                        overflowY: 'auto',
                        zIndex: 100,
                        boxShadow: '0 4px 12px rgba(28,40,50,0.12)',
                      }}
                    >
                      {searchResults.length === 0 ? (
                        <div
                          style={{
                            padding: '14px 16px',
                            fontSize: 13,
                            color: '#6b7280',
                            fontStyle: 'italic',
                          }}
                        >
                          Sobivaid õpilasi ei leitud. Õpilasel peab olema aktiivne nõusolek ja klassijuhataja kinnitatud sobivus.
                        </div>
                      ) : (
                        searchResults.map((student) => (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => selectStudent(student)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '10px 16px',
                              background: 'transparent',
                              border: 'none',
                              borderBottom: '1px solid #F0EDD6',
                              cursor: 'pointer',
                              display: 'block',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#F8F3DA')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>
                              {student.name}
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                              {student.school ?? ''}
                              {student.class ? ` · ${student.class}` : ''}
                              {' · '}
                              {student.consentScope === 'ALL_SUBJECTS' ? 'Kõik ained' : 'Konkreetne aine'}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 5 }}>
                    Kuvatakse ainult sobivad õpilased, kellel on aktiivne nõusolek.
                  </p>
                </div>
              )}
            </div>

            {/* Score fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Saadud punktid</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="nt. 38"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Maksimaalsed punktid</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  placeholder="nt. 50"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Score preview */}
            {score && maxScore && parseFloat(maxScore) > 0 && (
              <div style={{ background: '#F8F3DA', padding: '12px 14px', borderRadius: 4 }}>
                {(() => {
                  const pct = Math.round((parseFloat(score) / parseFloat(maxScore)) * 100);
                  const color = pct >= 70 ? '#16a34a' : pct >= 50 ? '#f97316' : '#dc2626';
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: '#1C2832' }}>{score} / {maxScore} punkti</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color }}>{pct}%</span>
                      </div>
                      <div style={{ height: 6, background: '#DAD0A1', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 3 }} />
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Storage choice */}
            <div>
              <label style={labelStyle}>Fotode säilitamine</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 14, color: '#1C2832' }}>
                  <input
                    type="radio"
                    name="storage"
                    value="local_only"
                    checked={storageMode === 'local_only'}
                    onChange={() => setStorageMode('local_only')}
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <span>
                    <strong>Ainult kohalikult</strong> – fotosid ei salvestata serverisse, kasutatakse ainult analüüsiks
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 14, color: '#1C2832' }}>
                  <input
                    type="radio"
                    name="storage"
                    value="store_centrally"
                    checked={storageMode === 'store_centrally'}
                    onChange={() => setStorageMode('store_centrally')}
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <span>
                    <strong>Salvestada keskselt</strong> – fotod salvestatakse turvalisse serverisse
                  </span>
                </label>
              </div>
            </div>

            {/* Training consent */}
            <div style={{ background: '#F8F3DA', padding: '14px 16px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 14, color: '#1C2832' }}>
                <input
                  type="checkbox"
                  checked={trainingConsent}
                  onChange={(e) => setTrainingConsent(e.target.checked)}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <span>
                  Nõustun anonüümse treeningandmete jagamisega – tagasiside anonüümiseeritud kujul aitab mudelil paremaks saada
                </span>
              </label>
            </div>

            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', fontSize: 13, color: '#b91c1c' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
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
                {loading ? 'Salvestan...' : 'Lisa tulemus'}
              </button>
              <Link
                href={`/dashboard/tests/${testId}`}
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
          </div>

          {/* RIGHT COLUMN — photo upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={labelStyle}>Kontrolltöö fotod</label>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                processFiles(Array.from(e.dataTransfer.files));
              }}
              onClick={() => document.getElementById('photo-input-result')?.click()}
              style={{
                border: `2px dashed ${dragOver ? '#1C2832' : '#DAD0A1'}`,
                background: dragOver ? '#F8F3DA' : '#fafaf8',
                padding: previews.length === 0 ? '48px 24px' : '20px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                minHeight: 160,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <div style={{ fontSize: 32, opacity: 0.5 }}>📷</div>
              <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.7, margin: 0 }}>
                {dragOver ? 'Lase lahti, et lisada' : 'Lohista siia või klõpsa'}
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                1–8 lehekülge · HEIC, JPG, PNG
              </p>
              {processingPhotos && (
                <p style={{ fontSize: 12, color: '#1C2832', margin: 0 }}>Töötlen fotosid...</p>
              )}
            </div>

            <input
              id="photo-input-result"
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) {
                  processFiles(Array.from(e.target.files));
                  e.target.value = '';
                }
              }}
            />

            {previews.length > 0 && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {previews.map((src, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: '3/4', background: '#f3f4f6', overflow: 'hidden' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                        style={{
                          position: 'absolute',
                          top: 3,
                          right: 3,
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          width: 20,
                          height: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                  {previews.length}/8 fotot lisatud
                </p>
              </>
            )}

            {/* Tip box */}
            <div style={{ background: '#F8F3DA', border: '1px solid #DAD0A1', padding: '12px 14px', fontSize: 13, color: '#1C2832', lineHeight: 1.6 }}>
              <strong>Vihje:</strong> Lisa kõik leheküljed ühekorraga. Parem kvaliteet = täpsem AI analüüs. Fotod suurendatakse automaatselt.
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
