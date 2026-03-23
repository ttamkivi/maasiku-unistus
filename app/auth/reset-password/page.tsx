'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Paroolid ei ühti'); return; }
    if (password.length < 8) { setError('Parool peab olema vähemalt 8 märki'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Viga'); return; }
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch {
      setError('Võrguühenduse viga');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>
        Vigane või aegunud link. <Link href="/auth/forgot-password" style={{ color: '#1C2832' }}>Proovi uuesti.</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ background: '#fff', boxShadow: '0 2px 16px rgba(28,40,50,0.10)', borderRadius: 8, padding: '40px 36px', width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>Uus parool</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>Vali endale uus parool.</p>

        {done ? (
          <div style={{ background: '#f0faf4', border: '1px solid #a8dab5', color: '#1e6e3a', borderRadius: 4, padding: '14px', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
            ✓ Parool muudetud! Suunan sisselogimisele…
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 6 }}>Uus parool</label>
              <input
                type="password"
                name="new-password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #DAD0A1', borderRadius: 4, fontSize: 14, color: '#1C2832', background: '#F8F3DA', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 6 }}>Korda parooli</label>
              <input
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #DAD0A1', borderRadius: 4, fontSize: 14, color: '#1C2832', background: '#F8F3DA', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            {error && <div style={{ background: '#fff0f0', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 4, padding: '10px', fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: loading ? '#6b7f8b' : '#1C2832', color: '#fff', fontWeight: 700, fontSize: 15, padding: '12px', border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Salvestamine...' : 'Salvesta uus parool'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
