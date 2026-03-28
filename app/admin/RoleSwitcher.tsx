'use client';

import { useState, useEffect } from 'react';

const ROLES = [
  { value: 'SUPERADMIN', label: 'Superadmin', desc: 'Täielik juurdepääs kõigele' },
  { value: 'SCHOOL_ADMIN', label: 'Kooli admin', desc: 'Haldab ühte kooli — kasutajad, AI seaded, limiidid' },
  { value: 'TEACHER', label: 'Õpetaja', desc: 'Loob teste, analüüsib tulemusi, näeb oma klasse' },
  { value: 'STUDENT', label: 'Õpilane', desc: 'Näeb oma tulemusi ja tagasisidet' },
  { value: 'PARENT', label: 'Lapsevanem', desc: 'Näeb oma lapse tulemusi' },
];

function readPreviewCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)ot_preview_role=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function RoleSwitcher() {
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    setActiveRole(readPreviewCookie());
  }, []);

  async function switchTo(role: string) {
    setSwitching(true);
    try {
      if (role === 'SUPERADMIN') {
        // Clear preview — go back to real role
        await fetch('/api/admin/preview-role', { method: 'DELETE' });
        setActiveRole(null);
      } else {
        await fetch('/api/admin/preview-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });
        setActiveRole(role);
      }
      // Reload to update server-rendered content and navbar
      window.location.href = role === 'TEACHER' ? '/dashboard' :
                             role === 'STUDENT' ? '/dashboard/results' :
                             role === 'PARENT' ? '/dashboard/parent' :
                             '/admin';
    } catch {
      setSwitching(false);
    }
  }

  return (
    <div style={{
      background: '#faf5ff',
      border: '2px solid #7c3aed',
      borderRadius: 8,
      padding: '20px 24px',
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>👁</span>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#7c3aed', margin: 0 }}>
          Rollide vahetamine
        </h3>
        <span style={{
          fontSize: 11, background: '#7c3aed', color: '#fff',
          padding: '2px 8px', borderRadius: 10, fontWeight: 600,
        }}>
          Ainult SUPERADMIN
        </span>
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>
        Vaata rakendust erinevate rollide vaatenurgast. Navigatsioon ja sisu muutub vastavalt valitud rollile.
        Tagasi saad alati siia, valides uuesti &quot;Superadmin&quot;.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ROLES.map(r => {
          const isActive = r.value === 'SUPERADMIN'
            ? !activeRole
            : activeRole === r.value;
          return (
            <button
              key={r.value}
              onClick={() => switchTo(r.value)}
              disabled={switching || isActive}
              title={r.desc}
              style={{
                padding: '10px 16px',
                borderRadius: 6,
                border: isActive ? '2px solid #7c3aed' : '1.5px solid #d1d5db',
                background: isActive ? '#7c3aed' : '#fff',
                color: isActive ? '#fff' : '#1C2832',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: isActive ? 'default' : 'pointer',
                opacity: switching ? 0.6 : 1,
                transition: 'all 0.15s',
              }}
            >
              {r.label}
              {isActive && ' ✓'}
            </button>
          );
        })}
      </div>
      {activeRole && (
        <div style={{
          marginTop: 12,
          padding: '8px 12px',
          background: '#fef3c7',
          borderRadius: 6,
          fontSize: 12,
          color: '#92400e',
          lineHeight: 1.5,
        }}>
          Vaatad rakendust <strong>{ROLES.find(r => r.value === activeRole)?.label}</strong> rollis.
          Sinu tegelik roll on endiselt SUPERADMIN.
        </div>
      )}
    </div>
  );
}
