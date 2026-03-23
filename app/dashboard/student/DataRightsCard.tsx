'use client';

import { useState } from 'react';

export default function DataRightsCard() {
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (confirmText.trim().toLowerCase() !== 'kustutan') {
      setError('Kirjuta "kustutan" kinnituseks.');
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Viga kustutamisel.');
        setDeleting(false);
        return;
      }
      // Session cookie cleared server-side — redirect to homepage
      window.location.href = '/?deleted=1';
    } catch {
      setError('Serveriviga. Proovi uuesti.');
      setDeleting(false);
    }
  };

  const card: React.CSSProperties = {
    background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    borderRadius: 8,
    padding: '20px 22px',
  };

  return (
    <div style={card}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
        Minu andmed
      </h2>
      <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.65, marginBottom: 16, lineHeight: 1.6 }}>
        GDPR art 15 ja 17 alusel on sul õigus oma andmeid alla laadida ning konto kustutada.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: showConfirm ? 20 : 0 }}>
        {/* Export */}
        <a
          href="/api/account/export"
          download
          style={{
            display: 'inline-block',
            fontSize: 13,
            fontWeight: 600,
            color: '#1C2832',
            background: '#F8F3DA',
            border: '1.5px solid #DAD0A1',
            padding: '8px 16px',
            borderRadius: 5,
            textDecoration: 'none',
          }}
        >
          Laadi andmed alla (JSON)
        </a>

        {/* Delete — triggers confirmation */}
        {!showConfirm && (
          <button
            onClick={() => setShowConfirm(true)}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#991B1B',
              background: '#FEE2E2',
              border: '1.5px solid #FCA5A5',
              padding: '8px 16px',
              borderRadius: 5,
              cursor: 'pointer',
            }}
          >
            Kustuta konto
          </button>
        )}
      </div>

      {showConfirm && (
        <div style={{
          background: '#FEF2F2',
          border: '1.5px solid #FCA5A5',
          borderRadius: 6,
          padding: '16px 18px',
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#991B1B', marginBottom: 8 }}>
            Konto kustutamine on pöördumatu
          </p>
          <p style={{ fontSize: 13, color: '#7F1D1D', marginBottom: 12, lineHeight: 1.6 }}>
            Kustutatakse kõik sinu isikuandmed: fotod, tagasiside tekstid, nõusolekud ja konto. Audit-logi kirjed
            anonümiseeritakse (vajalik GDPR tõendamiseks). Kirjuta kinnituseks <strong>kustutan</strong>:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="kustutan"
            style={{
              fontSize: 14,
              padding: '8px 12px',
              border: '1.5px solid #FCA5A5',
              borderRadius: 4,
              width: '100%',
              maxWidth: 220,
              marginBottom: 10,
              outline: 'none',
              background: '#fff',
            }}
          />
          {error && (
            <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 8 }}>{error}</p>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                background: deleting ? '#9ca3af' : '#dc2626',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 5,
                cursor: deleting ? 'not-allowed' : 'pointer',
              }}
            >
              {deleting ? 'Kustutan…' : 'Kustuta konto jäädavalt'}
            </button>
            <button
              onClick={() => { setShowConfirm(false); setConfirmText(''); setError(null); }}
              disabled={deleting}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#1C2832',
                background: '#F3F4F6',
                border: '1.5px solid #D1D5DB',
                padding: '8px 16px',
                borderRadius: 5,
                cursor: 'pointer',
              }}
            >
              Tühista
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
