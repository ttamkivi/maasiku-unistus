'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type RequestData = {
  id: string;
  parentEmail: string;
  parentName: string | null;
  studentName: string;
  teacherName: string;
  expiresAt: string;
};

type PageState =
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'already_responded'; status: 'APPROVED' | 'DECLINED' }
  | { type: 'expired' }
  | { type: 'form'; data: RequestData }
  | { type: 'done'; approved: boolean };

export default function ConsentTokenPage() {
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<PageState>({ type: 'loading' });
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/consent/info?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          if (data.status === 'EXPIRED') {
            setState({ type: 'expired' });
          } else if (data.status === 'APPROVED' || data.status === 'DECLINED') {
            setState({ type: 'already_responded', status: data.status });
          } else {
            setState({ type: 'error', message: data.error ?? 'Viga andmete laadimisel' });
          }
          return;
        }
        setState({ type: 'form', data });
      })
      .catch(() => {
        setState({ type: 'error', message: 'Viga andmete laadimisel. Proovi uuesti.' });
      });
  }, [token]);

  async function handleRespond(status: 'APPROVED' | 'DECLINED') {
    setSubmitting(true);
    try {
      const res = await fetch('/api/consent/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          status,
          reason: status === 'DECLINED' ? reason : undefined,
        }),
      });
      if (res.ok) {
        setState({ type: 'done', approved: status === 'APPROVED' });
      } else {
        const data = await res.json();
        alert(data.error ?? 'Viga. Proovi uuesti.');
      }
    } catch {
      alert('Viga. Proovi uuesti.');
    } finally {
      setSubmitting(false);
    }
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: 560,
    margin: '40px auto',
    background: '#fff',
    borderRadius: 8,
    boxShadow: '0 2px 16px rgba(28,40,50,0.10)',
    padding: '40px 36px',
    fontFamily: "'Open Sans', Arial, sans-serif",
    color: '#1C2832',
  };

  const headerStyle: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 4,
    color: '#1C2832',
  };

  const dividerStyle: React.CSSProperties = {
    height: 3,
    background: '#DAD0A1',
    margin: '16px 0 24px',
  };

  if (state.type === 'loading') {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>Maasiku Unistus</div>
        <div style={dividerStyle} />
        <p style={{ opacity: 0.6 }}>Laadimine...</p>
      </div>
    );
  }

  if (state.type === 'error') {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>Maasiku Unistus</div>
        <div style={dividerStyle} />
        <div
          style={{
            background: '#FEE2E2',
            border: '1px solid #FCA5A5',
            borderRadius: 6,
            padding: 16,
            color: '#991B1B',
          }}
        >
          {state.message}
        </div>
      </div>
    );
  }

  if (state.type === 'expired') {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>Maasiku Unistus — Lapsevanema nõusolek</div>
        <div style={dividerStyle} />
        <div
          style={{
            background: '#F3F4F6',
            border: '1px solid #D1D5DB',
            borderRadius: 6,
            padding: 20,
            color: '#374151',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            Link on aegunud
          </div>
          <p style={{ fontSize: 14, opacity: 0.8 }}>
            See nõusolekutaotlus on aegunud. Palun võtke ühendust õpetajaga, et saada uus kutse.
          </p>
        </div>
      </div>
    );
  }

  if (state.type === 'already_responded') {
    const approved = state.status === 'APPROVED';
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>Maasiku Unistus — Lapsevanema nõusolek</div>
        <div style={dividerStyle} />
        <div
          style={{
            background: approved ? '#DCFCE7' : '#FEE2E2',
            border: `1px solid ${approved ? '#86EFAC' : '#FCA5A5'}`,
            borderRadius: 6,
            padding: 20,
            color: approved ? '#166534' : '#991B1B',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            {approved ? 'Nõusolek on juba antud' : 'Olete juba keeldunud'}
          </div>
          <p style={{ fontSize: 14, opacity: 0.9 }}>
            {approved
              ? 'Te olete sellele taotlusele juba vastanud — nõusolek on kinnitatud.'
              : 'Te olete sellest taotlusest juba keeldunud. Kui soovite muuta oma otsust, võtke ühendust õpetajaga.'}
          </p>
        </div>
      </div>
    );
  }

  if (state.type === 'done') {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>Maasiku Unistus — Lapsevanema nõusolek</div>
        <div style={dividerStyle} />
        <div
          style={{
            background: state.approved ? '#DCFCE7' : '#FEE2E2',
            border: `1px solid ${state.approved ? '#86EFAC' : '#FCA5A5'}`,
            borderRadius: 6,
            padding: 24,
            color: state.approved ? '#166534' : '#991B1B',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
            {state.approved ? 'Nõusolek antud!' : 'Keeldumine registreeritud'}
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>
            {state.approved
              ? 'Täname! Teie nõusolek on edukalt salvestatud. Õpetaja saab nüüd Teie lapsele isikupärastatud tagasisidet saata.'
              : 'Teie keeldumine on salvestatud. Kui muudate meelt, võtke ühendust õpetajaga.'}
          </p>
        </div>
      </div>
    );
  }

  // state.type === 'form'
  const { data } = state;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Maasiku Unistus — Lapsevanema nõusolek</div>
      <div style={dividerStyle} />

      <p style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
        Õpetaja <strong>{data.teacherName}</strong> soovib kasutada Maasiku Unistus platvormi,
        et anda Teie lapsele <strong>{data.studentName}</strong> isikupärastatud tagasisidet
        kontrolltöödele.
      </p>

      {/* What the system does */}
      <div
        style={{
          background: '#F8F3DA',
          border: '1.5px solid #DAD0A1',
          borderRadius: 6,
          padding: '16px 18px',
          marginBottom: 16,
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        <strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
          Kuidas süsteem töötab:
        </strong>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Tehisintellekt analüüsib Teie lapse kontrolltöid</li>
          <li>Tagasiside saadetakse otse õpetajale</li>
          <li>Andmeid säilitatakse turvaliselt Eesti serverites</li>
          <li>Andmeid ei jagata kolmandate osapooltega</li>
        </ul>
      </div>

      {/* GDPR */}
      <div
        style={{
          background: '#EFF6FF',
          border: '1.5px solid #BFDBFE',
          borderRadius: 6,
          padding: '16px 18px',
          marginBottom: 24,
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        <strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
          Teie GDPR-i õigused (isikuandmete kaitse üldmäärus):
        </strong>
        <ul style={{ margin: 0, paddingLeft: 18, marginBottom: 10 }}>
          <li>Õigus tutvuda oma lapse isikuandmetega</li>
          <li>Õigus andmete parandamisele</li>
          <li>Õigus andmete kustutamisele (&quot;õigus olla unustatud&quot;)</li>
          <li>Õigus nõusolek igal ajal tagasi võtta</li>
          <li>Õigus esitada kaebus Andmekaitse Inspektsioonile</li>
        </ul>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>
          Õiguslik alus: andmete töötlemine hariduslikul eesmärgil teie nõusolekul
          (GDPR art. 6(1)(a)). Vastutav töötleja: Maasiku Unistus OÜ.
        </p>
      </div>

      {/* Decline reason textarea */}
      {declining && (
        <div style={{ marginBottom: 16 }}>
          <label
            style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}
          >
            Põhjus (vabatahtlik)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Vabatahtlik selgitus..."
            rows={3}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: '1.5px solid #DAD0A1',
              borderRadius: 6,
              padding: '10px 12px',
              fontSize: 14,
              fontFamily: 'inherit',
              color: '#1C2832',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {!declining ? (
          <>
            <button
              onClick={() => handleRespond('APPROVED')}
              disabled={submitting}
              style={{
                flex: 1,
                background: '#16A34A',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                padding: '14px 20px',
                border: 'none',
                borderRadius: 6,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                fontFamily: 'inherit',
              }}
            >
              Nõustun
            </button>
            <button
              onClick={() => setDeclining(true)}
              disabled={submitting}
              style={{
                flex: 1,
                background: '#fff',
                color: '#991B1B',
                fontWeight: 700,
                fontSize: 15,
                padding: '14px 20px',
                border: '2px solid #FCA5A5',
                borderRadius: 6,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                fontFamily: 'inherit',
              }}
            >
              Keeldun
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleRespond('DECLINED')}
              disabled={submitting}
              style={{
                flex: 1,
                background: '#DC2626',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                padding: '14px 20px',
                border: 'none',
                borderRadius: 6,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                fontFamily: 'inherit',
              }}
            >
              {submitting ? 'Saadan...' : 'Kinnita keeldumine'}
            </button>
            <button
              onClick={() => setDeclining(false)}
              disabled={submitting}
              style={{
                background: '#F8F3DA',
                color: '#1C2832',
                fontWeight: 600,
                fontSize: 14,
                padding: '14px 20px',
                border: '1.5px solid #DAD0A1',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Tagasi
            </button>
          </>
        )}
      </div>

      <p style={{ fontSize: 11, opacity: 0.5, marginTop: 16, textAlign: 'center' }}>
        Link aegub {new Date(data.expiresAt).toLocaleDateString('et-EE')}.
        Küsimuste korral pöörduge õpetaja poole.
      </p>
    </div>
  );
}
