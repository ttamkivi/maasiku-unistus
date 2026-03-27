'use client';
import { useState } from 'react';
import { FeedbackData } from '@/lib/types';
import AITransparencyMarker from './AITransparencyMarker';

type View = 'short' | 'long' | 'tasks';

interface Props {
  feedback: FeedbackData;
  onDownloadDocx: () => void;
  onSendEmail: (email: string, note: string) => void;
  onNextStudent: () => void;
  isDownloading: boolean;
  isSending: boolean;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderLeft: '4px solid #0072CE', paddingLeft: 14, marginBottom: 12 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1C2832' }}>{children}</h3>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', borderBottom: '2px solid #DAD0A1', padding: '16px', marginBottom: 12, ...style }}>
      {children}
    </div>
  );
}

export default function FeedbackDisplay({ feedback, onDownloadDocx, onSendEmail, onNextStudent, isDownloading, isSending }: Props) {
  const [view, setView] = useState<View>('short');
  const [showTeacherNotes, setShowTeacherNotes] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const { test_info } = feedback;

  const tabs: { key: View; label: string }[] = [
    { key: 'short', label: 'Lühike' },
    { key: 'long', label: 'Põhjalik' },
    { key: 'tasks', label: 'Ülesannete kaupa' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ background: '#F8F3DA', padding: '16px 20px', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2832' }}>{test_info.title || 'Tagasiside'}</h2>
        <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.8, marginTop: 2 }}>{test_info.topic}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ background: '#0072CE', color: '#fff', fontSize: 12, fontWeight: 700, padding: '2px 10px' }}>{test_info.class}</span>
          <span style={{ background: '#1C2832', color: '#fff', fontSize: 12, padding: '2px 10px' }}>{test_info.student}</span>
          {test_info.score && <span style={{ background: '#fff', color: '#1C2832', fontSize: 12, fontWeight: 700, padding: '2px 10px', border: '1px solid #DAD0A1' }}>{test_info.score}</span>}
        </div>
      </div>

      <AITransparencyMarker contentType="tagasiside" />

      {/* View tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #DAD0A1', marginBottom: 20 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: view === tab.key ? '#1C2832' : '#F8F3DA',
              color: view === tab.key ? '#fff' : '#1C2832',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SHORT VIEW */}
      {view === 'short' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <SectionHeading>✓ Mis läks hästi</SectionHeading>
            {feedback.mis_laks_hasti.slice(0, 2).map((item, i) => (
              <Card key={i} style={{ borderLeft: '3px solid #22c55e' }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#1C2832' }}>{item.title}</p>
                <p style={{ fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 1.6 }}>{item.text}</p>
              </Card>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            <SectionHeading>⚡ Mida parandada</SectionHeading>
            {feedback.mida_parandada.slice(0, 2).map((item, i) => (
              <Card key={i} style={{ borderLeft: '3px solid #f97316' }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#1C2832' }}>{item.title}</p>
                <p style={{ fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{item.text}</p>
              </Card>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            <SectionHeading>Üldine muster</SectionHeading>
            <Card>
              <p style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.7 }}>{feedback.uldine_muster}</p>
            </Card>
          </div>
          <div style={{ marginBottom: 20 }}>
            <SectionHeading>Soovitused</SectionHeading>
            {feedback.soovitused.slice(0, 2).map((item, i) => (
              <Card key={i}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#0072CE' }}>→ {item.title}</p>
                <p style={{ fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 1.6 }}>{item.text}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* LONG VIEW */}
      {view === 'long' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <SectionHeading>✓ Mis läks hästi</SectionHeading>
            {feedback.mis_laks_hasti.map((item, i) => (
              <Card key={i} style={{ borderLeft: '3px solid #22c55e' }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#1C2832' }}>{item.title}</p>
                <p style={{ fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{item.text}</p>
              </Card>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            <SectionHeading>⚡ Mida parandada</SectionHeading>
            {feedback.mida_parandada.map((item, i) => (
              <Card key={i} style={{ borderLeft: '3px solid #f97316' }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#1C2832' }}>{i + 1}. {item.title}</p>
                <p style={{ fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{item.text}</p>
              </Card>
            ))}
          </div>
          {feedback.drawings && feedback.drawings.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <SectionHeading>Selgitavad joonised</SectionHeading>
              {feedback.drawings.map((d, i) => (
                <Card key={i}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#1C2832', marginBottom: 8 }}>{d.title}</p>
                  <p style={{ fontSize: 13, color: '#1C2832', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{d.description}</p>
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8, fontStyle: 'italic' }}>{d.caption}</p>
                </Card>
              ))}
            </div>
          )}
          <div style={{ marginBottom: 20 }}>
            <SectionHeading>Üldine muster</SectionHeading>
            <Card><p style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.7 }}>{feedback.uldine_muster}</p></Card>
          </div>
          <div style={{ marginBottom: 20 }}>
            <SectionHeading>Soovitused edaspidiseks</SectionHeading>
            {feedback.soovitused.map((item, i) => (
              <Card key={i}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#0072CE' }}>→ {item.title}</p>
                <p style={{ fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 1.6 }}>{item.text}</p>
              </Card>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            <SectionHeading>Pilk ettepoole</SectionHeading>
            <Card style={{ borderLeft: '3px solid #8b5cf6' }}>
              <p style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.7 }}>{feedback.pilk_ettepoole}</p>
            </Card>
          </div>
          {feedback.resources && feedback.resources.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <SectionHeading>Harjutamiseks ja lugemiseks</SectionHeading>
              {feedback.resources.map((r, i) => {
                const icon = r.type === 'video' ? '▶' : r.type === 'exercise' ? '✏' : '📖';
                return (
                  <Card key={i}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ fontSize: 16 }}>{icon}</span>
                      <div>
                        <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: 14, color: '#0072CE' }}>{r.title}</a>
                        <p style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{r.description}</p>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, fontStyle: 'italic' }}>Teema: {r.topic}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          {/* Teacher notes collapsible */}
          <div style={{ background: '#F8F3DA', marginBottom: 20 }}>
            <button onClick={() => setShowTeacherNotes(!showTeacherNotes)} style={{ width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#1C2832' }}>
              <span>Märkmed õpetajale</span>
              <span>{showTeacherNotes ? '▲' : '▼'}</span>
            </button>
            {showTeacherNotes && (
              <div style={{ padding: '0 16px 16px' }}>
                <p style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.7 }}>{feedback.markmed_opetajale}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TASK-BY-TASK VIEW */}
      {view === 'tasks' && (
        <div>
          {!feedback.tasks || feedback.tasks.length === 0 ? (
            <div style={{ background: '#F8F3DA', padding: 20, color: '#1C2832', fontSize: 14 }}>
              Ülesannete kaupa vaade pole saadaval — kontrolltöö struktuur ei olnud tuvastatav.
            </div>
          ) : (
            feedback.tasks.map((task, i) => {
              const isCorrect = task.is_correct === true;
              const isWrong = task.is_correct === false;
              const badgeBg = isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#f97316';
              const badgeLabel = isCorrect ? 'Õige' : isWrong ? 'Vale' : 'Osaline';
              return (
                <div key={i} style={{ marginBottom: 16, borderBottom: '2px solid #DAD0A1' }}>
                  <div style={{ background: '#1C2832', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Ülesanne {task.number}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {task.points_earned != null && task.points_possible != null && (
                        <span style={{ color: '#DAD0A1', fontSize: 13 }}>{task.points_earned}/{task.points_possible} p</span>
                      )}
                      <span style={{ background: badgeBg, color: '#fff', fontSize: 12, fontWeight: 700, padding: '2px 10px' }}>{badgeLabel}</span>
                    </div>
                  </div>
                  <div style={{ padding: '12px 16px', background: '#fff' }}>
                    <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, fontStyle: 'italic' }}>{task.question_summary}</p>
                    <p style={{ fontSize: 13, color: '#1C2832', marginBottom: 10 }}><strong>Õpilase vastus:</strong> {task.student_answer}</p>
                    {task.what_went_right && (
                      <div style={{ background: '#f0fdf4', borderLeft: '3px solid #22c55e', padding: '8px 12px', marginBottom: 8 }}>
                        <p style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}><strong>✓</strong> {task.what_went_right}</p>
                      </div>
                    )}
                    {task.what_went_wrong && (
                      <div style={{ background: '#fff7ed', borderLeft: '3px solid #f97316', padding: '8px 12px', marginBottom: 8 }}>
                        <p style={{ fontSize: 13, color: '#9a3412', lineHeight: 1.6 }}><strong>⚡</strong> {task.what_went_wrong}</p>
                      </div>
                    )}
                    {task.advice && (
                      <div style={{ background: '#eff6ff', borderLeft: '3px solid #0072CE', padding: '8px 12px' }}>
                        <p style={{ fontSize: 13, color: '#1e3a8a', lineHeight: 1.6 }}><strong>Soovitus:</strong> {task.advice}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Action buttons — always visible below any view */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
        <button onClick={onDownloadDocx} disabled={isDownloading} style={{ background: '#1C2832', color: '#fff', fontWeight: 700, fontSize: 14, padding: '14px', border: 'none', cursor: 'pointer', opacity: isDownloading ? 0.5 : 1 }}>
          {isDownloading ? 'Genereerin...' : 'Laadi alla .docx'}
        </button>
        <button onClick={() => setShowEmailForm(!showEmailForm)} style={{ background: '#fff', color: '#1C2832', fontWeight: 700, fontSize: 14, padding: '14px', border: '2px solid #1C2832', cursor: 'pointer' }}>
          Saada e-postiga
        </button>
        {showEmailForm && (
          <div style={{ background: '#F8F3DA', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="email" placeholder="E-posti aadress" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '10px', border: '1px solid #DAD0A1', fontSize: 14, color: '#1C2832', background: '#fff' }} />
            <textarea placeholder="Lisainfo (valikuline)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} style={{ padding: '10px', border: '1px solid #DAD0A1', fontSize: 14, color: '#1C2832', background: '#fff', resize: 'none' }} />
            <button onClick={() => { if (email) { onSendEmail(email, note); setShowEmailForm(false); } }} disabled={isSending || !email} style={{ background: '#0072CE', color: '#fff', fontWeight: 700, fontSize: 14, padding: '10px', border: 'none', cursor: 'pointer', opacity: isSending || !email ? 0.5 : 1 }}>
              {isSending ? 'Saadan...' : 'Saada'}
            </button>
          </div>
        )}
        <button onClick={onNextStudent} style={{ background: '#F8F3DA', color: '#1C2832', fontWeight: 700, fontSize: 14, padding: '14px', border: '2px solid #DAD0A1', cursor: 'pointer' }}>
          Järgmine õpilane →
        </button>
      </div>
    </div>
  );
}
