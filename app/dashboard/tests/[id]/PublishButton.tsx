'use client';

import { useState } from 'react';

export default function PublishButton({
  testId,
  currentVisibility,
}: {
  testId: string;
  currentVisibility: string;
}) {
  const [visibility, setVisibility] = useState(currentVisibility);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPublic = visibility === 'PUBLIC';

  async function handleToggle() {
    setLoading(true);
    setError(null);
    try {
      const newVisibility = isPublic ? 'PRIVATE' : 'PUBLIC';
      const res = await fetch(`/api/tests/${testId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newVisibility }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Viga');
        return;
      }
      setVisibility(data.visibility);
    } catch {
      setError('Võrgu viga');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '16px 20px' }}>
      <p
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#1C2832',
          opacity: 0.5,
          marginBottom: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Raamatukogu
      </p>

      {isPublic ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span
              style={{
                background: '#bbf7d0',
                color: '#15803d',
                fontSize: 12,
                fontWeight: 700,
                padding: '3px 10px',
              }}
            >
              Avalik
            </span>
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              Teised õpetajad näevad seda testi
            </span>
          </div>
          <button
            onClick={handleToggle}
            disabled={loading}
            style={{
              background: '#fff',
              color: '#dc2626',
              border: '1.5px solid #fca5a5',
              fontSize: 13,
              fontWeight: 600,
              padding: '8px 14px',
              cursor: loading ? 'wait' : 'pointer',
              width: '100%',
            }}
          >
            {loading ? 'Peidan...' : 'Peida raamatukogust'}
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10, lineHeight: 1.5 }}>
            Jaga oma testi teiste õpetajatega raamatukogus. Vajalik: hindamisjuhend või õiged
            vastused.
          </p>
          <button
            onClick={handleToggle}
            disabled={loading}
            style={{
              background: loading ? '#9ca3af' : '#1C2832',
              color: '#F8F3DA',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              padding: '10px 14px',
              cursor: loading ? 'wait' : 'pointer',
              width: '100%',
            }}
          >
            {loading ? 'Avaldan...' : 'Avalda raamatukogus'}
          </button>
        </div>
      )}

      {error && (
        <p style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{error}</p>
      )}
    </div>
  );
}
