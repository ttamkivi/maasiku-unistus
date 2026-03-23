'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WithdrawButton({ resultId, testId }: { resultId: string; testId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleWithdraw = async () => {
    if (!confirm('Kas soovid kindlasti nõusoleku tühistada? Anonüümistatud andmed kustutatakse.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tests/${testId}/results/${resultId}/training-consent`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Viga nõusoleku tühistamisel.');
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      alert('Viga nõusoleku tühistamisel.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
        Tühistatud
      </span>
    );
  }

  return (
    <button
      onClick={handleWithdraw}
      disabled={loading}
      style={{
        background: 'transparent',
        color: loading ? '#9ca3af' : '#b45309',
        fontSize: 12,
        fontWeight: 700,
        border: `1.5px solid ${loading ? '#9ca3af' : '#b45309'}`,
        borderRadius: 4,
        padding: '6px 12px',
        cursor: loading ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? 'Tühistamine...' : 'Tühista nõusolek'}
    </button>
  );
}
