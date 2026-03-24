'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sisselogimine ebaõnnestus');
        return;
      }
      window.location.href = '/dashboard';
    } catch {
      setError('Võrguühenduse viga. Proovi uuesti.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    border: '1.5px solid #DAD0A1',
    borderRadius: 4,
    fontSize: 15,
    color: '#1C2832',
    background: '#F8F3DA',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ background: '#fff', boxShadow: '0 2px 16px rgba(28,40,50,0.10)', borderRadius: 8, padding: '40px 36px', width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1C2832', marginBottom: 6, letterSpacing: '-0.3px' }}>
          Logi sisse
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>
          Tere tulemast Õpetaja Tagasisidese
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 6 }}>
              E-post
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 6 }}>
              Parool
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>

          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <Link href="/auth/forgot-password" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'underline' }}>
              Unustasid parooli?
            </Link>
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
              width: '100%',
              background: loading ? '#6b7f8b' : '#1C2832',
              color: '#F8F3DA',
              fontWeight: 700,
              fontSize: 15,
              padding: '13px',
              border: 'none',
              borderRadius: 4,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Sisselogimine…' : 'Logi sisse'}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 13, color: '#1C2832', textAlign: 'center' }}>
          Pole veel kontot?{' '}
          <Link href="/auth/register" style={{ color: '#1C2832', fontWeight: 700, textDecoration: 'underline' }}>
            Registreeru
          </Link>
        </p>
      </div>
    </div>
  );
}
