'use client';

import { useState } from 'react';

type Consent = {
  id: string;
  subjectName: string | null;
  scope: string;
  status: string;
  duration: string;
  startDate: string;
  endDate: string | null;
  revokedAt: string | null;
  addedBy: string;
  note: string | null;
};

type Subject = { id: string; name: string };

function statusBadge(status: string) {
  const configs: Record<string, { bg: string; color: string; label: string }> = {
    PENDING: { bg: '#fef9c3', color: '#854d0e', label: 'Ootel' },
    ACTIVE: { bg: '#dcfce7', color: '#166534', label: 'Aktiivne' },
    EXPIRED: { bg: '#f3f4f6', color: '#6b7280', label: 'Aegunud' },
    REVOKED: { bg: '#fee2e2', color: '#991b1b', label: 'Tühistatud' },
  };
  const cfg = configs[status] ?? { bg: '#f3f4f6', color: '#6b7280', label: status };
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        fontSize: 12,
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: 12,
      }}
    >
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function ConsentsSection({
  studentId,
  consents: initialConsents,
  subjects,
}: {
  studentId: string;
  consents: Consent[];
  subjects: Subject[];
}) {
  const [consents, setConsents] = useState<Consent[]>(initialConsents);
  const [showForm, setShowForm] = useState(false);
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formScope, setFormScope] = useState<'ALL_SUBJECTS' | 'SPECIFIC_SUBJECT'>('ALL_SUBJECTS');
  const [formDuration, setFormDuration] = useState<'INFINITE' | 'DATED'>('INFINITE');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formNote, setFormNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleAddConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/permissions/${studentId}/consents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: formScope === 'SPECIFIC_SUBJECT' && formSubjectId ? formSubjectId : undefined,
          scope: formScope,
          duration: formDuration,
          startDate: formStartDate || new Date().toISOString(),
          endDate: formDuration === 'DATED' && formEndDate ? formEndDate : undefined,
          note: formNote || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Viga lisamisel');

      // Reload consents
      const reloadRes = await fetch(`/api/admin/permissions/${studentId}/consents`);
      const reloadData = await reloadRes.json();
      if (reloadRes.ok) {
        setConsents(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (reloadData.consents as any[]).map((c: any) => ({
            id: c.id,
            subjectName: c.subject?.name ?? null,
            scope: c.scope,
            status: c.status,
            duration: c.duration,
            startDate: c.startDate,
            endDate: c.endDate ?? null,
            revokedAt: c.revokedAt ?? null,
            addedBy: c.parent?.user?.name ?? 'Süsteem',
            note: c.note ?? null,
          }))
        );
      }

      setShowForm(false);
      setFormSubjectId('');
      setFormScope('ALL_SUBJECTS');
      setFormDuration('INFINITE');
      setFormStartDate('');
      setFormEndDate('');
      setFormNote('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Viga');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (consentId: string) => {
    if (!confirm('Kas oled kindel, et soovid nõusoleku tühistada?')) return;
    setRevoking(consentId);
    try {
      const res = await fetch(`/api/admin/permissions/${studentId}/consents/${consentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Viga tühistamisel');
      }
      setConsents((prev) =>
        prev.map((c) =>
          c.id === consentId
            ? { ...c, status: 'REVOKED', revokedAt: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Viga tühistamisel');
    } finally {
      setRevoking(null);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1.5px solid #DAD0A1',
    fontSize: 14,
    color: '#1C2832',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    color: '#1C2832',
    marginBottom: 5,
  };

  return (
    <div>
      {consents.length === 0 ? (
        <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.5, marginBottom: 16 }}>
          Nõusolekuid pole lisatud.
        </p>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #DAD0A1' }}>
                {['Aine', 'Staatus', 'Kestus', 'Algus', 'Lõpp', 'Lisaja', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      fontWeight: 700,
                      color: '#1C2832',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {consents.map((c, i) => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: '1px solid #F0EDD6',
                    background: i % 2 === 0 ? '#fff' : '#FDFAF0',
                  }}
                >
                  <td style={{ padding: '10px 10px', color: '#1C2832' }}>
                    {c.scope === 'ALL_SUBJECTS' ? (
                      <em style={{ opacity: 0.7 }}>Kõik ained</em>
                    ) : (
                      c.subjectName ?? '—'
                    )}
                  </td>
                  <td style={{ padding: '10px 10px' }}>{statusBadge(c.status)}</td>
                  <td style={{ padding: '10px 10px', color: '#1C2832', opacity: 0.8 }}>
                    {c.duration === 'INFINITE' ? 'Tähtajatu' : 'Tähtajaline'}
                  </td>
                  <td style={{ padding: '10px 10px', color: '#1C2832', opacity: 0.7 }}>
                    {formatDate(c.startDate)}
                  </td>
                  <td style={{ padding: '10px 10px', color: '#1C2832', opacity: 0.7 }}>
                    {formatDate(c.endDate)}
                  </td>
                  <td style={{ padding: '10px 10px', color: '#1C2832', opacity: 0.7 }}>
                    {c.addedBy}
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    {c.status === 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(c.id)}
                        disabled={revoking === c.id}
                        style={{
                          background: revoking === c.id ? '#6b7280' : '#fee2e2',
                          color: revoking === c.id ? '#fff' : '#991b1b',
                          border: '1px solid #fca5a5',
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '4px 12px',
                          cursor: revoking === c.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {revoking === c.id ? '...' : 'Tühista'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{
            background: '#1C2832',
            color: '#F8F3DA',
            fontWeight: 700,
            fontSize: 14,
            padding: '9px 20px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          + Lisa nõusolek
        </button>
      ) : (
        <form
          onSubmit={handleAddConsent}
          style={{
            background: '#F8F3DA',
            border: '1.5px solid #DAD0A1',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1C2832', margin: 0 }}>
            Lisa uus nõusolek
          </h3>

          {/* Scope */}
          <div>
            <label style={labelStyle}>Ulatus</label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer', color: '#1C2832' }}>
                <input
                  type="radio"
                  name="scope"
                  value="ALL_SUBJECTS"
                  checked={formScope === 'ALL_SUBJECTS'}
                  onChange={() => { setFormScope('ALL_SUBJECTS'); setFormSubjectId(''); }}
                />
                Kõik ained
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer', color: '#1C2832' }}>
                <input
                  type="radio"
                  name="scope"
                  value="SPECIFIC_SUBJECT"
                  checked={formScope === 'SPECIFIC_SUBJECT'}
                  onChange={() => setFormScope('SPECIFIC_SUBJECT')}
                />
                Konkreetne aine
              </label>
            </div>
          </div>

          {/* Subject dropdown */}
          {formScope === 'SPECIFIC_SUBJECT' && (
            <div>
              <label style={labelStyle}>Aine</label>
              <select
                value={formSubjectId}
                onChange={(e) => setFormSubjectId(e.target.value)}
                required
                style={inputStyle}
              >
                <option value="">Vali aine...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Duration */}
          <div>
            <label style={labelStyle}>Kestus</label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer', color: '#1C2832' }}>
                <input
                  type="radio"
                  name="duration"
                  value="INFINITE"
                  checked={formDuration === 'INFINITE'}
                  onChange={() => setFormDuration('INFINITE')}
                />
                Tähtajatu
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer', color: '#1C2832' }}>
                <input
                  type="radio"
                  name="duration"
                  value="DATED"
                  checked={formDuration === 'DATED'}
                  onChange={() => setFormDuration('DATED')}
                />
                Tähtajaline
              </label>
            </div>
          </div>

          {/* Date pickers */}
          {formDuration === 'DATED' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Alguskuupäev</label>
                <input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Lõppkuupäev <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label style={labelStyle}>Märkus (vabatahtlik)</label>
            <textarea
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Lisateave..."
            />
          </div>

          {formError && (
            <div
              style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                padding: '8px 14px',
                fontSize: 13,
                color: '#b91c1c',
              }}
            >
              {formError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: submitting ? '#6b7280' : '#1C2832',
                color: '#F8F3DA',
                fontWeight: 700,
                fontSize: 14,
                padding: '9px 20px',
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Salvestab...' : 'Lisa nõusolek'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null); }}
              style={{
                background: '#fff',
                color: '#1C2832',
                fontWeight: 600,
                fontSize: 14,
                padding: '9px 20px',
                border: '1.5px solid #DAD0A1',
                cursor: 'pointer',
              }}
            >
              Tühista
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
