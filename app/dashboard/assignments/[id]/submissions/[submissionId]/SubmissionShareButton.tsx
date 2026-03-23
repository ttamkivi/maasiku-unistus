'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SubmissionShareButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function share() {
    setLoading(true);
    try {
      await fetch(`/api/submissions/${submissionId}/share`, { method: 'POST' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: '#F8F3DA',
      border: '2px solid #DAD0A1',
      borderRadius: 8,
      padding: 20,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>👩‍🏫</div>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#1C2832', marginBottom: 4 }}>
        Saada õpetajale
      </p>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        Jaga oma töö ja AI tagasiside õpetajaga. Õpetaja näeb sinu fotosid ja tagasisidet.
      </p>
      <button
        onClick={share}
        disabled={loading}
        style={{
          background: loading ? '#9ca3af' : '#1C2832',
          color: '#F8F3DA',
          border: 'none',
          padding: '14px 28px',
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Saadan…' : '✓ Jaga õpetajaga'}
      </button>
    </div>
  );
}
