'use client';

import { useState } from 'react';

type ConsentGrant = {
  id: string;
  status: string;
  scope: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
  revokedAt: Date | string | null;
  subject: { name: string } | null;
};

type ChildConsents = {
  studentId: string;
  studentName: string;
  grants: ConsentGrant[];
};

export default function ConsentManagementCard({
  childrenConsents,
  studentId,
}: {
  childrenConsents: ChildConsents[];
  studentId?: string; // if scoped to a single child
}) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleRevoke = async (consentGrantId: string) => {
    if (!confirm('Kas oled kindel, et soovid AI-analüüsi nõusoleku tühistada? Tulevased analüüsid blokeeritakse, kuid juba tehtud analüüsid jäävad.')) return;

    setRevoking(consentGrantId);
    setError(null);
    try {
      const res = await fetch('/api/consent/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentGrantId }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Viga tühistamisel.');
      } else {
        setRevokedIds((prev) => new Set([...prev, consentGrantId]));
      }
    } catch {
      setError('Serveriviga. Proovi uuesti.');
    } finally {
      setRevoking(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== 'kustutan') {
      setDeleteError('Kirjuta "kustutan" kinnituseks.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setDeleteError(data.error ?? 'Viga kustutamisel.');
        setDeleting(false);
        return;
      }
      window.location.href = '/?deleted=1';
    } catch {
      setDeleteError('Serveriviga. Proovi uuesti.');
      setDeleting(false);
    }
  };

  const formatDate = (d: Date | string | null | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const card: React.CSSProperties = {
    background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    borderRadius: 8,
    padding: '20px 22px',
  };

  const activeGrants = childrenConsents.flatMap((c) =>
    c.grants
      .filter((g) => g.status === 'ACTIVE' && !revokedIds.has(g.id))
      .map((g) => ({ ...g, studentName: c.studentName, studentId: c.studentId }))
  );

  const revokedGrants = childrenConsents.flatMap((c) =>
    c.grants
      .filter((g) => g.status === 'REVOKED' || revokedIds.has(g.id))
      .map((g) => ({ ...g, studentName: c.studentName, studentId: c.studentId }))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Consent management */}
      <div style={card}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
          AI-analüüsi nõusolekud
        </h2>
        <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.65, marginBottom: 16, lineHeight: 1.6 }}>
          Saad igal ajal tühistada oma lapse kontrolltöö AI-analüüsimise nõusoleku. Tühistamine kehtib edaspidistele analüüsidele.
        </p>

        {error && (
          <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{error}</p>
        )}

        {activeGrants.length === 0 && revokedGrants.length === 0 && (
          <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.5 }}>
            Ühtegi nõusolekut ei ole antud.
          </p>
        )}

        {activeGrants.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1C2832', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              Aktiivsed nõusolekud
            </div>
            {activeGrants.map((g) => (
              <div
                key={g.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  borderRadius: 6,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2832' }}>
                    {g.studentName} — {g.subject?.name ?? 'Kõik ained'}
                  </div>
                  <div style={{ fontSize: 12, color: '#1C2832', opacity: 0.6, marginTop: 2 }}>
                    Kehtib alates {formatDate(g.startDate)}
                    {g.endDate ? ` kuni ${formatDate(g.endDate)}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(g.id)}
                  disabled={revoking === g.id}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#991B1B',
                    background: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    padding: '6px 12px',
                    borderRadius: 4,
                    cursor: revoking === g.id ? 'not-allowed' : 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {revoking === g.id ? 'Tühistan…' : 'Tühista nõusolek'}
                </button>
              </div>
            ))}
          </div>
        )}

        {revokedGrants.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1C2832', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              Tühistatud nõusolekud
            </div>
            {revokedGrants.map((g) => (
              <div
                key={g.id}
                style={{
                  padding: '10px 14px',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: 6,
                  opacity: 0.7,
                }}
              >
                <div style={{ fontSize: 14, color: '#1C2832' }}>
                  {g.studentName} — {g.subject?.name ?? 'Kõik ained'}
                </div>
                <div style={{ fontSize: 12, color: '#1C2832', opacity: 0.6, marginTop: 2 }}>
                  Tühistatud {formatDate(g.revokedAt ?? null)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data rights */}
      <div style={card}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
          Minu andmed
        </h2>
        <p style={{ fontSize: 13, color: '#1C2832', opacity: 0.65, marginBottom: 16, lineHeight: 1.6 }}>
          GDPR art 15 ja 17 alusel saad oma andmed alla laadida või konto kustutada.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: showDeleteConfirm ? 20 : 0 }}>
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

          {!showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
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

        {showDeleteConfirm && (
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
              Kustutatakse kõik sinu isikuandmed. Kirjuta kinnituseks <strong>kustutan</strong>:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
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
            {deleteError && (
              <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 8 }}>{deleteError}</p>
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
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleteError(null); }}
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
    </div>
  );
}
