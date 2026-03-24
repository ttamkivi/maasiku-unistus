'use client';

import { useState } from 'react';
import posthog from 'posthog-js';

const TYPES = [
  { value: 'bug',        label: '🐛 Viga' },
  { value: 'suggestion', label: '💡 Ettepanek' },
  { value: 'praise',     label: '👏 Kiitus' },
];

export default function FeedbackPage() {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('suggestion');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) { setError('Palun kirjuta midagi.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message, page: window.location.pathname }),
      });
      if (!res.ok) throw new Error('viga');
      posthog.capture('feedback_submitted', { type });
      setSuccess(true);
    } catch {
      setError('Saatmine ebaõnnestus. Proovi uuesti.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ maxWidth: 520, margin: '48px auto', textAlign: 'center', padding: '0 16px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
          Aitäh!
        </h1>
        <p style={{ fontSize: 15, color: '#6b7280' }}>Sinu tagasiside on saadetud.</p>
        <a
          href="/dashboard"
          style={{
            display: 'inline-block',
            marginTop: 24,
            background: '#1C2832',
            color: '#F8F3DA',
            fontWeight: 700,
            fontSize: 14,
            padding: '11px 24px',
            textDecoration: 'none',
            borderRadius: 4,
          }}
        >
          Tagasi töölauale
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
        💬 Tagasiside
      </h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>
        Ütle meile, mis töötab, mis ei tööta ja mida soovid lisada.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Type selector */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 10 }}>
            Tüüp
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {TYPES.map((t) => (
              <label
                key={t.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '8px 14px',
                  border: type === t.value ? '2px solid #1C2832' : '1.5px solid #DAD0A1',
                  borderRadius: 6,
                  background: type === t.value ? '#F8F3DA' : '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: type === t.value ? 700 : 500,
                  color: '#1C2832',
                  userSelect: 'none',
                }}
              >
                <input
                  type="radio"
                  name="type"
                  value={t.value}
                  checked={type === t.value}
                  onChange={() => setType(t.value)}
                  style={{ display: 'none' }}
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        {/* Message */}
        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="message"
            style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2832', marginBottom: 6 }}
          >
            Mida soovid jagada?
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mis töötab hästi? Mis on segane? Mis on puudu?"
            rows={5}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1.5px solid #DAD0A1',
              borderRadius: 4,
              fontSize: 14,
              color: '#1C2832',
              background: '#F8F3DA',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {error && (
          <div style={{
            background: '#fff0f0',
            border: '1px solid #fca5a5',
            color: '#dc2626',
            borderRadius: 4,
            padding: '10px 14px',
            fontSize: 13,
            marginBottom: 16,
          }}>
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
          {loading ? 'Saadan...' : 'Saada tagasiside'}
        </button>
      </form>
    </div>
  );
}
