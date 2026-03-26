'use client';

import { useState } from 'react';

interface ArchivedSectionProps {
  children: React.ReactNode;
  count: number;
}

export default function ArchivedSection({ children, count }: ArchivedSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      background: '#fff',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      borderRadius: 8,
      marginBottom: 28,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '16px 22px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1C2832' }}>
            Lõpetatud tööd
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#6b7280',
            background: '#f3f4f6',
            padding: '2px 8px',
            borderRadius: 10,
          }}>
            {count}
          </span>
        </div>
        <span
          style={{
            fontSize: 14,
            color: '#1C2832',
            opacity: 0.4,
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▼
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 22px 18px 22px' }}>
          {children}
        </div>
      )}
    </div>
  );
}
