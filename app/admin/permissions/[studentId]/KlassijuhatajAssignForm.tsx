'use client';

import { useState } from 'react';

type KJ = { id: string; name: string };

export function KlassijuhatajAssignForm({
  studentId,
  currentKjId,
  klassijuhatajad,
}: {
  studentId: string;
  currentKjId: string | null;
  klassijuhatajad: KJ[];
}) {
  const [selectedKjId, setSelectedKjId] = useState(currentKjId ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    if (!selectedKjId) {
      setMessage({ type: 'error', text: 'Vali klassijuhataja' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/permissions/${studentId}/klassijuhataja`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ klassijuhatajId: selectedKjId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Viga salvestamisel');
      setMessage({ type: 'ok', text: 'Klassijuhataja salvestatud.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Viga' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {klassijuhatajad.length === 0 ? (
        <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.5, fontStyle: 'italic' }}>
          Selles koolis pole klassijuhatajaid registreeritud.
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedKjId}
            onChange={(e) => setSelectedKjId(e.target.value)}
            style={{
              padding: '9px 12px',
              border: '1.5px solid #DAD0A1',
              fontSize: 14,
              color: '#1C2832',
              background: '#fff',
              minWidth: 220,
              outline: 'none',
            }}
          >
            <option value="">Vali klassijuhataja...</option>
            {klassijuhatajad.map((kj) => (
              <option key={kj.id} value={kj.id}>
                {kj.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? '#6b7280' : '#1C2832',
              color: '#F8F3DA',
              fontWeight: 700,
              fontSize: 14,
              padding: '9px 20px',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Salvestab...' : 'Salvesta'}
          </button>
        </div>
      )}

      {message && (
        <div
          style={{
            padding: '8px 14px',
            fontSize: 13,
            background: message.type === 'ok' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'ok' ? '#166534' : '#991b1b',
            border: `1px solid ${message.type === 'ok' ? '#86efac' : '#fca5a5'}`,
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
