'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Viga / Bug' },
  { value: 'improvement', label: 'Parendusidee' },
  { value: 'question', label: 'Küsimus' },
  { value: 'other', label: 'Muu' },
];

export default function FeedbackWidget() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.id) {
          setUser(data);
          setEmail(data.email ?? '');
        }
      })
      .catch(() => {});
  }, []);

  if (!user) return null;

  function openModal() {
    setOpen(true);
    setSubmitted(false);
    setError('');
    setMessage('');
    setType('bug');
  }

  function closeModal() {
    setOpen(false);
    setSubmitted(false);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError('Palun kirjelda oma tagasisidet.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          email: email.trim() || undefined,
          userId: user?.id,
          page: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      });
      if (!res.ok) throw new Error('Serveriviga');
      setSubmitted(true);
      setTimeout(() => setOpen(false), 2500);
    } catch {
      setError('Saatmine ebaõnnestus. Palun proovi uuesti.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={openModal}
        title="Tagasiside arendajale"
        style={{
          position: 'fixed',
          bottom: 80,
          right: 24,
          zIndex: 9000,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: '#1C2832',
          color: '#F8F3DA',
          border: '2px solid #DAD0A1',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}
      >
        ?
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(28, 40, 50, 0.55)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            padding: '0 24px 136px 0',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            style={{
              background: '#F8F3DA',
              border: '2px solid #DAD0A1',
              width: '100%',
              maxWidth: 400,
              padding: 24,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
              }}
            >
              <h2
                style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', margin: 0 }}
              >
                Tagasiside arendajale
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 20,
                  color: '#1C2832',
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>

            {submitted ? (
              <p
                style={{
                  fontSize: 14,
                  color: '#1C2832',
                  textAlign: 'center',
                  padding: '16px 0',
                  fontWeight: 600,
                }}
              >
                Aitäh! Sinu tagasiside on saadetud.
              </p>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label
                    htmlFor="fb-type"
                    style={{ fontSize: 13, fontWeight: 600, color: '#1C2832', display: 'block', marginBottom: 4 }}
                  >
                    Tüüp
                  </label>
                  <select
                    id="fb-type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1.5px solid #DAD0A1',
                      background: '#fff',
                      fontSize: 14,
                      color: '#1C2832',
                    }}
                  >
                    {FEEDBACK_TYPES.map((ft) => (
                      <option key={ft.value} value={ft.value}>
                        {ft.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="fb-message"
                    style={{ fontSize: 13, fontWeight: 600, color: '#1C2832', display: 'block', marginBottom: 4 }}
                  >
                    Kirjelda...
                  </label>
                  <textarea
                    id="fb-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Kirjelda probleemi, ideed või küsimust..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1.5px solid #DAD0A1',
                      background: '#fff',
                      fontSize: 14,
                      color: '#1C2832',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="fb-email"
                    style={{ fontSize: 13, fontWeight: 600, color: '#1C2832', display: 'block', marginBottom: 4 }}
                  >
                    E-post vastuse jaoks{' '}
                    <span style={{ fontWeight: 400, opacity: 0.6 }}>(vabatahtlik)</span>
                  </label>
                  <input
                    id="fb-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sinu@email.ee"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1.5px solid #DAD0A1',
                      background: '#fff',
                      fontSize: 14,
                      color: '#1C2832',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {error && (
                  <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: '#1C2832',
                    color: '#F8F3DA',
                    fontSize: 14,
                    fontWeight: 700,
                    padding: '10px 0',
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Saadan...' : 'Saada tagasiside'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
