'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Mustand',
  PUBLISHED: 'Avaldatud',
  CLOSED: 'Suletud',
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#f3f4f6', color: '#6b7280' },
  PUBLISHED: { bg: '#bbf7d0', color: '#15803d' },
  CLOSED: { bg: '#fef08a', color: '#854d0e' },
};

export default function AssignmentPublishButton({
  assignmentId,
  currentStatus,
}: {
  assignmentId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const sc = STATUS_COLORS[currentStatus] || STATUS_COLORS.DRAFT;

  async function changeStatus(newStatus: string) {
    setLoading(true);
    try {
      await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{
        background: sc.bg,
        color: sc.color,
        fontSize: 12,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 12,
      }}>
        {STATUS_LABELS[currentStatus] || currentStatus}
      </span>

      {currentStatus === 'DRAFT' && (
        <button
          onClick={() => changeStatus('PUBLISHED')}
          disabled={loading}
          style={{
            background: '#15803d',
            color: '#fff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          Avalda
        </button>
      )}

      {currentStatus === 'PUBLISHED' && (
        <button
          onClick={() => changeStatus('CLOSED')}
          disabled={loading}
          style={{
            background: '#854d0e',
            color: '#fff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          Sulge
        </button>
      )}
    </div>
  );
}
