'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteResultButton({
  testId,
  resultId,
  studentName,
}: {
  testId: string;
  resultId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setErrorMsg(null);

    if (!confirming) {
      setConfirming(true);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/tests/${testId}/results/${resultId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.refresh();
      } else {
        setErrorMsg('Kustutamine ebaõnnestus');
        setConfirming(false);
      }
    } catch {
      setErrorMsg('Võrgu viga');
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  }

  function handleCancel(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setConfirming(false);
  }

  if (confirming) {
    return (
      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }} onClick={(e) => e.preventDefault()}>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            background: '#dc2626',
            color: '#fff',
            border: 'none',
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 3,
            cursor: deleting ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {deleting ? '...' : 'Kustuta'}
        </button>
        <button
          onClick={handleCancel}
          style={{
            background: '#e5e7eb',
            color: '#374151',
            border: 'none',
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 6px',
            borderRadius: 3,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
    {errorMsg && <span style={{ color: '#dc2626', fontSize: 11 }}>{errorMsg}</span>}
    <button
      onClick={handleDelete}
      title={`Kustuta ${studentName || 'tulemus'}`}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 14,
        color: '#d1d5db',
        padding: '2px 6px',
        borderRadius: 3,
        transition: 'color 0.15s',
      }}
      onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#dc2626'; }}
      onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#d1d5db'; }}
    >
      ✕
    </button>
    </span>
  );
}
