'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: '#F8F3DA',
        background: '#1C2832',
        border: 'none',
        padding: '9px 18px',
        borderRadius: 5,
        cursor: 'pointer',
      }}
    >
      Prindi / Salvesta PDF
    </button>
  );
}
