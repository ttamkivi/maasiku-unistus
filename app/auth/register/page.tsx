'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const ROLE_LABELS: Record<string, string> = {
  TEACHER: 'Õpetaja',
  STUDENT: 'Õpilane',
  PARENT: 'Lapsevanem',
  ADMIN: 'Admin',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #DAD0A1',
  borderRadius: 4,
  fontSize: 14,
  color: '#1C2832',
  background: '#F8F3DA',
  outline: 'none',
  boxSizing: 'border-box',
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Laen...</div>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite') || '';
  const inviteEmail = searchParams.get('email') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('TEACHER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Client-side password validation
    if (password.length < 8 || !/\d/.test(password)) {
      setError('Parool peab olema vähemalt 8 tähemärki pikk ja sisaldama numbrit');
      return;
    }
    if (password !== confirmPassword) {
      setError('Paroolid ei kattu');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, ...(inviteToken ? { inviteToken } : {}) }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registreerimine ebaõnnestus');
        return;
      }

      // Auto-login: session cookie is already set by the API.
      // Redirect teachers to onboarding, everyone else to dashboard.
      const userRole = data.user?.role ?? role;
      window.location.href = userRole === 'TEACHER' ? '/dashboard/onboarding' : '/dashboard';
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

        {inviteToken && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 4,
            padding: '10px 14px',
            fontSize: 13,
            color: '#15803d',
            marginBottom: 18,
            fontWeight: 500,
          }}>
            Sind kutsuti liituma! Loo konto allpool.
          </div>
        )}

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
              style={inputStyle}
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
              onChange={(e) => { if (!inviteToken) setEmail(e.target.value); }}
              required
              autoComplete="email"
              readOnly={!!inviteToken}
              style={{ ...inputStyle, ...(inviteToken ? { background: '#e5e7eb', cursor: 'not-allowed' } : {}) }}
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
              style={inputStyle}
            />
            <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
              Vähemalt 8 tähemärki, sisaldagu vähemalt ühte numbrit
            </p>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="confirmPassword"
              style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 6 }}
            >
              Parool uuesti
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              style={inputStyle}
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
              style={{ ...inputStyle, cursor: 'pointer' }}
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
