'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Tab = 'smart-id' | 'mobile-id' | 'id-card';
type PollState = 'idle' | 'waiting' | 'complete' | 'error';

export default function EidLoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('mobile-id');

  // Smart-ID state
  const [sidCode, setSidCode] = useState('');
  const [sidLoading, setSidLoading] = useState(false);
  const [sidVerificationCode, setSidVerificationCode] = useState('');
  const [sidPollState, setSidPollState] = useState<PollState>('idle');
  const [sidError, setSidError] = useState('');

  // Mobile-ID state
  const [midPhone, setMidPhone] = useState('');
  const [midCode, setMidCode] = useState('');
  const [midLoading, setMidLoading] = useState(false);
  const [midChallengeCode, setMidChallengeCode] = useState('');
  const [midPollState, setMidPollState] = useState<PollState>('idle');
  const [midError, setMidError] = useState('');

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  function startPolling(endpoint: string, setError: (s: string) => void, setPollState: (s: PollState) => void) {
    stopPolling();
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(endpoint);
        const data = await res.json();

        if (data.state === 'RUNNING') {
          return; // keep polling
        }

        stopPolling();

        if (data.state === 'COMPLETE') {
          setPollState('complete');
          router.push(data.redirectTo || '/dashboard');
        } else {
          setPollState('error');
          setError(data.message || 'Autentimine ebaõnnestus');
        }
      } catch {
        stopPolling();
        setPollState('error');
        setError('Võrguühenduse viga. Proovi uuesti.');
      }
    }, 2000);
  }

  async function handleSmartIdStart(e: React.FormEvent) {
    e.preventDefault();
    setSidError('');
    setSidLoading(true);
    setSidPollState('idle');
    setSidVerificationCode('');

    try {
      const res = await fetch('/api/auth/smart-id/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalCode: sidCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSidError(data.error || 'Smart-ID autentimine ebaõnnestus');
        return;
      }

      setSidVerificationCode(data.verificationCode);
      setSidPollState('waiting');
      startPolling(
        '/api/auth/smart-id/poll',
        setSidError,
        setSidPollState
      );
    } catch {
      setSidError('Võrguühenduse viga. Proovi uuesti.');
    } finally {
      setSidLoading(false);
    }
  }

  function resetSmartId() {
    stopPolling();
    setSidPollState('idle');
    setSidVerificationCode('');
    setSidError('');
    setSidCode('');
  }

  async function handleMobileIdStart(e: React.FormEvent) {
    e.preventDefault();
    setMidError('');
    setMidLoading(true);
    setMidPollState('idle');
    setMidChallengeCode('');

    try {
      const res = await fetch('/api/auth/mobile-id/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: midPhone, personalCode: midCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMidError(data.error || 'Mobiil-ID autentimine ebaõnnestus');
        return;
      }

      setMidChallengeCode(data.challengeCode);
      setMidPollState('waiting');
      startPolling(
        '/api/auth/mobile-id/poll',
        setMidError,
        setMidPollState
      );
    } catch {
      setMidError('Võrguühenduse viga. Proovi uuesti.');
    } finally {
      setMidLoading(false);
    }
  }

  function resetMobileId() {
    stopPolling();
    setMidPollState('idle');
    setMidChallengeCode('');
    setMidError('');
    setMidPhone('');
    setMidCode('');
  }

  const tabs: { id: Tab; label: string; badge: string }[] = [
    { id: 'mobile-id', label: 'Mobiil-ID', badge: 'MID' },
    { id: 'id-card', label: 'ID-kaart', badge: 'IDK' },
  ];

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: "'Open Sans', sans-serif",
      }}
    >
      <div
        style={{
          background: '#fff',
          boxShadow: '0 2px 16px rgba(28,40,50,0.10)',
          borderRadius: 8,
          padding: '40px 36px',
          width: '100%',
          maxWidth: 440,
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#1C2832',
            marginBottom: 4,
            letterSpacing: '-0.3px',
          }}
        >
          Logi sisse eesti.ee ID-ga
        </h1>
        <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.6, marginBottom: 16 }}>
          Smart-ID, Mobiil-ID või ID-kaardiga
        </p>

        {/* Demo mode warning */}
        <div style={{
          background: '#fef9c3',
          border: '1px solid #fde047',
          borderRadius: 6,
          padding: '12px 14px',
          marginBottom: 20,
          fontSize: 12,
        }}>
          <div style={{ fontWeight: 700, color: '#854d0e', marginBottom: 6 }}>
            ⚠️ TESTKESKKOND — päris ID ei tööta veel
          </div>
          <div style={{ color: '#78350f', lineHeight: 1.5, marginBottom: 8 }}>
            Ühendus SK ID demo-serveriga. Mobiil-ID testimiseks kasuta:
          </div>
          <div style={{ background: '#fff', borderRadius: 4, padding: '6px 8px', fontFamily: 'monospace', fontSize: 12 }}>
            <span style={{ color: '#6b7280' }}>Tel: </span>
            <button
              type="button"
              onClick={() => { setMidPhone('+37200000766'); setMidCode('60001019906'); }}
              style={{ color: '#1d4ed8', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, padding: 0 }}
            >
              +37200000766
            </button>
            <span style={{ color: '#6b7280' }}>  Isikukood: </span>
            <span style={{ fontWeight: 700 }}>60001019906</span>
          </div>
          <div style={{ marginTop: 8, color: '#78350f', fontSize: 11 }}>
            Päris kasutamiseks tuleb ühenduda SK ID tootmisserveriga (nõuab RP-lepingut).
          </div>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 28,
            background: '#F8F3DA',
            borderRadius: 6,
            padding: 4,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                stopPolling();
                setActiveTab(tab.id);
              }}
              style={{
                flex: 1,
                padding: '8px 4px',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                background: activeTab === tab.id ? '#1C2832' : 'transparent',
                color: activeTab === tab.id ? '#F8F3DA' : '#1C2832',
                fontWeight: 600,
                fontSize: 13,
                fontFamily: "'Open Sans', sans-serif",
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                transition: 'background 0.15s',
              }}
            >
              <span
                style={{
                  background: activeTab === tab.id ? '#DAD0A1' : '#DAD0A1',
                  color: '#1C2832',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 3,
                  letterSpacing: '0.5px',
                }}
              >
                {tab.badge}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Smart-ID tab ── */}
        {activeTab === 'smart-id' && (
          <div>
            {sidPollState === 'idle' && (
              <form onSubmit={handleSmartIdStart}>
                <div style={{ marginBottom: 18 }}>
                  <label
                    htmlFor="sid-code"
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1C2832',
                      marginBottom: 6,
                    }}
                  >
                    Isikukood
                  </label>
                  <input
                    id="sid-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{11}"
                    maxLength={11}
                    value={sidCode}
                    onChange={(e) => setSidCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="XXXXXXXXXXX"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1.5px solid #DAD0A1',
                      borderRadius: 4,
                      fontSize: 15,
                      color: '#1C2832',
                      background: '#F8F3DA',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: "'Open Sans', sans-serif",
                      letterSpacing: '2px',
                    }}
                  />
                  <p style={{ fontSize: 12, color: '#1C2832', opacity: 0.5, marginTop: 4 }}>
                    11-kohaline Eesti isikukood
                  </p>
                </div>

                {sidError && (
                  <div
                    style={{
                      background: '#fff0f0',
                      border: '1px solid #f5c2c2',
                      color: '#c0392b',
                      borderRadius: 4,
                      padding: '10px 14px',
                      fontSize: 13,
                      marginBottom: 16,
                    }}
                  >
                    {sidError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sidLoading || sidCode.length !== 11}
                  style={{
                    width: '100%',
                    background: sidLoading || sidCode.length !== 11 ? '#6b7f8b' : '#1C2832',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 15,
                    padding: '12px',
                    border: 'none',
                    borderRadius: 4,
                    cursor: sidLoading || sidCode.length !== 11 ? 'not-allowed' : 'pointer',
                    fontFamily: "'Open Sans', sans-serif",
                  }}
                >
                  {sidLoading ? 'Ühendamine...' : 'Alusta autentimist'}
                </button>
              </form>
            )}

            {sidPollState === 'waiting' && (
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    border: '2px solid #DAD0A1',
                    borderRadius: 8,
                    padding: '20px 24px',
                    background: '#F8F3DA',
                    marginBottom: 20,
                  }}
                >
                  <p style={{ fontSize: 14, color: '#1C2832', marginBottom: 8 }}>
                    Sisesta Smart-ID rakenduses kinnituskood:
                  </p>
                  <span
                    style={{
                      fontSize: 40,
                      fontWeight: 700,
                      color: '#1C2832',
                      letterSpacing: '8px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {sidVerificationCode}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <Spinner />
                  <span style={{ fontSize: 14, color: '#1C2832', opacity: 0.7 }}>
                    Ootan kinnitust...
                  </span>
                </div>
              </div>
            )}

            {sidPollState === 'complete' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: 15, color: '#1C2832', fontWeight: 600 }}>
                  Autentimine õnnestus! Suunan edasi...
                </p>
              </div>
            )}

            {sidPollState === 'error' && (
              <div>
                <div
                  style={{
                    background: '#fff0f0',
                    border: '1px solid #f5c2c2',
                    color: '#c0392b',
                    borderRadius: 4,
                    padding: '10px 14px',
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  {sidError}
                </div>
                <button
                  onClick={resetSmartId}
                  style={{
                    width: '100%',
                    background: '#1C2832',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 15,
                    padding: '12px',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontFamily: "'Open Sans', sans-serif",
                  }}
                >
                  Proovi uuesti
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Mobile-ID tab ── */}
        {activeTab === 'mobile-id' && (
          <div>
            {midPollState === 'idle' && (
              <form onSubmit={handleMobileIdStart}>
                <div style={{ marginBottom: 18 }}>
                  <label
                    htmlFor="mid-phone"
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1C2832',
                      marginBottom: 6,
                    }}
                  >
                    Telefoninumber
                  </label>
                  <input
                    id="mid-phone"
                    type="tel"
                    value={midPhone}
                    onChange={(e) => setMidPhone(e.target.value)}
                    placeholder="+372XXXXXXXX"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1.5px solid #DAD0A1',
                      borderRadius: 4,
                      fontSize: 15,
                      color: '#1C2832',
                      background: '#F8F3DA',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: "'Open Sans', sans-serif",
                    }}
                  />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label
                    htmlFor="mid-code"
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1C2832',
                      marginBottom: 6,
                    }}
                  >
                    Isikukood
                  </label>
                  <input
                    id="mid-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{11}"
                    maxLength={11}
                    value={midCode}
                    onChange={(e) => setMidCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="XXXXXXXXXXX"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1.5px solid #DAD0A1',
                      borderRadius: 4,
                      fontSize: 15,
                      color: '#1C2832',
                      background: '#F8F3DA',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: "'Open Sans', sans-serif",
                      letterSpacing: '2px',
                    }}
                  />
                </div>

                {midError && (
                  <div
                    style={{
                      background: '#fff0f0',
                      border: '1px solid #f5c2c2',
                      color: '#c0392b',
                      borderRadius: 4,
                      padding: '10px 14px',
                      fontSize: 13,
                      marginBottom: 16,
                    }}
                  >
                    {midError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={midLoading || midCode.length !== 11 || !midPhone}
                  style={{
                    width: '100%',
                    background:
                      midLoading || midCode.length !== 11 || !midPhone
                        ? '#6b7f8b'
                        : '#1C2832',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 15,
                    padding: '12px',
                    border: 'none',
                    borderRadius: 4,
                    cursor:
                      midLoading || midCode.length !== 11 || !midPhone
                        ? 'not-allowed'
                        : 'pointer',
                    fontFamily: "'Open Sans', sans-serif",
                  }}
                >
                  {midLoading ? 'Ühendamine...' : 'Alusta autentimist'}
                </button>
              </form>
            )}

            {midPollState === 'waiting' && (
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    border: '2px solid #DAD0A1',
                    borderRadius: 8,
                    padding: '20px 24px',
                    background: '#F8F3DA',
                    marginBottom: 20,
                  }}
                >
                  <p style={{ fontSize: 14, color: '#1C2832', marginBottom: 8 }}>
                    SMS kinnituskood:
                  </p>
                  <span
                    style={{
                      fontSize: 40,
                      fontWeight: 700,
                      color: '#1C2832',
                      letterSpacing: '8px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {midChallengeCode}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <Spinner />
                  <span style={{ fontSize: 14, color: '#1C2832', opacity: 0.7 }}>
                    Ootan kinnitust...
                  </span>
                </div>
              </div>
            )}

            {midPollState === 'complete' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: 15, color: '#1C2832', fontWeight: 600 }}>
                  Autentimine õnnestus! Suunan edasi...
                </p>
              </div>
            )}

            {midPollState === 'error' && (
              <div>
                <div
                  style={{
                    background: '#fff0f0',
                    border: '1px solid #f5c2c2',
                    color: '#c0392b',
                    borderRadius: 4,
                    padding: '10px 14px',
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  {midError}
                </div>
                <button
                  onClick={resetMobileId}
                  style={{
                    width: '100%',
                    background: '#1C2832',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 15,
                    padding: '12px',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontFamily: "'Open Sans', sans-serif",
                  }}
                >
                  Proovi uuesti
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ID-kaart tab ── */}
        {activeTab === 'id-card' && (
          <div>
            <p style={{ fontSize: 14, color: '#1C2832', marginBottom: 16, lineHeight: 1.6 }}>
              ID-kaardiga sisselogimiseks on vaja ID-kaardi lugeja tarkvara ja seadistatud
              brauserit.
            </p>

            <a
              href="https://www.id.ee/id-tarkvara/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginBottom: 20,
                fontSize: 14,
                color: '#1C2832',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Laadi alla ID-kaardi tarkvara →
            </a>

            <div style={{ marginBottom: 20 }}>
              <a
                href="/api/auth/id-card"
                style={{
                  display: 'block',
                  width: '100%',
                  background: '#1C2832',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                  padding: '12px',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontFamily: "'Open Sans', sans-serif",
                  textAlign: 'center',
                  textDecoration: 'none',
                  boxSizing: 'border-box',
                }}
              >
                Logi sisse ID-kaardiga
              </a>
            </div>

            <div
              style={{
                background: '#f5f5f0',
                border: '1px solid #DAD0A1',
                borderRadius: 6,
                padding: '12px 14px',
                fontSize: 13,
                color: '#1C2832',
                opacity: 0.8,
                lineHeight: 1.6,
              }}
            >
              <strong>Märkus:</strong> ID-kaardiga autentimine nõuab serveri täiendavat
              seadistust (HTTPS + klientserdi TLS). Hetkel testikeskkonnas ei toetata.
            </div>
          </div>
        )}

        {/* Back link */}
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <Link
            href="/auth/login"
            style={{
              fontSize: 13,
              color: '#1C2832',
              opacity: 0.7,
              textDecoration: 'underline',
            }}
          >
            ← Tagasi tavapärase sisselogimise juurde
          </Link>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 18,
        height: 18,
        border: '2px solid #DAD0A1',
        borderTopColor: '#1C2832',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
