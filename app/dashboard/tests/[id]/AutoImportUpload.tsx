'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Status = 'idle' | 'rendering' | 'uploading' | 'done' | 'error';

interface AutoImportResult {
  created: Array<{ id: string; studentName: string }>;
  summary: {
    studentsCreated: number;
    pagesProcessed: number;
    issues: string[];
  };
}

const STATUS_MESSAGES: Record<Status, string> = {
  idle: '',
  rendering: 'PDF-i töötlemine...',
  uploading: 'Nimede tuvastamine ja tulemuste loomine...',
  done: 'Valmis!',
  error: 'Viga',
};

async function renderPdfPages(
  file: File,
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const scale = Math.min(1.0, 800 / viewport.width);
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    await page.render({ canvas, viewport: scaledViewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    pages.push(dataUrl.split(',')[1]);
    onProgress?.(i, numPages);
  }

  return pages;
}

export default function AutoImportUpload({ testId }: { testId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<string>('');
  const [result, setResult] = useState<AutoImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Palun vali PDF-fail');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('Fail on liiga suur (max 100 MB)');
      return;
    }

    setError(null);
    setStatus('rendering');
    setProgress('PDF-i lehekülgede renderdamine...');

    try {
      const pages = await renderPdfPages(file, (done, total) => {
        setProgress(`Renderdamine: ${done}/${total} lehte`);
      });

      if (pages.length === 0) throw new Error('PDF-ist ei saanud ühtegi lehte');

      setStatus('uploading');
      setProgress(`${pages.length} lehte leitud. Nimede tuvastamine...`);

      const res = await fetch(`/api/tests/${testId}/auto-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Import ebaõnnestus');
      }

      const data = await res.json() as AutoImportResult;
      setResult(data);
      setStatus('done');
      setProgress(`${data.summary.studentsCreated} õpilast loodud ${data.summary.pagesProcessed} lehelt`);

      // Refresh the page after a short delay to show the new results
      setTimeout(() => router.refresh(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga töötlemisel');
      setStatus('error');
    }
  }, [testId, router]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  // Processing state — show progress
  if (status === 'rendering' || status === 'uploading') {
    return (
      <div style={{
        background: '#F8F3DA', border: '2px solid #DAD0A1', padding: '36px 24px',
        textAlign: 'center', borderRadius: 6,
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>
          {status === 'rendering' ? '📄' : '🔍'}
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
          {STATUS_MESSAGES[status]}
        </p>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          {progress}
        </p>
        <div style={{ height: 4, background: '#DAD0A1', borderRadius: 2, overflow: 'hidden', maxWidth: 280, margin: '0 auto' }}>
          <div style={{
            height: '100%', background: '#1C2832', borderRadius: 2,
            animation: 'pulse-bar 1.5s ease-in-out infinite', width: '40%',
          }} />
        </div>
        <style>{`@keyframes pulse-bar { 0%{margin-left:0} 50%{margin-left:60%} 100%{margin-left:0} }`}</style>
      </div>
    );
  }

  // Done state — show summary
  if (status === 'done' && result) {
    const hasIssues = result.summary.issues.length > 0;
    return (
      <div>
        <div style={{
          background: hasIssues ? '#fef3c7' : '#f0fdf4',
          border: `2px solid ${hasIssues ? '#fcd34d' : '#86efac'}`,
          padding: '24px 20px', borderRadius: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: hasIssues ? 16 : 0 }}>
            <span style={{ fontSize: 28 }}>{hasIssues ? '⚠️' : '✓'}</span>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1C2832', margin: 0 }}>
                {result.summary.studentsCreated} õpilase tulemused loodud
              </p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
                {result.summary.pagesProcessed} lehte töödeldud. Leht uueneb automaatselt.
              </p>
            </div>
          </div>

          {hasIssues && (
            <div style={{ borderTop: '1px solid #fcd34d', paddingTop: 12, marginTop: 4 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Tähelepanu
              </p>
              {result.summary.issues.map((issue, i) => (
                <p key={i} style={{ fontSize: 13, color: '#92400e', lineHeight: 1.5, margin: '4px 0' }}>
                  • {issue}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Idle / error state — show upload zone
  return (
    <div>
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '10px 14px', marginBottom: 12, borderRadius: 4 }}>
          <p style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>{error}</p>
        </div>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        style={{
          background: dragging ? '#EBE7CC' : '#F8F3DA',
          border: `2px dashed ${dragging ? '#1C2832' : '#DAD0A1'}`,
          padding: '36px 24px',
          textAlign: 'center',
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 10 }}>
          {dragging ? '📥' : '📄'}
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#1C2832' }}>
          {dragging ? 'Lase lahti, et laadida' : 'Lohista skannitud PDF siia'}
        </p>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          või klõpsa, et valida fail
        </p>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 10 }}>
          AI tuvastab nimed, sobitab klassinimekirjaga ja loob tulemused automaatselt
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
