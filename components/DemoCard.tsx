'use client';
import { useState } from 'react';
import { FeedbackData } from '@/lib/types';

interface Props { feedback: FeedbackData; index: number; }

export default function DemoCard({ feedback, index }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { test_info } = feedback;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      const res = await fetch('/api/generate-docx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(feedback) });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `demo_${test_info.student}_${index + 1}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Allalaadimine ebaõnnestus.'); }
    finally { setDownloading(false); }
  };

  return (
    <div style={{ background: '#fff', borderBottom: '2px solid #DAD0A1', overflow: 'hidden' }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', padding: 16, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: 700, color: '#1C2832', fontSize: 15 }}>{test_info.title}</h3>
            <p style={{ color: '#1C2832', opacity: 0.7, fontSize: 13, marginTop: 2 }}>{test_info.topic}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              <span style={{ background: '#0072CE', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>{test_info.class}</span>
              <span style={{ background: '#F8F3DA', color: '#1C2832', fontSize: 11, padding: '2px 8px' }}>{test_info.student}</span>
              {test_info.score && <span style={{ background: '#F8F3DA', color: '#1C2832', fontSize: 11, fontWeight: 700, padding: '2px 8px', border: '1px solid #DAD0A1' }}>{test_info.score}</span>}
              {test_info.course && <span style={{ background: '#1C2832', color: '#F8F3DA', fontSize: 11, padding: '2px 8px' }}>{test_info.course}</span>}
            </div>
          </div>
          <span style={{ color: '#1C2832', marginLeft: 12, opacity: 0.5 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #DAD0A1', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#F8F3DA', padding: 12, borderLeft: '3px solid #22c55e', marginTop: 12 }}>
            <h4 style={{ fontWeight: 700, color: '#1C2832', fontSize: 13, marginBottom: 8 }}>✓ Mis läks hästi</h4>
            {feedback.mis_laks_hasti.map((item, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <p style={{ fontWeight: 700, color: '#1C2832', fontSize: 13 }}>{item.title}</p>
                <p style={{ color: '#374151', fontSize: 12, marginTop: 2, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{item.text}</p>
              </div>
            ))}
          </div>
          <div style={{ background: '#F8F3DA', padding: 12, borderLeft: '3px solid #f97316' }}>
            <h4 style={{ fontWeight: 700, color: '#1C2832', fontSize: 13, marginBottom: 8 }}>⚡ Mida parandada</h4>
            {feedback.mida_parandada.map((item, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <p style={{ fontWeight: 700, color: '#1C2832', fontSize: 13 }}>{i + 1}. {item.title}</p>
                <p style={{ color: '#374151', fontSize: 12, marginTop: 2, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{item.text}</p>
              </div>
            ))}
          </div>
          <div style={{ background: '#F8F3DA', padding: 12, borderLeft: '3px solid #0072CE' }}>
            <h4 style={{ fontWeight: 700, color: '#1C2832', fontSize: 13, marginBottom: 4 }}>Üldine muster</h4>
            <p style={{ color: '#1C2832', fontSize: 12, lineHeight: 1.6 }}>{feedback.uldine_muster}</p>
          </div>
          <div style={{ background: '#F8F3DA', padding: 12, borderLeft: '3px solid #0072CE' }}>
            <h4 style={{ fontWeight: 700, color: '#1C2832', fontSize: 13, marginBottom: 8 }}>Soovitused</h4>
            {feedback.soovitused.map((item, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <p style={{ fontWeight: 700, color: '#0072CE', fontSize: 13 }}>→ {item.title}</p>
                <p style={{ color: '#374151', fontSize: 12, marginTop: 2, lineHeight: 1.6 }}>{item.text}</p>
              </div>
            ))}
          </div>
          <div style={{ background: '#F8F3DA', padding: 12, borderLeft: '3px solid #8b5cf6' }}>
            <h4 style={{ fontWeight: 700, color: '#1C2832', fontSize: 13, marginBottom: 4 }}>Pilk ettepoole</h4>
            <p style={{ color: '#1C2832', fontSize: 12, lineHeight: 1.6 }}>{feedback.pilk_ettepoole}</p>
          </div>
        </div>
      )}

      <div style={{ padding: '0 16px 16px' }}>
        <button onClick={handleDownload} disabled={downloading} style={{ width: '100%', background: '#1C2832', color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px', border: 'none', cursor: 'pointer', opacity: downloading ? 0.5 : 1 }}>
          {downloading ? 'Genereerin...' : 'Laadi alla .docx'}
        </button>
      </div>
    </div>
  );
}
