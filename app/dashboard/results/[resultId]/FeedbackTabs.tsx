'use client';

import { useState } from 'react';
import { FeedbackData } from '@/lib/types';

type View = 'short' | 'long' | 'tasks';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderLeft: '4px solid #1C2832', paddingLeft: 12, marginBottom: 10 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1C2832', margin: 0 }}>{children}</h3>
    </div>
  );
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      background: '#F8F3DA',
      borderLeft: accent ? `3px solid ${accent}` : '3px solid transparent',
      borderBottom: '1px solid #DAD0A1',
      padding: '12px 14px',
      marginBottom: 10,
      borderRadius: 2,
    }}>
      {children}
    </div>
  );
}

export default function FeedbackTabs({ feedback }: { feedback: FeedbackData }) {
  const [view, setView] = useState<View>('short');

  const tabs: { key: View; label: string }[] = [
    { key: 'short', label: 'Lühike' },
    { key: 'long', label: 'Põhjalik' },
    { key: 'tasks', label: 'Ülesannete kaupa' },
  ];

  return (
    <div style={{
      background: '#fff',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      borderRadius: 8,
      padding: '20px 22px',
      marginBottom: 22,
    }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '2px solid #DAD0A1', marginBottom: 18 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            style={{
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: view === tab.key ? '#1C2832' : '#F8F3DA',
              color: view === tab.key ? '#fff' : '#1C2832',
              borderRadius: view === tab.key ? '4px 4px 0 0' : 0,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'short' && (
        <div>
          {feedback.mis_laks_hasti?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SectionHeading>Mis läks hästi</SectionHeading>
              {feedback.mis_laks_hasti.slice(0, 2).map((item, i) => (
                <Card key={i} accent="#22c55e">
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#1C2832', marginBottom: 4 }}>{item.title}</p>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{item.text}</p>
                </Card>
              ))}
            </div>
          )}
          {feedback.mida_parandada?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SectionHeading>Mida parandada</SectionHeading>
              {feedback.mida_parandada.slice(0, 2).map((item, i) => (
                <Card key={i} accent="#f97316">
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#1C2832', marginBottom: 4 }}>{item.title}</p>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{item.text}</p>
                </Card>
              ))}
            </div>
          )}
          {feedback.uldine_muster && (
            <div style={{ marginBottom: 16 }}>
              <SectionHeading>Üldine muster</SectionHeading>
              <Card>
                <p style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.7 }}>{feedback.uldine_muster}</p>
              </Card>
            </div>
          )}
          {feedback.soovitused?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SectionHeading>Soovitused</SectionHeading>
              {feedback.soovitused.slice(0, 2).map((item, i) => (
                <Card key={i}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#0072CE' }}>→ {item.title}</p>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{item.text}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'long' && (
        <div>
          {feedback.mis_laks_hasti?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SectionHeading>Mis läks hästi</SectionHeading>
              {feedback.mis_laks_hasti.map((item, i) => (
                <Card key={i} accent="#22c55e">
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#1C2832', marginBottom: 4 }}>{item.title}</p>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{item.text}</p>
                </Card>
              ))}
            </div>
          )}
          {feedback.mida_parandada?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SectionHeading>Mida parandada</SectionHeading>
              {feedback.mida_parandada.map((item, i) => (
                <Card key={i} accent="#f97316">
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#1C2832', marginBottom: 4 }}>{i + 1}. {item.title}</p>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{item.text}</p>
                </Card>
              ))}
            </div>
          )}
          {feedback.uldine_muster && (
            <div style={{ marginBottom: 16 }}>
              <SectionHeading>Üldine muster</SectionHeading>
              <Card>
                <p style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.7 }}>{feedback.uldine_muster}</p>
              </Card>
            </div>
          )}
          {feedback.soovitused?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SectionHeading>Soovitused edaspidiseks</SectionHeading>
              {feedback.soovitused.map((item, i) => (
                <Card key={i}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#0072CE' }}>→ {item.title}</p>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{item.text}</p>
                </Card>
              ))}
            </div>
          )}
          {feedback.pilk_ettepoole && (
            <div style={{ marginBottom: 16 }}>
              <SectionHeading>Pilk ettepoole</SectionHeading>
              <Card accent="#8b5cf6">
                <p style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.7 }}>{feedback.pilk_ettepoole}</p>
              </Card>
            </div>
          )}
        </div>
      )}

      {view === 'tasks' && (
        <div>
          {!feedback.tasks || feedback.tasks.length === 0 ? (
            <div style={{ background: '#F8F3DA', padding: 20, fontSize: 14, color: '#1C2832', borderRadius: 4 }}>
              Ülesannete kaupa vaade pole saadaval.
            </div>
          ) : (
            feedback.tasks.map((task, i) => {
              const isCorrect = task.is_correct === true;
              const isWrong = task.is_correct === false;
              const badgeBg = isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#f97316';
              const badgeLabel = isCorrect ? 'Õige' : isWrong ? 'Vale' : 'Osaline';
              return (
                <div key={i} style={{ marginBottom: 14, borderBottom: '2px solid #DAD0A1' }}>
                  <div style={{
                    background: '#1C2832',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: '4px 4px 0 0',
                  }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Ülesanne {task.number}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {task.points_earned != null && task.points_possible != null && (
                        <span style={{ color: '#DAD0A1', fontSize: 12 }}>
                          {task.points_earned}/{task.points_possible} p
                        </span>
                      )}
                      <span style={{ background: badgeBg, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 3 }}>
                        {badgeLabel}
                      </span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px', background: '#F8F3DA' }}>
                    <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, fontStyle: 'italic' }}>
                      {task.question_summary}
                    </p>
                    <p style={{ fontSize: 13, color: '#1C2832', marginBottom: 8 }}>
                      <strong>Õpilase vastus:</strong> {task.student_answer}
                    </p>
                    {task.what_went_right && (
                      <div style={{ background: '#f0fdf4', borderLeft: '3px solid #22c55e', padding: '6px 10px', marginBottom: 6 }}>
                        <p style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
                          <strong>✓</strong> {task.what_went_right}
                        </p>
                      </div>
                    )}
                    {task.what_went_wrong && (
                      <div style={{ background: '#fff7ed', borderLeft: '3px solid #f97316', padding: '6px 10px', marginBottom: 6 }}>
                        <p style={{ fontSize: 13, color: '#9a3412', lineHeight: 1.6 }}>
                          <strong>⚡</strong> {task.what_went_wrong}
                        </p>
                      </div>
                    )}
                    {task.advice && (
                      <div style={{ background: '#eff6ff', borderLeft: '3px solid #0072CE', padding: '6px 10px' }}>
                        <p style={{ fontSize: 13, color: '#1e3a8a', lineHeight: 1.6 }}>
                          <strong>Soovitus:</strong> {task.advice}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
