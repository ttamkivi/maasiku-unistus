'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  testId: string;
  uploadedCount: number;
}

export default function BulkAnalyzeButton({ testId, uploadedCount }: Props) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const handleClick = async () => {
    setState('running');
    setErrorMsg('');

    try {
      // Fetch all UPLOADED results with photos
      const metaRes = await fetch(`/api/tests/${testId}/bulk-analyze`);
      if (!metaRes.ok) throw new Error('Tulemuste laadimine ebaõnnestus');
      const meta = await metaRes.json() as {
        results: Array<{ id: string; studentName: string | null }>;
      };

      if (meta.results.length === 0) {
        setState('idle');
        return;
      }

      setProgress({ done: 0, total: meta.results.length, current: '' });

      for (let i = 0; i < meta.results.length; i++) {
        const r = meta.results[i];
        setProgress({ done: i, total: meta.results.length, current: r.studentName || 'Õpilane' });

        const res = await fetch(`/api/tests/${testId}/bulk-analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resultId: r.id }),
        });

        if (!res.ok) {
          const d = await res.json();
          console.warn(`Analysis failed for result ${r.id}:`, d.error);
          // Continue with next result instead of stopping
        }
      }

      setProgress((p) => ({ ...p, done: meta.results.length, current: '' }));
      setState('done');
      setTimeout(() => router.refresh(), 800);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Viga analüüsimisel');
      setState('error');
    }
  };

  if (uploadedCount === 0) return null;

  if (state === 'running') {
    const { done, total, current } = progress;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return (
      <div style={{ border: '1.5px solid #DAD0A1', borderRadius: 4, padding: '12px 16px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1C2832' }}>
            AI analüüsib... {done}/{total}
          </span>
          {current && (
            <span style={{ fontSize: 12, color: '#6b7280' }}>{current}</span>
          )}
        </div>
        <div style={{ background: '#F8F3DA', borderRadius: 4, height: 6, overflow: 'hidden' }}>
          <div style={{ background: '#1C2832', height: '100%', width: `${pct}%`, transition: 'width 0.3s' }} />
        </div>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', borderRadius: 4, padding: '10px 16px', fontSize: 13, color: '#166534', fontWeight: 700 }}>
        ✓ Analüüs lõpetatud — laen uuesti...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        type="button"
        onClick={handleClick}
        style={{
          background: '#e9d5ff',
          color: '#6d28d9',
          border: '1.5px solid #c4b5fd',
          fontWeight: 700,
          fontSize: 13,
          padding: '9px 16px',
          cursor: 'pointer',
          borderRadius: 4,
          whiteSpace: 'nowrap',
        }}
      >
        ✦ Analüüsi kõik ({uploadedCount})
      </button>
      {state === 'error' && (
        <p style={{ fontSize: 12, color: '#b91c1c', margin: 0 }}>{errorMsg}</p>
      )}
    </div>
  );
}
