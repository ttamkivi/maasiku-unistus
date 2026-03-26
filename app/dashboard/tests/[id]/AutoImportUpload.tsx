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
  rendering: 'Failide töötlemine...',
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

async function imageFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1.0, 800 / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context failed')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = () => reject(new Error('Pildi laadimine ebaõnnestus'));
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isPdf(file: File): boolean {
  return file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
}

function isImage(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpg|jpeg|png|heic|heif|webp|bmp|tiff|tif)$/i.test(file.name);
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(ms: number): string {
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs} sek`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins} min ${remainSecs} sek`;
}

export default function AutoImportUpload({ testId }: { testId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<string>('');
  const [result, setResult] = useState<AutoImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadMeta, setUploadMeta] = useState<{ startTime: Date; endTime: Date | null; pageCount: number; fileCount: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      setError('Faile ei valitud');
      return;
    }

    // Validate all files
    const invalidFiles = files.filter(f => !isPdf(f) && !isImage(f));
    if (invalidFiles.length > 0) {
      setError(`Toetamata failiformaat: ${invalidFiles.map(f => f.name).join(', ')}. Lae üles PDF, JPG, PNG või HEIC failid.`);
      return;
    }

    const totalSize = files.reduce((s, f) => s + f.size, 0);
    if (totalSize > 100 * 1024 * 1024) {
      setError('Failide kogumaht on liiga suur (max 100 MB)');
      return;
    }

    setError(null);
    setStatus('rendering');
    setProgress(`${files.length} faili töötlemine...`);
    const startTime = new Date();
    setUploadMeta({ startTime, endTime: null, pageCount: 0, fileCount: files.length });

    try {
      const allPages: string[] = [];
      let processed = 0;

      for (const file of files) {
        if (isPdf(file)) {
          const pdfPages = await renderPdfPages(file, (done, total) => {
            setProgress(`${file.name}: ${done}/${total} lehte`);
          });
          allPages.push(...pdfPages);
        } else if (isImage(file)) {
          setProgress(`${file.name} töötlemine...`);
          const base64 = await imageFileToBase64(file);
          allPages.push(base64);
        }
        processed++;
        if (files.length > 1) {
          setProgress(`${processed}/${files.length} faili töödeldud (${allPages.length} lehte kokku)`);
        }
      }

      if (allPages.length === 0) throw new Error('Failidest ei saanud ühtegi lehte');

      setStatus('uploading');
      setProgress(`${allPages.length} lehte leitud. Nimede tuvastamine...`);

      const res = await fetch(`/api/tests/${testId}/auto-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: allPages }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Import ebaõnnestus');
      }

      const data = await res.json() as AutoImportResult;
      const endTime = new Date();
      setResult(data);
      setStatus('done');
      setUploadMeta({ startTime, endTime, pageCount: allPages.length, fileCount: files.length });
      setProgress(`${data.summary.studentsCreated} õpilast loodud ${data.summary.pagesProcessed} lehelt`);

      // Refresh the page after a short delay to show the new results
      setTimeout(() => router.refresh(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga töötlemisel');
      setStatus('error');
    }
  }, [testId, router]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      processFiles(Array.from(fileList));
    }
  }, [processFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const fileList = e.dataTransfer.files;
    if (fileList && fileList.length > 0) {
      processFiles(Array.from(fileList));
    }
  }, [processFiles]);

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
                {result.summary.pagesProcessed} lehte töödeldud{uploadMeta ? ` (${uploadMeta.pageCount} lehte ${uploadMeta.fileCount} failist)` : ''}. Leht uueneb automaatselt.
              </p>
              {uploadMeta && (
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>
                  Alustatud: {formatTime(uploadMeta.startTime)}
                  {uploadMeta.endTime && (
                    <> · Lõpetatud: {formatTime(uploadMeta.endTime)} · Kestus: {formatDuration(uploadMeta.endTime.getTime() - uploadMeta.startTime.getTime())}</>
                  )}
                </p>
              )}
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
          {dragging ? 'Lase lahti, et laadida' : 'Lohista failid siia'}
        </p>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          või klõpsa, et valida failid
        </p>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 10, lineHeight: 1.5 }}>
          PDF, JPG, PNG, HEIC · mitu faili korraga · max 100 MB
          <br />
          AI tuvastab nimed, sobitab klassinimekirjaga ja loob tulemused automaatselt
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.bmp,.tiff,.tif,application/pdf,image/*"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
