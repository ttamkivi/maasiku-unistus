import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
        Lehekülge ei leitud
      </h1>
      <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6, marginBottom: 28 }}>
        Otsitud lehekülge ei eksisteeri või on see eemaldatud.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          background: '#1C2832',
          color: '#F8F3DA',
          fontWeight: 700,
          fontSize: 14,
          padding: '11px 24px',
          borderRadius: 6,
          textDecoration: 'none',
        }}
      >
        ← Tagasi avalehele
      </Link>
    </div>
  );
}
