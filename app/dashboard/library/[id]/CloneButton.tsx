'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CloneButton({ testId, large }: { testId: string; large?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClone() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/library/${testId}/clone`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Viga');
        return;
      }
      setDone(true);
      // Navigate to the cloned test after a moment
      setTimeout(() => router.push(`/dashboard/tests/${data.id}`), 800);
    } catch {
      setError('Võrgu viga');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <span
        style={{
          background: '#bbf7d0',
          color: '#15803d',
          fontWeight: 700,
          fontSize: large ? 15 : 14,
          padding: large ? '12px 24px' : '10px 18px',
          whiteSpace: 'nowrap',
          display: 'inline-block',
        }}
      >
        ✓ Kopeeritud!
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={handleClone}
        disabled={loading}
        style={{
          background: loading ? '#9ca3af' : '#1C2832',
          color: '#F8F3DA',
          fontWeight: 700,
          fontSize: large ? 15 : 14,
          padding: large ? '12px 24px' : '10px 18px',
          border: 'none',
          cursor: loading ? 'wait' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {loading ? 'Kopeerin...' : 'Kopeeri minu testidesse'}
      </button>
      {error && (
        <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{error}</p>
      )}
    </div>
  );
}
