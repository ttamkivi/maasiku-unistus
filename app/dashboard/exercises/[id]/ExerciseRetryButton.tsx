'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ExerciseRetryButton({ exerciseId }: { exerciseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRetry() {
    setLoading(true);
    try {
      await fetch(`/api/exercises/${exerciseId}`, { method: 'POST' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRetry}
      disabled={loading}
      style={{
        marginTop: 16,
        background: loading ? '#d1d5db' : '#1C2832',
        color: loading ? '#9ca3af' : '#F8F3DA',
        border: 'none',
        padding: '12px 24px',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 700,
        cursor: loading ? 'wait' : 'pointer',
      }}
    >
      {loading ? '⏳ Analüüsin uuesti…' : '↺ Proovi uuesti'}
    </button>
  );
}
