'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Viga');
        return;
      }
      setSubmitted(true);
      if (data.devResetUrl) setDevResetUrl(data.devResetUrl);
    } catch {
      setError('Võrguühenduse viga. Proovi uuesti.');
    } finally {
      setLoading(false);
    }
  }

  const boxStyle = {
    background: '#fff',
    boxShadow: '0 2px 16px rgba(28,40,50,0.10)',
    borderRadius: 8,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
  };

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={boxStyle}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1C2832', marginBottom: 8, letterSpacing: '-0.3px' }}>
          Unustasid parooli?
        </h1>
        <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.6, marginBottom: 28 }}>
          Sisesta oma e-posti aadress — saadame parooli lähtestamise lingi.
        </p>

        {submitted ? (
          <div>
            <div style={{
              background: '#f0faf4', border: '1px solid #a8dab5',
              color: '#1e6e3a', borderRadius: 4, padding: '14px 16px',
              fontSize: 14, fontWeight: 600, marginBottom: 16,
            }}>
              ✓ Kui see e-post on meil kirjas, saad varsti lingi.
            </div>

            {/* Dev mode: show the link directly on screen */}
            {devResetUrl && (
              <div style={{
                background: '#fef9c3', border: '1px solid #fde047',
                borderRadius: 6, padding: '14px 16px', marginBottom: 16,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#854d0e', marginBottom: 8 }}>
                  🛠 ARENDUSREŽIIM — e-kirja ei saadeta
                </div>
                <div style={{ fontSize: 12, color: '#78350f', marginBottom: 8 }}>
                  Kasuta seda linki parooli lähtestamiseks:
                </div>
                <a
                  href={devResetUrl}
                  style={{
                    display: 'block', wordBreak: 'break-all',
                    fontSize: 12, color: '#1d4ed8', textDecoration: 'underline',
                  }}
                >
                  {devResetUrl}
                </a>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 22 }}>
              <label htmlFor="fp-email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 6 }}>
                E-post
              </label>
              <input
                id="fp-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  width: '100%', padding: '10px 12px',
                  border: '1.5px solid #DAD0A1', borderRadius: 4,
                  fontSize: 14, color: '#1C2832', background: '#F8F3DA',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{ background: '#fff0f0', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 4, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', background: loading ? '#6b7f8b' : '#1C2832',
                color: '#fff', fontWeight: 700, fontSize: 15, padding: '12px',
                border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Saatmine...' : 'Saada link'}
            </button>
          </form>
        )}

        <p style={{ marginTop: 24, fontSize: 13, color: '#1C2832', textAlign: 'center' }}>
          <Link href="/auth/login" style={{ color: '#1C2832', fontWeight: 700, textDecoration: 'underline' }}>
            Tagasi sisselogimisele
          </Link>
        </p>
      </div>
    </div>
  );
}
