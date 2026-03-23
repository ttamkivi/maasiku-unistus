'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('cookie_consent');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!consent) setVisible(true);
    } catch {}
  }, []);

  async function handleAccept() {
    try {
      localStorage.setItem('cookie_consent', 'true');
    } catch {}
    setVisible(false);
    try {
      await fetch('/api/cookie-consent', { method: 'POST' });
    } catch {}
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#1C2832',
        color: '#F8F3DA',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        borderTop: '3px solid #DAD0A1',
      }}
    >
      <p style={{ fontSize: 14, margin: 0, flex: '1 1 300px', lineHeight: 1.5 }}>
        Kasutame küpsiseid seansi haldamiseks ning PostHog analüütikat teenuse parandamiseks (andmed EU serverites, ilma isikuandmeteta). Rohkem infot meie{' '}
        <Link
          href="/privacy"
          style={{ color: '#DAD0A1', textDecoration: 'underline' }}
        >
          privaatsuspoliitikas
        </Link>
        .
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <Link
          href="/privacy"
          style={{
            color: '#DAD0A1',
            fontSize: 13,
            textDecoration: 'underline',
            whiteSpace: 'nowrap',
          }}
        >
          Loe lähemalt
        </Link>
        <button
          onClick={handleAccept}
          style={{
            background: '#DAD0A1',
            color: '#1C2832',
            fontSize: 14,
            fontWeight: 700,
            padding: '9px 22px',
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Nõustun
        </button>
      </div>
    </div>
  );
}
