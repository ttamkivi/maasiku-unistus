'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const STEPS = ['Aine', 'Õpilased', 'Lõpetamine'] as const;

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

const secondaryBtn: React.CSSProperties = {
  background: '#F8F3DA',
  color: '#1C2832',
  fontWeight: 600,
  fontSize: 14,
  padding: '12px 24px',
  border: '1.5px solid #DAD0A1',
  cursor: 'pointer',
  width: '100%',
};

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [subjectName, setSubjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSubjectName, setCreatedSubjectName] = useState('');

  async function handleCreateSubject() {
    if (!subjectName.trim()) {
      setError('Aine nimi on kohustuslik');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: subjectName.trim() }),
      });
      const data = await res.json() as { error?: string; name?: string };
      if (!res.ok) throw new Error(data.error ?? 'Viga aine loomisel');
      setCreatedSubjectName(subjectName.trim());
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga aine loomisel');
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/account/onboarding-complete', { method: 'PATCH' });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Viga');
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga');
      setLoading(false);
    }
  }

  const card: React.CSSProperties = {
    background: '#fff',
    border: '1.5px solid #DAD0A1',
    padding: '32px 28px',
    maxWidth: 520,
    margin: '0 auto',
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingTop: 16 }}>
      {/* Progress indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, alignItems: 'center' }}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: i < STEPS.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: i < step ? '#22c55e' : i === step ? '#1C2832' : '#DAD0A1',
                color: i === step || i < step ? '#fff' : '#1C2832',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: i === step ? 700 : 500, color: i === step ? '#1C2832' : '#6b7280', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < step ? '#22c55e' : '#DAD0A1', minWidth: 20 }} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — Create subject */}
      {step === 0 && (
        <div style={card}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
            Loo oma esimene aine
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
            Lisa aine, mida õpetad. Saad hiljem rohkem aineid lisada.
          </p>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
              Aine nimi <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="nt. Füüsika, Matemaatika, Keemia..."
              style={inputStyle}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSubject(); }}
            />
          </div>
          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
              {error}
            </div>
          )}
          <button
            onClick={handleCreateSubject}
            disabled={loading}
            style={{ ...primaryBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Loon...' : 'Loo aine ja jätka →'}
          </button>
        </div>
      )}

      {/* Step 1 — Add students */}
      {step === 1 && (
        <div style={card}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
            Lisa õpilased (valikuline)
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
            Impordi õpilased CSV-failist või jätka praegu ilma. Saad õpilasi hiljem igal ajal lisada.
          </p>
          <div style={{
            background: '#F8F3DA',
            border: '1.5px solid #DAD0A1',
            padding: '16px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1C2832' }}>Impordi CSV-failist</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Laadi üles nimekiri: nimi, e-post, klass</div>
            </div>
            <Link
              href="/dashboard/students/import"
              style={{
                background: '#1C2832',
                color: '#F8F3DA',
                fontWeight: 700,
                fontSize: 13,
                padding: '9px 16px',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Impordi →
            </Link>
          </div>
          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => setStep(2)} style={secondaryBtn}>
              Jäta praegu vahele →
            </button>
            <button onClick={() => setStep(2)} style={{ ...primaryBtn }}>
              Olen õpilased lisanud, jätka →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — All set */}
      {step === 2 && (
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
              Kõik on valmis!
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              Sinu tööplatvorm on seadistatud ja kasutamiseks valmis.
            </p>
          </div>
          <div style={{
            background: '#F8F3DA',
            border: '1.5px solid #DAD0A1',
            padding: '16px 18px',
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1C2832', marginBottom: 10 }}>Kokkuvõte</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span>
                <span style={{ color: '#1C2832' }}>
                  Aine <strong>{createdSubjectName}</strong> loodud
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <span style={{ color: '#6b7280' }}>→</span>
                <span style={{ color: '#6b7280' }}>
                  Kontrolltöö saad luua töölaualt
                </span>
              </div>
            </div>
          </div>
          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
              {error}
            </div>
          )}
          <button
            onClick={handleFinish}
            disabled={loading}
            style={{ ...primaryBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Suunan...' : 'Mine töölauale →'}
          </button>
        </div>
      )}
    </div>
  );
}
