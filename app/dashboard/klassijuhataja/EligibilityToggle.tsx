'use client';

import { useState } from 'react';

export function EligibilityToggle({
  studentId,
  initialEligible,
}: {
  studentId: string;
  initialEligible: boolean | null;
}) {
  const [isEligible, setIsEligible] = useState<boolean>(initialEligible ?? false);
  const [saving, setSaving] = useState(false);

  const handleToggle = async () => {
    const newValue = !isEligible;
    setIsEligible(newValue);
    setSaving(true);
    try {
      await fetch(`/api/admin/permissions/${studentId}/eligibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEligible: newValue }),
      });
    } catch {
      // Revert on error
      setIsEligible(!newValue);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={saving}
      title={isEligible ? 'Märgi mittesobivaks' : 'Märgi sobivaks'}
      style={{
        background: isEligible ? '#dcfce7' : '#fee2e2',
        border: `2px solid ${isEligible ? '#86efac' : '#fca5a5'}`,
        padding: '8px 16px',
        cursor: saving ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        opacity: saving ? 0.7 : 1,
        minWidth: 140,
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 36,
          height: 20,
          background: isEligible ? '#16a34a' : '#dc2626',
          borderRadius: 10,
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: isEligible ? 18 : 2,
            width: 16,
            height: 16,
            background: '#fff',
            borderRadius: '50%',
            transition: 'left 0.2s',
          }}
        />
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: isEligible ? '#166534' : '#991b1b',
        }}
      >
        {saving ? '...' : isEligible ? 'Sobiv' : 'Ei sobi'}
      </span>
    </button>
  );
}
