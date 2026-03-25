'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ResultStatus } from '@/lib/generated/prisma/client';
import { FeedbackData, FeedbackItem } from '@/lib/types';
import { PROTOTYPE_MODE } from '@/lib/prototype-mode';
import posthog from 'posthog-js';

type Tab = 'ai' | 'edits' | 'notes';

interface Props {
  testId: string;
  resultId: string;
  status: ResultStatus;
  rawFeedback: FeedbackData | null;
  editedFeedback: FeedbackData | null;
  teacherNotes: string;
  teacherComment: string;
  hasTrainingConsent: boolean;
  isApprovedOrBeyond: boolean;
  nextResultId: string | null;
  prefetchResultId: string | null;
  queuePosition: number | null;
  queueTotal: number;
  studentName: string;
  testTitle: string;
  subjectName: string;
  grade: string;
}

// ─── Read-only AI feedback renderer ───────────────────────────────────────────

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
      background: '#fff',
      borderBottom: '2px solid #DAD0A1',
      borderLeft: accent ? `3px solid ${accent}` : undefined,
      padding: '12px 14px',
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

type View = 'feedback' | 'tasks';

function ReadOnlyFeedback({ feedback }: { feedback: FeedbackData }) {
  const [view, setView] = useState<View>('feedback');

  const tabs: { key: View; label: string; desc: string }[] = [
    { key: 'feedback', label: 'Tagasiside', desc: 'Kokkuvõte ja soovitused' },
    { key: 'tasks', label: 'Ülesannete kaupa', desc: 'Iga ülesanne eraldi' },
  ];

  // Count tasks with issues for the summary view
  const totalTasks = feedback.tasks?.length ?? 0;
  const correctTasks = feedback.tasks?.filter(t => t.is_correct === true).length ?? 0;
  const wrongTasks = feedback.tasks?.filter(t => t.is_correct === false).length ?? 0;
  const partialTasks = totalTasks - correctTasks - wrongTasks;

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '2px solid #DAD0A1', marginBottom: 16 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            style={{
              padding: '9px 18px', fontSize: 13, fontWeight: 700,
              border: 'none', cursor: 'pointer',
              background: view === tab.key ? '#1C2832' : '#F8F3DA',
              color: view === tab.key ? '#fff' : '#1C2832',
              borderBottom: view === tab.key ? '3px solid #0072CE' : '3px solid transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
            }}
          >
            <span>{tab.label}</span>
            <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* ── FEEDBACK VIEW: summary + full details combined ── */}
      {view === 'feedback' && (
        <div>
          {/* Overall pattern as hero summary */}
          <div style={{ background: '#1C2832', color: '#F8F3DA', padding: '16px 18px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, opacity: 0.7 }}>Kokkuvõte</p>
            <p style={{ fontSize: 15, lineHeight: 1.7, margin: 0 }}>{feedback.uldine_muster}</p>
          </div>

          {/* Quick score overview if tasks exist */}
          {totalTasks > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1, background: '#f0fdf4', borderLeft: '3px solid #22c55e', padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#166534', margin: 0 }}>{correctTasks}</p>
                <p style={{ fontSize: 11, color: '#166534', margin: 0 }}>Õige</p>
              </div>
              <div style={{ flex: 1, background: '#fff7ed', borderLeft: '3px solid #f97316', padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#9a3412', margin: 0 }}>{partialTasks}</p>
                <p style={{ fontSize: 11, color: '#9a3412', margin: 0 }}>Osaline</p>
              </div>
              <div style={{ flex: 1, background: '#fef2f2', borderLeft: '3px solid #ef4444', padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#b91c1c', margin: 0 }}>{wrongTasks}</p>
                <p style={{ fontSize: 11, color: '#b91c1c', margin: 0 }}>Vale</p>
              </div>
            </div>
          )}

          {/* Learning objective if available */}
          {feedback.opieesmark && (
            <div style={{ background: '#eff6ff', borderLeft: '3px solid #0072CE', padding: '10px 14px', marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#0072CE', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Õpieesmärk</p>
              <p style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.6, margin: 0 }}>{feedback.opieesmark}</p>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <SectionHeading>Mis läks hästi</SectionHeading>
            {feedback.mis_laks_hasti.map((item, i) => (
              <Card key={i} accent="#22c55e">
                <p style={{ fontWeight: 700, fontSize: 14, color: '#1C2832', marginBottom: 4 }}>{item.title}</p>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{item.text}</p>
              </Card>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <SectionHeading>Mida parandada</SectionHeading>
            {feedback.mida_parandada.map((item, i) => (
              <Card key={i} accent="#f97316">
                <p style={{ fontWeight: 700, fontSize: 14, color: '#1C2832', marginBottom: 4 }}>{i + 1}. {item.title}</p>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{item.text}</p>
              </Card>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <SectionHeading>Soovitused edaspidiseks</SectionHeading>
            {feedback.soovitused.map((item, i) => (
              <Card key={i}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#0072CE' }}>{item.title}</p>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{item.text}</p>
              </Card>
            ))}
          </div>
          {feedback.pilk_ettepoole && (
            <div style={{ marginBottom: 16 }}>
              <SectionHeading>Pilk ettepoole</SectionHeading>
              <Card accent="#8b5cf6">
                <p style={{ fontSize: 14, color: '#1C2832', lineHeight: 1.7 }}>{feedback.pilk_ettepoole}</p>
              </Card>
            </div>
          )}
          {/* Resources appendix */}
          {feedback.resources && feedback.resources.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SectionHeading>Kasulikud materjalid</SectionHeading>
              {feedback.resources.map((r, i) => (
                <Card key={i}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 6px',
                      background: r.type === 'video' ? '#fef2f2' : r.type === 'exercise' ? '#f0fdf4' : '#eff6ff',
                      color: r.type === 'video' ? '#b91c1c' : r.type === 'exercise' ? '#166534' : '#1e3a8a',
                    }}>
                      {r.type === 'video' ? 'VIDEO' : r.type === 'exercise' ? 'HARJUTUS' : 'LUGEMINE'}
                    </span>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 700, color: '#0072CE' }}>{r.title}</a>
                  </div>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{r.description}</p>
                </Card>
              ))}
            </div>
          )}
          {/* Teacher notes */}
          {feedback.markmed_opetajale && (
            <div style={{ marginBottom: 16 }}>
              <SectionHeading>Märkmed õpetajale</SectionHeading>
              <Card accent="#6b7280">
                <p style={{ fontSize: 12, fontStyle: 'italic', color: '#6b7280', marginBottom: 4 }}>Ainult õpetajale — ei jagata õpilasega</p>
                <p style={{ fontSize: 13, color: '#1C2832', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{feedback.markmed_opetajale}</p>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── TASKS VIEW: per-task breakdown ── */}
      {view === 'tasks' && (
        <div>
          {!feedback.tasks || feedback.tasks.length === 0 ? (
            <div style={{ background: '#F8F3DA', padding: 20, fontSize: 14, color: '#1C2832' }}>
              Ülesannete kaupa vaade pole saadaval — AI ei tuvastanud üksikuid ülesandeid.
            </div>
          ) : (
            <>
              {/* Quick summary bar */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                {feedback.tasks.map((task, i) => {
                  const bg = task.is_correct === true ? '#22c55e' : task.is_correct === false ? '#ef4444' : '#f97316';
                  return (
                    <div key={i} style={{
                      width: 32, height: 32, background: bg, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                    }}>
                      {task.number}
                    </div>
                  );
                })}
              </div>
              {feedback.tasks.map((task, i) => {
                const isCorrect = task.is_correct === true;
                const isWrong = task.is_correct === false;
                const badgeBg = isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#f97316';
                const badgeLabel = isCorrect ? 'Õige' : isWrong ? 'Vale' : 'Osaline';
                return (
                  <div key={i} style={{ marginBottom: 14, borderBottom: '2px solid #DAD0A1' }}>
                    <div style={{ background: '#1C2832', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Ülesanne {task.number}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {task.points_earned != null && task.points_possible != null && (
                          <span style={{ color: '#DAD0A1', fontSize: 12 }}>{task.points_earned}/{task.points_possible} p</span>
                        )}
                        <span style={{ background: badgeBg, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>{badgeLabel}</span>
                      </div>
                    </div>
                    <div style={{ padding: '10px 14px', background: '#fff' }}>
                      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, fontStyle: 'italic' }}>{task.question_summary}</p>
                      <p style={{ fontSize: 13, color: '#1C2832', marginBottom: 8 }}><strong>Õpilase vastus:</strong> {task.student_answer}</p>
                      {task.what_went_right && (
                        <div style={{ background: '#f0fdf4', borderLeft: '3px solid #22c55e', padding: '6px 10px', marginBottom: 6 }}>
                          <p style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}><strong>✓</strong> {task.what_went_right}</p>
                        </div>
                      )}
                      {task.what_went_wrong && (
                        <div style={{ background: '#fff7ed', borderLeft: '3px solid #f97316', padding: '6px 10px', marginBottom: 6 }}>
                          <p style={{ fontSize: 13, color: '#9a3412', lineHeight: 1.6 }}>{task.what_went_wrong}</p>
                        </div>
                      )}
                      {task.advice && (
                        <div style={{ background: '#eff6ff', borderLeft: '3px solid #0072CE', padding: '6px 10px' }}>
                          <p style={{ fontSize: 13, color: '#1e3a8a', lineHeight: 1.6 }}><strong>Soovitus:</strong> {task.advice}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Editable feedback items list ─────────────────────────────────────────────

function EditableItemList({
  label,
  items,
  onChange,
  disabled,
}: {
  label: string;
  items: FeedbackItem[];
  onChange: (items: FeedbackItem[]) => void;
  disabled: boolean;
}) {
  const updateItem = (index: number, field: 'title' | 'text', value: string) => {
    const updated = items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    onChange(updated);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>{label}</p>
      {items.map((item, i) => (
        <div key={i} style={{ background: '#F8F3DA', padding: 10, marginBottom: 8 }}>
          <input
            type="text"
            value={item.title}
            onChange={(e) => updateItem(i, 'title', e.target.value)}
            disabled={disabled}
            placeholder="Pealkiri"
            style={{
              width: '100%', padding: '7px 10px', border: '1px solid #DAD0A1',
              fontSize: 13, fontWeight: 700, color: '#1C2832', background: disabled ? '#f9f9f7' : '#fff',
              marginBottom: 6, boxSizing: 'border-box', outline: 'none',
            }}
          />
          <textarea
            value={item.text}
            onChange={(e) => updateItem(i, 'text', e.target.value)}
            disabled={disabled}
            rows={3}
            placeholder="Selgitus"
            style={{
              width: '100%', padding: '7px 10px', border: '1px solid #DAD0A1',
              fontSize: 13, color: '#1C2832', background: disabled ? '#f9f9f7' : '#fff',
              resize: 'vertical', boxSizing: 'border-box', outline: 'none',
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ResultReviewClient({
  testId,
  resultId,
  status: initialStatus,
  rawFeedback,
  editedFeedback,
  teacherNotes: initialTeacherNotes,
  teacherComment: initialTeacherComment,
  hasTrainingConsent: initialHasTrainingConsent,
  isApprovedOrBeyond: initialIsApprovedOrBeyond,
  nextResultId,
  prefetchResultId,
  queuePosition,
  queueTotal,
  studentName,
  testTitle,
  subjectName,
  grade,
}: Props) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(initialStatus === 'UPLOADED');

  // Track feedback_reviewed on mount
  useEffect(() => {
    posthog.capture('feedback_reviewed', { resultId, testId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-trigger analysis if this result is still UPLOADED when we land here
  useEffect(() => {
    if (initialStatus !== 'UPLOADED') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/tests/${testId}/bulk-analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resultId }),
        });
        if (!cancelled && res.ok) {
          router.refresh(); // reload page to show fresh DRAFT feedback
        }
      } catch {
        // ignore — user can retry manually
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Background-prefetch analysis for the student two ahead in the queue
  useEffect(() => {
    if (!prefetchResultId) return;
    // Fire-and-forget — we don't need the result
    fetch(`/api/tests/${testId}/bulk-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultId: prefetchResultId }),
    }).catch(() => {/* silent — not critical */});
  }, [testId, prefetchResultId]);
  const [activeTab, setActiveTab] = useState<Tab>('ai');
  const [status, setStatus] = useState<ResultStatus>(initialStatus);
  const [isApprovedOrBeyond, setIsApprovedOrBeyond] = useState(initialIsApprovedOrBeyond);
  const [hasTrainingConsent, setHasTrainingConsent] = useState(initialHasTrainingConsent);

  // Editable feedback state — start from editedFeedback if available, else rawFeedback
  const baseFeedback = editedFeedback ?? rawFeedback;
  const [editedWentWell, setEditedWentWell] = useState<FeedbackItem[]>(
    baseFeedback?.mis_laks_hasti ?? []
  );
  const [editedImprove, setEditedImprove] = useState<FeedbackItem[]>(
    baseFeedback?.mida_parandada ?? []
  );
  const [editedPattern, setEditedPattern] = useState(baseFeedback?.uldine_muster ?? '');
  const [editedSuggestions, setEditedSuggestions] = useState<FeedbackItem[]>(
    baseFeedback?.soovitused ?? []
  );
  const [editedOutlook, setEditedOutlook] = useState(baseFeedback?.pilk_ettepoole ?? '');

  // Private notes
  const [teacherNotes, setTeacherNotes] = useState(initialTeacherNotes);
  const [teacherComment, setTeacherComment] = useState(initialTeacherComment);

  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildEditedFeedback = useCallback((): FeedbackData | null => {
    if (!baseFeedback) return null;
    return {
      ...baseFeedback,
      mis_laks_hasti: editedWentWell,
      mida_parandada: editedImprove,
      uldine_muster: editedPattern,
      soovitused: editedSuggestions,
      pilk_ettepoole: editedOutlook,
    };
  }, [baseFeedback, editedWentWell, editedImprove, editedPattern, editedSuggestions, editedOutlook]);

  const autoSave = useCallback(
    (payload: Record<string, unknown>) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        setSaving(true);
        try {
          await fetch(`/api/tests/${testId}/results/${resultId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [testId, resultId]
  );

  const handleFeedbackBlur = useCallback(() => {
    const ef = buildEditedFeedback();
    if (!ef) return;
    autoSave({ editedFeedback: JSON.stringify(ef) });
  }, [buildEditedFeedback, autoSave]);

  const handleNotesBlur = useCallback(() => {
    autoSave({ teacherNotes, teacherComment });
  }, [autoSave, teacherNotes, teacherComment]);

  const handleApprove = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tests/${testId}/results/${resultId}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Viga');
      setStatus('APPROVED');
      setIsApprovedOrBeyond(true);
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Viga');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tests/${testId}/results/${resultId}/share`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Viga');
      setStatus('SHARED');
      if (nextResultId) {
        router.push(`/dashboard/tests/${testId}/results/${nextResultId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Viga');
    } finally {
      setActionLoading(false);
    }
  };

  // Prototype mode: approve + share in one click, then auto-advance
  const handleApproveAndShare = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      // Step 1: approve
      const approveRes = await fetch(`/api/tests/${testId}/results/${resultId}/approve`, {
        method: 'POST',
      });
      const approveData = await approveRes.json();
      if (!approveRes.ok) throw new Error(approveData.error || 'Kinnitamine ebaõnnestus');

      // Step 2: share
      const shareRes = await fetch(`/api/tests/${testId}/results/${resultId}/share`, {
        method: 'POST',
      });
      const shareData = await shareRes.json();
      if (!shareRes.ok) throw new Error(shareData.error || 'Jagamine ebaõnnestus');

      setStatus('SHARED');
      setIsApprovedOrBeyond(true);
      posthog.capture('feedback_approved_and_shared', { resultId, testId });

      // Auto-advance to next unreviewed student
      if (nextResultId) {
        router.push(`/dashboard/tests/${testId}/results/${nextResultId}`);
      } else {
        // All done — go back to test page
        router.push(`/dashboard/tests/${testId}`);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Viga');
    } finally {
      setActionLoading(false);
    }
  };

  // Download DOCX with teacher corrections merged
  const handleDownloadDocx = async () => {
    const finalFeedback = buildEditedFeedback() ?? rawFeedback;
    if (!finalFeedback) return;
    try {
      const res = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalFeedback),
      });
      if (!res.ok) throw new Error('Allalaadimine ebaõnnestus');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tagasiside_${studentName.replace(/\s+/g, '_')}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      posthog.capture('feedback_downloaded', { resultId, testId, format: 'docx' });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Allalaadimine ebaõnnestus');
    }
  };

  // eKool push — placeholder, logs to audit
  const [ekoolSent, setEkoolSent] = useState(false);
  const handlePushToEkool = async () => {
    try {
      posthog.capture('ekool_push_attempted', { resultId, testId, studentName });
      setEkoolSent(true);
    } catch {}
  };

  const handleTrainingConsent = async () => {
    try {
      const res = await fetch(`/api/tests/${testId}/results/${resultId}/training-consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentType: 'teacher' }),
      });
      if (res.ok) setHasTrainingConsent(true);
    } catch {}
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'ai', label: 'AI tagasiside' },
    { key: 'edits', label: 'Minu muudatused' },
    { key: 'notes', label: 'Isiklikud märkmed' },
  ];

  return (
    <div>
      {/* Auto-save indicator */}
      {saving && (
        <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right', marginBottom: 8 }}>
          Salvestamine...
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #DAD0A1', marginBottom: 20 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 18px', fontSize: 14, fontWeight: 700,
              border: 'none', cursor: 'pointer',
              background: activeTab === tab.key ? '#1C2832' : '#F8F3DA',
              color: activeTab === tab.key ? '#fff' : '#1C2832',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: AI feedback (read-only) */}
      {activeTab === 'ai' && (
        <div>
          {rawFeedback ? (
            <ReadOnlyFeedback feedback={rawFeedback} />
          ) : analyzing ? (
            <div style={{ background: '#F8F3DA', border: '1.5px solid #DAD0A1', padding: '40px 24px', textAlign: 'center', borderRadius: 6 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
                AI analüüsib töid…
              </p>
              <p style={{ fontSize: 13, color: '#6b7280' }}>
                Tavaliselt võtab 15–30 sekundit. Leht uueneb automaatselt.
              </p>
              <div style={{ marginTop: 16, height: 4, background: '#DAD0A1', borderRadius: 2, overflow: 'hidden', maxWidth: 240, margin: '16px auto 0' }}>
                <div style={{
                  height: '100%', background: '#1C2832', borderRadius: 2,
                  animation: 'pulse-bar 1.5s ease-in-out infinite',
                  width: '40%',
                }} />
              </div>
              <style>{`@keyframes pulse-bar { 0%{margin-left:0} 50%{margin-left:60%} 100%{margin-left:0} }`}</style>
            </div>
          ) : (
            <div style={{ background: '#F8F3DA', padding: '28px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.7 }}>
                AI tagasiside pole veel saadaval. Lisa fotod ja käivita analüüs.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Editable feedback */}
      {activeTab === 'edits' && (
        <div onBlur={handleFeedbackBlur}>
          {!baseFeedback ? (
            <div style={{ background: '#F8F3DA', padding: '28px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#1C2832', opacity: 0.7 }}>
                Tagasiside pole veel saadaval muutmiseks.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ background: '#fff8e6', border: '1px solid #DAD0A1', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1C2832' }}>
                Muudatused salvestatakse automaatselt. Kinnitatud tagasiside lukustatakse.
              </div>

              <EditableItemList
                label="Mis läks hästi"
                items={editedWentWell}
                onChange={setEditedWentWell}
                disabled={isApprovedOrBeyond}
              />

              <EditableItemList
                label="Mida parandada"
                items={editedImprove}
                onChange={setEditedImprove}
                disabled={isApprovedOrBeyond}
              />

              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>Üldine muster</p>
                <textarea
                  value={editedPattern}
                  onChange={(e) => setEditedPattern(e.target.value)}
                  disabled={isApprovedOrBeyond}
                  rows={4}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1.5px solid #DAD0A1',
                    fontSize: 14, color: '#1C2832', background: isApprovedOrBeyond ? '#f9f9f7' : '#fff',
                    resize: 'vertical', boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>

              <EditableItemList
                label="Soovitused"
                items={editedSuggestions}
                onChange={setEditedSuggestions}
                disabled={isApprovedOrBeyond}
              />

              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>Pilk ettepoole</p>
                <textarea
                  value={editedOutlook}
                  onChange={(e) => setEditedOutlook(e.target.value)}
                  disabled={isApprovedOrBeyond}
                  rows={4}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1.5px solid #DAD0A1',
                    fontSize: 14, color: '#1C2832', background: isApprovedOrBeyond ? '#f9f9f7' : '#fff',
                    resize: 'vertical', boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Private notes */}
      {activeTab === 'notes' && (
        <div onBlur={handleNotesBlur}>
          <div style={{ background: '#F8F3DA', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1C2832', borderLeft: '3px solid #DAD0A1' }}>
            Isiklikud märkmed ei jagata kunagi õpilasega.
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
              Õpetaja isiklikud märkmed (ei jagata õpilasega)
            </label>
            <textarea
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              rows={8}
              placeholder="Kirjuta siia oma mõtted, tähelepanekud või meeldetuletused selle õpilase kohta..."
              style={{
                width: '100%', padding: '10px 12px', border: '1.5px solid #DAD0A1',
                fontSize: 14, color: '#1C2832', background: '#fff',
                resize: 'vertical', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1C2832', marginBottom: 8 }}>
              Lühike kommentaar treeningandmete jaoks
            </label>
            <textarea
              value={teacherComment}
              onChange={(e) => setTeacherComment(e.target.value)}
              rows={3}
              placeholder="Lühike kommentaar mudeli täiustamiseks (anonüümiseeritakse enne salvestamist)..."
              style={{
                width: '100%', padding: '10px 12px', border: '1.5px solid #DAD0A1',
                fontSize: 14, color: '#1C2832', background: '#fff',
                resize: 'vertical', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          borderTop: '2px solid #DAD0A1',
          padding: '14px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 100,
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {actionError && (
            <p style={{ fontSize: 12, color: '#b91c1c', margin: 0 }}>{actionError}</p>
          )}

          {/* Queue progress */}
          {queuePosition != null && queueTotal > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 3, background: '#DAD0A1', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#1C2832', width: `${Math.round((queuePosition / queueTotal) * 100)}%`, transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
                {queuePosition}/{queueTotal}
              </span>
            </div>
          )}

          {/* ── PROTOTYPE MODE: simplified one-click flow ── */}
          {PROTOTYPE_MODE ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {status === 'SHARED' ? (
                <>
                  <div style={{ background: '#bbf7d0', color: '#15803d', fontWeight: 700, fontSize: 14, padding: '10px 18px' }}>
                    Jagatud ✓
                  </div>
                  <button
                    onClick={handleDownloadDocx}
                    disabled={!rawFeedback}
                    style={{
                      background: '#F8F3DA', color: '#1C2832', fontWeight: 600, fontSize: 13,
                      padding: '10px 14px', border: '1.5px solid #DAD0A1', cursor: 'pointer',
                    }}
                  >
                    Lae alla DOCX
                  </button>
                  <button
                    onClick={handlePushToEkool}
                    disabled={ekoolSent}
                    style={{
                      background: ekoolSent ? '#e5e7eb' : '#F8F3DA', color: ekoolSent ? '#6b7280' : '#1C2832',
                      fontWeight: 600, fontSize: 13,
                      padding: '10px 14px', border: '1.5px solid #DAD0A1', cursor: ekoolSent ? 'default' : 'pointer',
                    }}
                  >
                    {ekoolSent ? 'eKool — tulemas peagi' : 'Saada eKooli'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleApproveAndShare}
                  disabled={actionLoading || !rawFeedback}
                  style={{
                    flex: 1,
                    background: actionLoading || !rawFeedback ? '#6b7280' : '#1C2832',
                    color: '#F8F3DA', fontWeight: 700, fontSize: 14,
                    padding: '12px 18px', border: 'none',
                    cursor: actionLoading || !rawFeedback ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionLoading
                    ? 'Palun oota...'
                    : nextResultId
                      ? `Kinnita ja jaga → ${queuePosition != null ? `(${queuePosition}/${queueTotal})` : ''}`
                      : 'Kinnita ja jaga'
                  }
                </button>
              )}

              {/* Next student button — only shown when already shared */}
              {status === 'SHARED' && nextResultId && (
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/tests/${testId}/results/${nextResultId}`)}
                  style={{
                    background: '#1C2832', color: '#F8F3DA', fontWeight: 700, fontSize: 14,
                    padding: '10px 18px', border: 'none', cursor: 'pointer',
                  }}
                >
                  Järgmine →
                </button>
              )}
              {status === 'SHARED' && !nextResultId && queueTotal > 1 && (
                <a
                  href={`/dashboard/tests/${testId}`}
                  style={{
                    background: '#f0fdf4', color: '#15803d', fontWeight: 700, fontSize: 14,
                    padding: '10px 18px', textDecoration: 'none', border: '1.5px solid #86efac',
                  }}
                >
                  ✓ Kõik läbi — tagasi
                </a>
              )}
            </div>
          ) : (
            /* ── FULL MODE: original multi-step flow ── */
            <>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {status === 'SHARED' ? (
                  <div style={{ background: '#bbf7d0', color: '#15803d', fontWeight: 700, fontSize: 14, padding: '10px 18px' }}>
                    Jagatud ✓
                  </div>
                ) : status === 'APPROVED' ? (
                  <button
                    onClick={handleShare}
                    disabled={actionLoading}
                    style={{
                      background: actionLoading ? '#6b7280' : '#0f766e',
                      color: '#fff', fontWeight: 700, fontSize: 14,
                      padding: '10px 18px', border: 'none',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {actionLoading ? 'Palun oota...' : 'Jaga õpilasega'}
                  </button>
                ) : (
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading || !rawFeedback}
                    style={{
                      background: actionLoading || !rawFeedback ? '#6b7280' : '#1C2832',
                      color: '#F8F3DA', fontWeight: 700, fontSize: 14,
                      padding: '10px 18px', border: 'none',
                      cursor: actionLoading || !rawFeedback ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {actionLoading ? 'Palun oota...' : 'Kinnita tagasiside'}
                  </button>
                )}

                {!hasTrainingConsent && rawFeedback && (
                  <button
                    onClick={handleTrainingConsent}
                    style={{
                      background: '#F8F3DA', color: '#1C2832', fontWeight: 600, fontSize: 13,
                      padding: '10px 14px', border: '1.5px solid #DAD0A1', cursor: 'pointer',
                    }}
                  >
                    Luba anonüümseks treeningandmeks
                  </button>
                )}
                {hasTrainingConsent && (
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    Treeningandmete nõusolek antud ✓
                  </span>
                )}
              </div>

              {nextResultId ? (
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/tests/${testId}/results/${nextResultId}`)}
                  style={{
                    width: '100%', background: '#F8F3DA', border: '1.5px solid #DAD0A1',
                    color: '#1C2832', fontWeight: 700, fontSize: 14, padding: '11px',
                    cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  Järgmine õpilane →
                </button>
              ) : queueTotal > 1 && (
                <div style={{
                  width: '100%', background: '#F0FDF4', border: '1.5px solid #86EFAC',
                  color: '#15803d', fontWeight: 700, fontSize: 14, padding: '11px',
                  textAlign: 'center', borderRadius: 4,
                }}>
                  ✓ Kõik {queueTotal} õpilast läbi vaadatud
                  <div style={{ fontWeight: 400, fontSize: 12, color: '#166534', marginTop: 3 }}>
                    <a href={`/dashboard/tests/${testId}`} style={{ color: '#166534', textDecoration: 'underline' }}>
                      Tagasi kontrolltöö lehele →
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
