'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  testId: string;
  consentedNames: string[];
  hasDuplicates: boolean;
  withoutConsentCount: number;
}

export default function ConsentActions({ testId, consentedNames, hasDuplicates, withoutConsentCount }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'merging' | 'deleting' | 'done'>('idle');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const post = async (action: string, extra?: object) => {
    const res = await fetch(`/api/tests/${testId}/consent-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, consentedNames, ...extra }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Viga');
    return d;
  };

  const handleMerge = async () => {
    setStatus('merging');
    setError('');
    try {
      const d = await post('merge');
      setMsg(`Ühendatud: ${d.merged} duplikaati eemaldatud`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Viga');
    } finally {
      setStatus('idle');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Kustutan ${withoutConsentCount} tulemust (ilma nõusolekuta). Jätkan?`)) return;
    setStatus('deleting');
    setError('');
    try {
      const d = await post('delete_without_consent');
      setMsg(`Kustutatud: ${d.deleted} tulemust`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Viga');
    } finally {
      setStatus('idle');
    }
  };

  const busy = status !== 'idle';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {msg && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '10px 14px', fontSize: 13, color: '#166534', borderRadius: 4 }}>
          ✓ {msg}
        </div>
      )}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', fontSize: 13, color: '#b91c1c', borderRadius: 4 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {hasDuplicates && (
          <button
            type="button"
            onClick={handleMerge}
            disabled={busy}
            style={{
              background: '#1C2832',
              color: '#F8F3DA',
              fontWeight: 700,
              fontSize: 14,
              padding: '11px 20px',
              border: 'none',
              cursor: busy ? 'not-allowed' : 'pointer',
              borderRadius: 4,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {status === 'merging' ? 'Ühendamine…' : '🔗 Ühenda lehed õpilase kaupa'}
          </button>
        )}

        {withoutConsentCount > 0 && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            style={{
              background: '#fee2e2',
              color: '#b91c1c',
              fontWeight: 700,
              fontSize: 14,
              padding: '11px 20px',
              border: '1.5px solid #fca5a5',
              cursor: busy ? 'not-allowed' : 'pointer',
              borderRadius: 4,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {status === 'deleting' ? 'Kustutamine…' : `🗑 Kustuta ${withoutConsentCount} ilma nõusolekuta`}
          </button>
        )}
      </div>
    </div>
  );
}
