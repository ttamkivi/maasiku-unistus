'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  testId: string;
  nextStatusLabel: string;
}

export default function TestAdvanceButton({ testId, nextStatusLabel }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdvance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advance: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Viga');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga');
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleAdvance}
        disabled={loading}
        style={{
          background: loading ? '#6b7280' : '#1C2832',
          color: '#F8F3DA',
          fontWeight: 700,
          fontSize: 14,
          padding: '10px 18px',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          width: '100%',
        }}
      >
        {loading ? 'Palun oota...' : `Liigu edasi → ${nextStatusLabel}`}
      </button>
      {error && (
        <p style={{ fontSize: 12, color: '#b91c1c', marginTop: 6 }}>{error}</p>
      )}
    </div>
  );
}
