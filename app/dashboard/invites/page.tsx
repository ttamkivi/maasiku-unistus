'use client';

import { useState, useEffect } from 'react';

interface Invite {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'used' | 'expired';
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #DAD0A1',
  fontSize: 15,
  color: '#1C2832',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
  background: '#1C2832',
  color: '#F8F3DA',
  fontWeight: 700,
  fontSize: 15,
  padding: '12px 24px',
  border: 'none',
  cursor: 'pointer',
  width: '100%',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Ootel', bg: '#fef08a', color: '#854d0e' },
  used: { label: 'Registreerunud', bg: '#bbf7d0', color: '#15803d' },
  expired: { label: 'Aegunud', bg: '#e5e7eb', color: '#6b7280' },
};

function formatDate(d: string): string {
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export default function InvitesPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);

  useEffect(() => {
    fetch('/api/invites')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setInvites(data); })
      .catch(() => {});
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Nimi ja e-post on kohustuslikud');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Viga kutse saatmisel');
      setSuccess(`Kutse saadetud aadressile ${email.trim()}!`);
      setName('');
      setEmail('');
      // Refresh invites list
      const listRes = await fetch('/api/invites');
      const listData = await listRes.json();
      if (Array.isArray(listData)) setInvites(listData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga kutse saatmisel');
    } finally {
      setLoading(false);
    }
  }

  const card: React.CSSProperties = {
    background: '#fff',
    border: '1.5px solid #DAD0A1',
    padding: '32px 28px',
    maxWidth: 600,
    margin: '0 auto',
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingTop: 16, paddingBottom: 60 }}>
      {/* Send invite form */}
      <div style={card}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
          Kutsu kolleeg
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
          Kutsu teine õpetaja platvormi proovima
        </p>

        <form onSubmit={handleSend}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
              Nimi <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kolleegi nimi"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
              E-post <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kolleeg@kool.ee"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', fontSize: 13, color: '#15803d', marginBottom: 16 }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ ...primaryBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Saadan...' : 'Saada kutse →'}
          </button>
        </form>
      </div>

      {/* Sent invites list */}
      <div style={{ ...card, marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C2832', marginBottom: 16 }}>
          Saadetud kutsed
        </h2>

        {invites.length === 0 ? (
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            Sa pole veel ühtegi kutset saatnud.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {invites.map((inv, i) => {
              const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.pending;
              return (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: i < invites.length - 1 ? '1px solid #F8F3DA' : 'none',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>{inv.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {inv.email} · {formatDate(inv.createdAt)}
                    </div>
                  </div>
                  <span style={{
                    background: cfg.bg,
                    color: cfg.color,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 3,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
