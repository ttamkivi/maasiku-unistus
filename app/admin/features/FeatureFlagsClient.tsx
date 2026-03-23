'use client';

import { useState } from 'react';

interface Flag {
  key: string;
  enabled: boolean;
  description: string;
  updatedAt: Date | string;
  updatedBy: string | null;
}

const GROUP_LABELS: Record<string, string> = {
  LOGIN: 'Sisselogimise meetodid',
  DASHBOARD: 'Töölauale juurdepääs',
  STUDENT: 'Õpilase funktsionaalsus',
  EKOOL: 'Integratsioonid',
};

function groupKey(key: string): string {
  if (key.startsWith('LOGIN_')) return 'LOGIN';
  if (key.startsWith('DASHBOARD_')) return 'DASHBOARD';
  if (key.startsWith('EKOOL_')) return 'EKOOL';
  return 'STUDENT';
}

export default function FeatureFlagsClient({ initialFlags }: { initialFlags: Flag[] }) {
  const [flags, setFlags] = useState<Flag[]>(initialFlags);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggle = async (key: string, newEnabled: boolean) => {
    setPending((p) => new Set([...p, key]));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });

    try {
      const res = await fetch('/api/admin/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled: newEnabled }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Viga');
      const { flag } = await res.json() as { flag: Flag };
      setFlags((prev) => prev.map((f) => f.key === key ? { ...f, ...flag } : f));
    } catch (err) {
      setErrors((e) => ({ ...e, [key]: err instanceof Error ? err.message : 'Viga' }));
    } finally {
      setPending((p) => { const n = new Set(p); n.delete(key); return n; });
    }
  };

  // Group flags
  const groups: Record<string, Flag[]> = {};
  for (const flag of flags) {
    const g = groupKey(flag.key);
    if (!groups[g]) groups[g] = [];
    groups[g].push(flag);
  }

  const groupOrder = ['LOGIN', 'DASHBOARD', 'STUDENT', 'EKOOL'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {groupOrder.filter((g) => groups[g]?.length).map((groupId) => (
        <div key={groupId}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#1C2832', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            {GROUP_LABELS[groupId] ?? groupId}
          </h2>
          <div style={{ border: '1.5px solid #DAD0A1', borderRadius: 6, overflow: 'hidden' }}>
            {groups[groupId].map((flag, i) => {
              const isBusy = pending.has(flag.key);
              const err = errors[flag.key];
              return (
                <div
                  key={flag.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: i < groups[groupId].length - 1 ? '1px solid #F0EDD6' : 'none',
                    background: flag.enabled ? '#fff' : '#FDFAF0',
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1C2832' }}>
                        {flag.description}
                      </span>
                      <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>
                        {flag.key}
                      </span>
                    </div>
                    {err && (
                      <p style={{ fontSize: 12, color: '#b91c1c', margin: '4px 0 0 0' }}>{err}</p>
                    )}
                  </div>

                  {/* Toggle switch */}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => toggle(flag.key, !flag.enabled)}
                    aria-label={flag.enabled ? 'Lülita välja' : 'Lülita sisse'}
                    style={{
                      position: 'relative',
                      width: 48,
                      height: 26,
                      borderRadius: 13,
                      border: 'none',
                      background: isBusy ? '#9ca3af' : flag.enabled ? '#1C2832' : '#DAD0A1',
                      cursor: isBusy ? 'wait' : 'pointer',
                      flexShrink: 0,
                      transition: 'background 0.2s',
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 3,
                      left: flag.enabled ? 25 : 3,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
