'use client';

import { useState } from 'react';

export function EligibilitySection({
  studentId,
  isEligible: initialEligible,
  note: initialNote,
  activeConsentsCount,
}: {
  studentId: string;
  isEligible: boolean | null;
  note: string | null;
  activeConsentsCount: number;
}) {
  const [isEligible, setIsEligible] = useState<boolean>(initialEligible ?? false);
  const [note, setNote] = useState(initialNote ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const handleUpdate = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/permissions/${studentId}/eligibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEligible, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Viga salvestamisel');
      setMessage({ type: 'ok', text: 'Sobivuse staatus uuendatud.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Viga' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {activeConsentsCount === 0 && (
        <div
          style={{
            background: '#fef9c3',
            border: '1px solid #fde047',
            padding: '12px 16px',
            fontSize: 13,
            color: '#854d0e',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>⚠</span>
          <span>Hoiatus: Õpilasel puuduvad aktiivsed lapsevanema nõusolekud. Sobivuse kinnitamine ei anna AI tagasiside õigust ilma kehtiva nõusolekuta.</span>
        </div>
      )}

      {/* Current status display */}
      <div>
        <span style={{ fontSize: 13, color: '#1C2832', opacity: 0.6 }}>Praegune staatus: </span>
        {initialEligible === null ? (
          <span style={{ fontSize: 13, fontStyle: 'italic', color: '#1C2832', opacity: 0.5 }}>
            Kinnitamata
          </span>
        ) : initialEligible ? (
          <span style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>✓ Sobiv</span>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 700, color: '#991b1b' }}>✗ Ei sobi</span>
        )}
      </div>

      {/* Toggle */}
      <div>
        <div
          onClick={() => setIsEligible(!isEligible)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            background: isEligible ? '#dcfce7' : '#fee2e2',
            border: `2px solid ${isEligible ? '#86efac' : '#fca5a5'}`,
            padding: '14px 20px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              width: 46,
              height: 26,
              background: isEligible ? '#16a34a' : '#dc2626',
              borderRadius: 13,
              position: 'relative',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 3,
                left: isEligible ? 23 : 3,
                width: 20,
                height: 20,
                background: '#fff',
                borderRadius: '50%',
                transition: 'left 0.2s',
              }}
            />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1C2832' }}>
            {isEligible ? '✓ Õpilane on sobiv AI tagasiside saamiseks' : '✗ Õpilane ei ole sobiv AI tagasiside saamiseks'}
          </span>
        </div>
      </div>

      {/* Note textarea */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 700,
            color: '#1C2832',
            marginBottom: 5,
          }}
        >
          Märkus
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Sobivuse kohta lisateave..."
          style={{
            width: '100%',
            padding: '9px 12px',
            border: '1.5px solid #DAD0A1',
            fontSize: 14,
            color: '#1C2832',
            background: '#fff',
            outline: 'none',
            boxSizing: 'border-box',
            resize: 'vertical',
          }}
        />
      </div>

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

      <div>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={saving}
          style={{
            background: saving ? '#6b7280' : '#1C2832',
            color: '#F8F3DA',
            fontWeight: 700,
            fontSize: 14,
            padding: '10px 24px',
            border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Uuendan...' : 'Uuenda'}
        </button>
      </div>
    </div>
  );
}
