'use client';

/**
 * EU AI Act (Article 50) Transparency Marker
 *
 * Required for HIGH-RISK AI systems (Annex III, 3a — evaluates learning outcomes for minors).
 * Must be shown wherever AI-generated content is displayed to any user.
 *
 * Usage:
 *   <AITransparencyMarker />                          — default info banner
 *   <AITransparencyMarker variant="inline" />         — small inline label
 *   <AITransparencyMarker variant="badge" />          — tiny badge for tight spaces
 *   <AITransparencyMarker showLearnMore={false} />    — hide the info link
 */

interface Props {
  /** 'banner' = full width info box, 'inline' = single line, 'badge' = tiny label */
  variant?: 'banner' | 'inline' | 'badge';
  /** Show "Loe lähemalt" link to the AI transparency page */
  showLearnMore?: boolean;
  /** Optional: specify what was generated (e.g., "tagasiside", "küsimused") */
  contentType?: string;
  style?: React.CSSProperties;
}

const AI_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}>
    <path d="M12 2a4 4 0 0 1 4 4v1a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2V6a4 4 0 0 1 4-4z" />
    <path d="M10 10v.5" /><path d="M14 10v.5" />
    <path d="M12 14v8" /><path d="M8 18h8" />
  </svg>
);

export default function AITransparencyMarker({
  variant = 'banner',
  showLearnMore = true,
  contentType,
  style,
}: Props) {
  const typeLabel = contentType || 'sisu';

  if (variant === 'badge') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          fontSize: 11,
          color: '#6B7280',
          background: '#F3F4F6',
          borderRadius: 4,
          padding: '2px 6px',
          fontWeight: 500,
          ...style,
        }}
        title="See sisu on loodud tehisintellekti abil"
      >
        {AI_ICON}
        AI
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: '#6B7280',
          padding: '4px 0',
          ...style,
        }}
      >
        {AI_ICON}
        <span>See {typeLabel} on loodud tehisintellekti abil. Õpetaja vastutab lõpliku hinnangu eest.</span>
      </div>
    );
  }

  // variant === 'banner'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        fontSize: 13,
        color: '#4B5563',
        background: '#F0F7FF',
        border: '1px solid #BFDBFE',
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 12,
        ...style,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>🤖</span>
      <div>
        <span style={{ fontWeight: 600, color: '#1E3A5F' }}>
          Tehisintellekti loodud {typeLabel}
        </span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#6B7280' }}>
          See {typeLabel} on genereeritud AI abil ja võib sisaldada ebatäpsusi.
          Õpetaja vastutab lõpliku hinnangu ja tagasiside eest.
          {showLearnMore && (
            <a
              href="/privacy#ai-transparency"
              style={{ marginLeft: 6, color: '#2563EB', textDecoration: 'underline' }}
            >
              Loe lähemalt
            </a>
          )}
        </span>
      </div>
    </div>
  );
}
