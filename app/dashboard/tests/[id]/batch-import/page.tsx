'use client';

import { useState, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Assignment {
  index: number;
  imageB64: string;
  proposedName: string | null;
  confirmedName: string;
  include: boolean;
}

type Phase = 'upload' | 'rendering' | 'identifying' | 'review' | 'confirming' | 'done';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1.5px solid #DAD0A1',
  fontSize: 13,
  color: '#1C2832',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

async function renderPdfPages(file: File, onProgress?: (done: number, total: number) => void): Promise<string[]> {
  // Dynamically import pdfjs-dist to keep it out of the initial bundle
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    // Scale to ~100 DPI for A4 (794px wide) — readable by Claude, compact enough to transfer
    const viewport = page.getViewport({ scale: 1.0 });
    const scale = Math.min(1.0, 800 / viewport.width);
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    await page.render({ canvas, viewport: scaledViewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    pages.push(dataUrl.split(',')[1]); // strip "data:image/jpeg;base64,"
    onProgress?.(i, numPages);
  }

  return pages;
}

export default function BatchImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: testId } = use(params);
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('upload');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Palun vali PDF-fail');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('Fail on liiga suur (max 100 MB)');
      return;
    }

    setError(null);
    setPhase('rendering');
    setRenderProgress(null);

    try {
      // Step 1: render PDF pages to JPEG in the browser
      const pages = await renderPdfPages(file, (done, total) => {
        setRenderProgress({ done, total });
      });

      if (pages.length === 0) {
        throw new Error('PDF-ist ei saanud ühtegi lehte');
      }

      // Step 2: send page images to the server for AI name identification
      setPhase('identifying');

      const BATCH = 20; // send in batches of 20 to avoid hitting context limits
      const nameMap = new Map<number, string | null>();

      for (let start = 0; start < pages.length; start += BATCH) {
        const slice = pages.slice(start, start + BATCH);
        const res = await fetch(`/api/tests/${testId}/batch-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'identify', pages: slice }),
        });

        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || 'Tuvastamine ebaõnnestus');
        }

        const result = await res.json() as {
          pages: Array<{ index: number; name: string | null }>;
        };

        for (const p of result.pages ?? []) {
          // Adjust index relative to full array
          nameMap.set(start + p.index, p.name ?? null);
        }
      }

      setAssignments(
        pages.map((b64, i) => ({
          index: i,
          imageB64: b64,
          proposedName: nameMap.get(i) ?? null,
          confirmedName: nameMap.get(i) ?? '',
          include: true,
        }))
      );
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga töötlemisel');
      setPhase('upload');
    }
  }, [testId]);

  const handleConfirm = async () => {
    const toCreate = assignments.filter((a) => a.include && a.confirmedName.trim());
    if (toCreate.length === 0) {
      setError('Ükski leht pole kaasatud');
      return;
    }

    setPhase('confirming');
    setError(null);

    try {
      const res = await fetch(`/api/tests/${testId}/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          assignments: toCreate.map((a) => ({
            studentName: a.confirmedName.trim(),
            photo: a.imageB64,
          })),
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Loomine ebaõnnestus');
      }

      setPhase('done');
      setTimeout(() => router.push(`/dashboard/tests/${testId}`), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga loomisel');
      setPhase('review');
    }
  };

  const includedCount = assignments.filter((a) => a.include && a.confirmedName.trim()).length;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          href={`/dashboard/tests/${testId}`}
          style={{ fontSize: 13, color: '#1C2832', opacity: 0.6, textDecoration: 'none' }}
        >
          ← Tagasi kontrolltöö juurde
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
        Tulemuste sisselugemine ja töötlemine
      </h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, marginTop: 0 }}>
        Lae üles skannitud PDF — AI tuvastab iga lehe õpilase nime automaatselt.
      </p>

      {/* ── Phase: upload ── */}
      {phase === 'upload' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #DAD0A1',
            background: '#F8F3DA',
            borderRadius: 8,
            padding: '60px 24px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', margin: 0 }}>
            Klõpsa, et valida PDF-fail
          </p>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
            Üks PDF kõigi õpilaste töödega · max 100 MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* ── Phase: rendering ── */}
      {phase === 'rendering' && (
        <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '40px 32px', textAlign: 'center', borderRadius: 6 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🖼️</div>
          <p style={{ fontSize: 15, color: '#1C2832', fontWeight: 600, marginBottom: 8 }}>
            Lehti töödeldakse brauseris…
          </p>
          {renderProgress ? (
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              {renderProgress.done} / {renderProgress.total} lehte
            </p>
          ) : (
            <p style={{ fontSize: 13, color: '#6b7280' }}>Palun oota.</p>
          )}
        </div>
      )}

      {/* ── Phase: identifying ── */}
      {phase === 'identifying' && (
        <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '40px 32px', textAlign: 'center', borderRadius: 6 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔍</div>
          <p style={{ fontSize: 15, color: '#1C2832', fontWeight: 600, marginBottom: 8 }}>
            AI tuvastab õpilaste nimesid…
          </p>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            30 õpilase puhul ~20–40 sekundit. Palun oota.
          </p>
        </div>
      )}

      {/* ── Phase: review ── */}
      {phase === 'review' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 14, color: '#1C2832', margin: 0 }}>
              <strong>{assignments.length}</strong> lehte · {includedCount} kaasatakse
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setAssignments((prev) => prev.map((a) => ({ ...a, include: true })))}
                style={{ fontSize: 12, padding: '6px 12px', background: '#F8F3DA', border: '1.5px solid #DAD0A1', color: '#1C2832', cursor: 'pointer' }}
              >
                Vali kõik
              </button>
              <button
                type="button"
                onClick={() => setAssignments((prev) => prev.map((a) => ({ ...a, include: false })))}
                style={{ fontSize: 12, padding: '6px 12px', background: '#F8F3DA', border: '1.5px solid #DAD0A1', color: '#1C2832', cursor: 'pointer' }}
              >
                Tühista kõik
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {assignments.map((a) => (
              <div
                key={a.index}
                style={{
                  border: a.include ? '2px solid #1C2832' : '2px solid #DAD0A1',
                  borderRadius: 6,
                  overflow: 'hidden',
                  background: a.include ? '#fff' : '#F8F3DA',
                  opacity: a.include ? 1 : 0.55,
                }}
              >
                <div style={{ position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/jpeg;base64,${a.imageB64}`}
                    alt={`Leht ${a.index + 1}`}
                    style={{ width: '100%', display: 'block', aspectRatio: '3/4', objectFit: 'cover' }}
                  />
                  <span style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(28,40,50,0.75)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>
                    {a.index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAssignments((prev) => prev.map((x) => x.index === a.index ? { ...x, include: !x.include } : x))}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 24, height: 24, borderRadius: '50%',
                      background: a.include ? '#16a34a' : '#9ca3af',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, color: '#fff', fontWeight: 700,
                    }}
                  >
                    {a.include ? '✓' : '×'}
                  </button>
                </div>
                <div style={{ padding: '8px 10px' }}>
                  {a.proposedName && (
                    <p style={{ fontSize: 10, color: '#6b7280', margin: '0 0 4px 0' }}>
                      AI: {a.proposedName}
                    </p>
                  )}
                  <input
                    type="text"
                    value={a.confirmedName}
                    onChange={(e) => setAssignments((prev) => prev.map((x) => x.index === a.index ? { ...x, confirmedName: e.target.value } : x))}
                    placeholder="Õpilase nimi"
                    style={inputStyle}
                  />
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={includedCount === 0}
              style={{
                flex: 1,
                background: includedCount === 0 ? '#9ca3af' : '#1C2832',
                color: '#F8F3DA',
                fontWeight: 700,
                fontSize: 15,
                padding: '13px',
                border: 'none',
                cursor: includedCount === 0 ? 'not-allowed' : 'pointer',
                borderRadius: 4,
              }}
            >
              Kinnita ja loo {includedCount} tulemust
            </button>
            <button
              type="button"
              onClick={() => { setPhase('upload'); setAssignments([]); setError(null); setRenderProgress(null); }}
              style={{ padding: '13px 20px', background: '#F8F3DA', color: '#1C2832', fontWeight: 700, fontSize: 15, border: '1.5px solid #DAD0A1', cursor: 'pointer', borderRadius: 4 }}
            >
              Alusta uuesti
            </button>
          </div>
        </>
      )}

      {/* ── Phase: confirming ── */}
      {phase === 'confirming' && (
        <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '40px 32px', textAlign: 'center', borderRadius: 6 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>💾</div>
          <p style={{ fontSize: 15, color: '#1C2832', fontWeight: 600 }}>Loon tulemusi andmebaasis...</p>
        </div>
      )}

      {/* ── Phase: done ── */}
      {phase === 'done' && (
        <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', padding: '40px 32px', textAlign: 'center', borderRadius: 6 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>✅</div>
          <p style={{ fontSize: 15, color: '#166534', fontWeight: 700 }}>Tulemused edukalt loodud! Suunan tagasi...</p>
        </div>
      )}

      {phase === 'upload' && error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginTop: 16 }}>
          {error}
        </div>
      )}
    </div>
  );
}
