'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ROLE_LABELS: Record<string, string> = {
  TEACHER: 'Õpetaja',
  STUDENT: 'Õpilane',
  PARENT: 'Lapsevanem',
  ADMIN: 'Admin',
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('TEACHER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registreerimine ebaõnnestus');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Võrguühenduse viga. Proovi uuesti.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          background: '#fff',
          boxShadow: '0 2px 16px rgba(28,40,50,0.10)',
          borderRadius: 8,
          padding: '40px 36px',
          width: '100%',
          maxWidth: 400,
        }}
      >
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: '#1C2832',
            marginBottom: 8,
            letterSpacing: '-0.3px',
          }}
        >
          Loo konto
        </h1>
        <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.6, marginBottom: 28 }}>
          Liitu Maasiku Unistusega
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="name"
              style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 6 }}
            >
              Täisnimi
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1.5px solid #DAD0A1',
                borderRadius: 4,
                fontSize: 14,
                color: '#1C2832',
                background: '#F8F3DA',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="email"
              style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 6 }}
            >
              E-post
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1.5px solid #DAD0A1',
                borderRadius: 4,
                fontSize: 14,
                color: '#1C2832',
                background: '#F8F3DA',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 6 }}
            >
              Parool
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1.5px solid #DAD0A1',
                borderRadius: 4,
                fontSize: 14,
                color: '#1C2832',
                background: '#F8F3DA',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="role"
              style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 6 }}
            >
              Roll
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1.5px solid #DAD0A1',
                borderRadius: 4,
                fontSize: 14,
                color: '#1C2832',
                background: '#F8F3DA',
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div
              style={{
                background: '#fff0f0',
                border: '1px solid #f5c2c2',
                color: '#c0392b',
                borderRadius: 4,
                padding: '10px 14px',
                fontSize: 13,
                marginBottom: 18,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#6b7f8b' : '#1C2832',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              padding: '12px',
              border: 'none',
              borderRadius: 4,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.2px',
            }}
          >
            {loading ? 'Konto loomine...' : 'Loo konto'}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 13, color: '#1C2832', textAlign: 'center' }}>
          Juba on konto?{' '}
          <Link href="/auth/login" style={{ color: '#1C2832', fontWeight: 700, textDecoration: 'underline' }}>
            Logi sisse
          </Link>
        </p>
      </div>
    </div>
  );
}
