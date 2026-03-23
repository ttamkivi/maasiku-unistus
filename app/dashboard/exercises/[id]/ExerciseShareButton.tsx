'use client';

import { useState } from 'react';

interface Props {
  exerciseId: string;
}

export default function ExerciseShareButton({ exerciseId }: Props) {
  const [shared, setShared] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      await fetch(`/api/exercises/${exerciseId}/share`, { method: 'POST' });
      setShared(true);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (shared) {
    return (
      <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 600, textAlign: 'center', padding: '12px 0' }}>
        ✓ Jagatud õpetajaga!
      </div>
    );
  }

  return (
    <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 8, padding: '16px 20px', marginBottom: 20, textAlign: 'center' }}>
      <p style={{ fontSize: 13, color: '#166534', marginBottom: 12 }}>
        Soovid jagada seda tagasisidet oma õpetajaga?
      </p>
      <button
        onClick={handleShare}
        disabled={loading}
        style={{
          background: '#16a34a',
          color: '#fff',
          border: 'none',
          padding: '10px 24px',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Saadan…' : 'Jaga õpetajaga'}
      </button>
    </div>
  );
}
