'use client';

import { useState, useRef, useCallback, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import posthog from 'posthog-js';
import { PROTOTYPE_MODE } from '@/lib/prototype-mode';

interface RosterStudent {
  id: string;
  name: string;
  hasConsent?: boolean;
}

type Confidence = 'high' | 'medium' | 'low' | 'none';

interface Assignment {
  index: number;
  imageB64: string;
  proposedName: string | null;      // raw name from AI
  confirmedName: string;            // editable by teacher
  matchedStudentId: string | null;  // roster student ID (if matched)
  confidence: Confidence;
  include: boolean;
}

type Phase = 'upload' | 'rendering' | 'identifying' | 'review' | 'confirming' | 'done';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1.5px solid #DAD0A1',
  fontSize: 13,
  color: '#1C2832',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

// ── Fuzzy matching ────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // strip diacritics
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function fuzzyMatch(
  rawName: string | null,
  roster: RosterStudent[]
): { studentId: string | null; confidence: Confidence } {
  if (!rawName || roster.length === 0) return { studentId: null, confidence: 'none' };

  const query = normalize(rawName);
  const queryParts = query.split(/\s+/);
  const queryFirst = queryParts[0] ?? '';
  const queryLastInitial = queryParts.length > 1 ? queryParts[queryParts.length - 1][0] : null;

  let bestId: string | null = null;
  let bestScore = Infinity;
  let bestConfidence: Confidence = 'none';

  for (const s of roster) {
    const norm = normalize(s.name);

    // Exact match
    if (norm === query) {
      return { studentId: s.id, confidence: 'high' };
    }

    const parts = norm.split(/\s+/);
    const first = parts[0] ?? '';
    const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] : null;

    // First name + last initial match
    if (queryFirst && first === queryFirst && queryLastInitial && lastInitial === queryLastInitial) {
      if (bestConfidence !== 'high') {
        bestId = s.id;
        bestConfidence = 'high';
        bestScore = 0;
      }
      continue;
    }

    // First name only match
    if (queryFirst && first === queryFirst && queryParts.length === 1) {
      if (bestConfidence === 'none' || bestConfidence === 'low') {
        bestId = s.id;
        bestConfidence = 'medium';
        bestScore = 0;
      }
      continue;
    }

    // Levenshtein distance
    const dist = levenshtein(query, norm);
    const maxLen = Math.max(query.length, norm.length);
    const ratio = dist / maxLen;

    if (ratio < 0.3 && dist < bestScore) {
      bestScore = dist;
      bestId = s.id;
      bestConfidence = ratio < 0.15 ? 'high' : 'medium';
    } else if (ratio < 0.5 && bestConfidence === 'none' && dist < bestScore) {
      bestScore = dist;
      bestId = s.id;
      bestConfidence = 'low';
    }
  }

  return { studentId: bestId, confidence: bestConfidence };
}

// ── PDF rendering ─────────────────────────────────────────────────────────────

async function renderPdfPages(file: File, onProgress?: (done: number, total: number) => void): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const scale = Math.min(1.0, 800 / viewport.width);
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    await page.render({ canvas, viewport: scaledViewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    pages.push(dataUrl.split(',')[1]);
    onProgress?.(i, numPages);
  }

  return pages;
}

// ── Confidence badge ──────────────────────────────────────────────────────────

const CONFIDENCE_STYLES: Record<Confidence, React.CSSProperties> = {
  high:   { background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' },
  medium: { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' },
  low:    { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' },
  none:   { background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' },
};

const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: 'Kindel', medium: 'Umbkaudne', low: 'Kahtlane', none: 'Leidmata',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function BatchImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: testId } = use(params);
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('upload');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [testTitle, setTestTitle] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState<{ done: number; total: number } | null>(null);
  const [consentStats, setConsentStats] = useState<{ total: number; withConsent: number; withoutConsent: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Load class roster and test title on mount
  useEffect(() => {
    fetch(`/api/tests/${testId}/roster-with-consent`)
      .then((r) => r.ok ? r.json() : { students: [], consentStats: null })
      .then((d: { students: RosterStudent[]; consentStats: { total: number; withConsent: number; withoutConsent: number } | null }) => {
        setRoster(d.students);
        if (d.consentStats) setConsentStats(d.consentStats);
      })
      .catch(() => {});
    fetch(`/api/tests/${testId}`)
      .then((r) => r.ok ? r.json() : {})
      .then((d: { title?: string }) => { if (d.title) setTestTitle(d.title); })
      .catch(() => {});
  }, [testId]);

  // Re-run fuzzy matching when roster loads after assignments are already set
  // (fixes race condition: PDF processed before roster fetch completes)
  useEffect(() => {
    if (roster.length === 0 || assignments.length === 0) return;
    // Only re-match if assignments still have 'none' confidence (unmatched)
    const hasUnmatched = assignments.some(a => a.confidence === 'none' && a.proposedName);
    if (!hasUnmatched) return;

    setAssignments(prev => prev.map(a => {
      if (a.confidence !== 'none' || !a.proposedName) return a;
      const { studentId, confidence } = fuzzyMatch(a.proposedName, roster);
      const matchedStudent = roster.find(s => s.id === studentId);
      return {
        ...a,
        matchedStudentId: studentId,
        confirmedName: matchedStudent?.name ?? a.proposedName ?? '',
        confidence,
      };
    }));
  }, [roster]);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Palun vali PDF-fail');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('Fail on liiga suur (max 100 MB)');
      return;
    }

    setError(null);
    setPhase('rendering');
    setRenderProgress(null);

    try {
      const pages = await renderPdfPages(file, (done, total) => {
        setRenderProgress({ done, total });
      });

      if (pages.length === 0) throw new Error('PDF-ist ei saanud ühtegi lehte');

      setPhase('identifying');

      const BATCH = 20;
      const nameMap = new Map<number, string | null>();

      for (let start = 0; start < pages.length; start += BATCH) {
        const slice = pages.slice(start, start + BATCH);
        const res = await fetch(`/api/tests/${testId}/batch-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'identify', pages: slice }),
        });

        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || 'Tuvastamine ebaõnnestus');
        }

        const result = await res.json() as {
          pages: Array<{ index: number; name: string | null }>;
        };

        for (const p of result.pages ?? []) {
          nameMap.set(start + p.index, p.name ?? null);
        }
      }

      // Apply fuzzy matching against loaded roster
      setAssignments(
        pages.map((b64, i) => {
          const aiName = nameMap.get(i) ?? null;
          const { studentId, confidence } = fuzzyMatch(aiName, roster);
          const matchedStudent = roster.find((s) => s.id === studentId);
          return {
            index: i,
            imageB64: b64,
            proposedName: aiName,
            confirmedName: matchedStudent?.name ?? aiName ?? '',
            matchedStudentId: studentId,
            confidence,
            include: true,
          };
        })
      );
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga töötlemisel');
      setPhase('upload');
    }
  }, [testId, roster]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleConfirmAll = () => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.confidence === 'high' && a.matchedStudentId
          ? { ...a, include: true }
          : a
      )
    );
  };

  const handleConfirm = async () => {
    const included = assignments.filter((a) => a.include && a.confirmedName.trim());
    if (included.length === 0) {
      setError('Ükski leht pole kaasatud');
      return;
    }

    // Group pages by student name — merge consecutive pages with the same confirmedName
    // into one student entry with multiple photos
    const grouped: Array<{
      studentName: string;
      studentId: string | null;
      photos: string[];
    }> = [];

    for (const a of included) {
      const name = a.confirmedName.trim();
      const lastGroup = grouped[grouped.length - 1];

      if (lastGroup && lastGroup.studentName === name) {
        lastGroup.photos.push(a.imageB64);
      } else {
        const existingGroup = grouped.find(g => g.studentName === name);
        if (existingGroup) {
          existingGroup.photos.push(a.imageB64);
        } else {
          grouped.push({
            studentName: name,
            studentId: a.matchedStudentId,
            photos: [a.imageB64],
          });
        }
      }
    }

    setPhase('confirming');
    setError(null);

    try {
      const res = await fetch(`/api/tests/${testId}/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          assignments: grouped,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Loomine ebaõnnestus');
      }

      setPhase('done');
      setTimeout(() => router.push(`/dashboard/tests/${testId}`), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga loomisel');
      setPhase('review');
    }
  };

  const includedCount = assignments.filter((a) => a.include && a.confirmedName.trim()).length;
  const highConfidenceCount = assignments.filter((a) => a.confidence === 'high' && a.include).length;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
        <Link href="/dashboard/tests" style={{ color: '#6b7280', textDecoration: 'underline' }}>Kontrolltööd</Link>
        <span style={{ color: '#d1d5db' }}>&gt;</span>
        <Link href={`/dashboard/tests/${testId}`} style={{ color: '#6b7280', textDecoration: 'underline' }}>{testTitle || '...'}</Link>
        <span style={{ color: '#d1d5db' }}>&gt;</span>
        <span style={{ color: '#1C2832' }}>Sisselugemine</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 12 }}>
        Tulemuste sisselugemine ja valideerimine
      </h1>

      {/* Validation pipeline steps */}
      <div style={{
        display: 'flex',
        gap: 0,
        marginBottom: 24,
        background: '#F8F3DA',
        border: '1.5px solid #DAD0A1',
        overflow: 'hidden',
      }}>
        {/* Step 1: Scan */}
        <div style={{
          flex: 1,
          padding: '12px 16px',
          borderRight: '1.5px solid #DAD0A1',
          background: phase === 'rendering' || phase === 'identifying' ? '#1C2832' : phase === 'review' || phase === 'confirming' || phase === 'done' ? '#dcfce7' : '#F8F3DA',
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            color: phase === 'rendering' || phase === 'identifying' ? '#F8F3DA' : phase === 'review' || phase === 'confirming' || phase === 'done' ? '#15803d' : '#6b7280',
            marginBottom: 4,
          }}>
            {(phase === 'review' || phase === 'confirming' || phase === 'done') ? '\u2713 ' : '1. '}Skaneerimine
          </div>
          <div style={{
            fontSize: 12,
            color: phase === 'rendering' || phase === 'identifying' ? '#DAD0A1' : phase === 'review' || phase === 'confirming' || phase === 'done' ? '#166534' : '#6b7280',
          }}>
            PDF &rarr; AI tuvastab nimed
          </div>
        </div>

        {/* Step 2: Name matching */}
        <div style={{
          flex: 1,
          padding: '12px 16px',
          borderRight: '1.5px solid #DAD0A1',
          background: phase === 'review' ? '#1C2832' : phase === 'confirming' || phase === 'done' ? '#dcfce7' : '#F8F3DA',
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            color: phase === 'review' ? '#F8F3DA' : phase === 'confirming' || phase === 'done' ? '#15803d' : '#6b7280',
            marginBottom: 4,
          }}>
            {(phase === 'confirming' || phase === 'done') ? '\u2713 ' : '2. '}Nimede valideerimine
          </div>
          <div style={{
            fontSize: 12,
            color: phase === 'review' ? '#DAD0A1' : phase === 'confirming' || phase === 'done' ? '#166534' : '#6b7280',
          }}>
            Sobita klassi nimekirjaga
            {roster.length > 0 && ` (${roster.length} õpilast)`}
          </div>
        </div>

        {/* Step 3: Consent check */}
        <div style={{
          flex: 1,
          padding: '12px 16px',
          background: phase === 'confirming' ? '#1C2832' : phase === 'done' ? '#dcfce7' : '#F8F3DA',
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            color: phase === 'confirming' ? '#F8F3DA' : phase === 'done' ? '#15803d' : '#6b7280',
            marginBottom: 4,
          }}>
            {phase === 'done' ? '\u2713 ' : '3. '}Nõusoleku kontroll
          </div>
          <div style={{
            fontSize: 12,
            color: phase === 'confirming' ? '#DAD0A1' : phase === 'done' ? '#166534' : '#6b7280',
          }}>
            Lapsevanema nõusolek
            {consentStats && ` (${consentStats.withConsent}/${consentStats.total} olemas)`}
          </div>
        </div>
      </div>

      {/* Notice when roster is empty */}
      {roster.length === 0 && phase === 'upload' && (
        <div style={{ background: '#fef9c3', border: '1.5px solid #fde047', borderRadius: 6, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ fontSize: 13, color: '#854d0e', fontWeight: 600, margin: '0 0 4px 0' }}>
              Klassil pole veel õpilaste nimekirja
            </p>
            <p style={{ fontSize: 12, color: '#854d0e', margin: 0 }}>
              Nimede automaatne sobitamine ei tööta ilma nimekirjata. Sa saad siiski PDF-i üles laadida ja nimesid käsitsi sisestada.{' '}
              <Link href="/dashboard/students" style={{ color: '#854d0e', fontWeight: 700, textDecoration: 'underline' }}>
                Lisa õpilased →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ── Phase: upload ── */}
      {phase === 'upload' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          style={{
            border: dragging ? '2px solid #1C2832' : '2px dashed #DAD0A1',
            background: dragging ? '#e8e4cf' : '#F8F3DA',
            borderRadius: 8,
            padding: '60px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>{dragging ? '📥' : '📄'}</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1C2832', margin: 0 }}>
            {dragging ? 'Lase lahti, et laadida' : 'Lohista PDF siia või klõpsa'}
          </p>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
            Üks PDF kõigi õpilaste töödega · max 100 MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* ── Phase: rendering ── */}
      {phase === 'rendering' && (
        <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '40px 32px', textAlign: 'center', borderRadius: 6 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🖼️</div>
          <p style={{ fontSize: 15, color: '#1C2832', fontWeight: 600, marginBottom: 8 }}>
            Lehti töödeldakse brauseris…
          </p>
          {renderProgress ? (
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              {renderProgress.done} / {renderProgress.total} lehte
            </p>
          ) : (
            <p style={{ fontSize: 13, color: '#6b7280' }}>Palun oota.</p>
          )}
        </div>
      )}

      {/* ── Phase: identifying ── */}
      {phase === 'identifying' && (
        <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '40px 32px', textAlign: 'center', borderRadius: 6 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔍</div>
          <p style={{ fontSize: 15, color: '#1C2832', fontWeight: 600, marginBottom: 8 }}>
            AI tuvastab õpilaste nimesid…
          </p>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            30 õpilase puhul ~20–40 sekundit. Palun oota.
          </p>
        </div>
      )}

      {/* ── Phase: review ── */}
      {phase === 'review' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 14, color: '#1C2832', margin: 0 }}>
              <strong>{assignments.length}</strong> lehte &middot; {includedCount} kaasatakse &middot; <strong>{(() => {
                const names = new Set(assignments.filter(a => a.include && a.confirmedName.trim()).map(a => a.confirmedName.trim()));
                return names.size;
              })()}</strong> õpilast
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {highConfidenceCount > 0 && roster.length > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmAll}
                  style={{ fontSize: 12, padding: '6px 12px', background: '#dcfce7', border: '1.5px solid #86efac', color: '#15803d', cursor: 'pointer', fontWeight: 700 }}
                >
                  ✓ Kinnita kõik kindlad ({highConfidenceCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => setAssignments((prev) => prev.map((a) => ({ ...a, include: true })))}
                style={{ fontSize: 12, padding: '6px 12px', background: '#F8F3DA', border: '1.5px solid #DAD0A1', color: '#1C2832', cursor: 'pointer' }}
              >
                Vali kõik
              </button>
              <button
                type="button"
                onClick={() => setAssignments((prev) => prev.map((a) => ({ ...a, include: false })))}
                style={{ fontSize: 12, padding: '6px 12px', background: '#F8F3DA', border: '1.5px solid #DAD0A1', color: '#1C2832', cursor: 'pointer' }}
              >
                Tühista kõik
              </button>
            </div>
          </div>

          {roster.length > 0 && (
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {(['high', 'medium', 'low', 'none'] as Confidence[]).map((c) => {
                const count = assignments.filter((a) => a.confidence === c).length;
                if (count === 0) return null;
                return (
                  <span key={c} style={{ ...CONFIDENCE_STYLES[c], padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                    {CONFIDENCE_LABELS[c]}: {count}
                  </span>
                );
              })}
            </div>
          )}

          {PROTOTYPE_MODE ? (
            /* Compact prototype view: one row per student, not per page */
            (() => {
              const studentGroups: Record<string, typeof assignments> = {};
              for (const a of assignments) {
                const name = a.confirmedName.trim() || a.proposedName || `Leht ${a.index + 1}`;
                if (!studentGroups[name]) studentGroups[name] = [];
                studentGroups[name].push(a);
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {Object.entries(studentGroups).map(([name, pages]) => {
                    const first = pages[0];
                    const allIncluded = pages.every(p => p.include);
                    const matchedStudent = first.matchedStudentId ? roster.find(s => s.id === first.matchedStudentId) : null;

                    return (
                      <div key={name} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: '#fff', border: '1.5px solid #DAD0A1', padding: '12px 16px',
                      }}>
                        <input
                          type="checkbox"
                          checked={allIncluded}
                          onChange={(e) => {
                            setAssignments(prev => prev.map(a =>
                              (a.confirmedName.trim() || a.proposedName) === name
                                ? { ...a, include: e.target.checked }
                                : a
                            ));
                          }}
                          style={{ width: 18, height: 18 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#1C2832' }}>{name}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{pages.length} lehte</div>
                        </div>
                        {first.confidence && (
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                            ...(first.confidence === 'high'
                              ? { background: '#dcfce7', color: '#15803d' }
                              : first.confidence === 'medium'
                              ? { background: '#fef9c3', color: '#854d0e' }
                              : { background: '#fee2e2', color: '#991b1b' }),
                          }}>
                            {first.confidence === 'high' ? 'Kindel' : first.confidence === 'medium' ? 'Umbkaudne' : 'Kahtlane'}
                          </span>
                        )}
                        {matchedStudent && (
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                            ...(matchedStudent.hasConsent
                              ? { background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }
                              : { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }),
                          }}>
                            {matchedStudent.hasConsent ? '\u2713 Nõusolek' : '\u26a0 Puudub'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {assignments.map((a) => (
              <div
                key={a.index}
                style={{
                  border: a.include ? '2px solid #1C2832' : '2px solid #DAD0A1',
                  borderRadius: 6,
                  overflow: 'hidden',
                  background: a.include ? '#fff' : '#F8F3DA',
                  opacity: a.include ? 1 : 0.55,
                }}
              >
                <div style={{ position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/jpeg;base64,${a.imageB64}`}
                    alt={`Leht ${a.index + 1}`}
                    style={{ width: '100%', display: 'block', aspectRatio: '3/4', objectFit: 'cover' }}
                  />
                  <span style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(28,40,50,0.75)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>
                    {a.index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAssignments((prev) => prev.map((x) => x.index === a.index ? { ...x, include: !x.include } : x))}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 24, height: 24, borderRadius: '50%',
                      background: a.include ? '#16a34a' : '#9ca3af',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, color: '#fff', fontWeight: 700,
                    }}
                  >
                    {a.include ? '✓' : '×'}
                  </button>
                  {/* Confidence badge */}
                  {roster.length > 0 && (
                    <span style={{
                      position: 'absolute', bottom: 6, left: 6,
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
                      ...CONFIDENCE_STYLES[a.confidence],
                    }}>
                      {CONFIDENCE_LABELS[a.confidence]}
                    </span>
                  )}
                  {/* Consent badge */}
                  {a.matchedStudentId && (() => {
                    const student = roster.find(s => s.id === a.matchedStudentId);
                    if (!student) return null;
                    return (
                      <span style={{
                        position: 'absolute', bottom: 6, right: 6,
                        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
                        ...(student.hasConsent
                          ? { background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }
                          : { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }),
                      }}>
                        {student.hasConsent ? '\u2713 Nõusolek' : '\u26a0 Nõusolek puudub'}
                      </span>
                    );
                  })()}
                </div>
                <div style={{ padding: '8px 10px' }}>
                  {a.proposedName && (
                    <p style={{ fontSize: 10, color: '#6b7280', margin: '0 0 4px 0' }}>
                      AI: {a.proposedName}
                    </p>
                  )}
                  {roster.length > 0 ? (
                    <select
                      value={a.matchedStudentId ?? ''}
                      onChange={(e) => {
                        const s = roster.find((r) => r.id === e.target.value);
                        setAssignments((prev) => prev.map((x) =>
                          x.index === a.index
                            ? { ...x, matchedStudentId: s?.id ?? null, confirmedName: s?.name ?? '', confidence: s ? 'high' : 'none' }
                            : x
                        ));
                      }}
                      style={{ ...inputStyle, marginBottom: 4 }}
                    >
                      <option value="">— Vali õpilane —</option>
                      {roster.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : null}
                  <input
                    type="text"
                    value={a.confirmedName}
                    onChange={(e) => setAssignments((prev) => prev.map((x) => x.index === a.index ? { ...x, confirmedName: e.target.value, matchedStudentId: null } : x))}
                    onBlur={(e) => {
                      if (e.target.value !== a.proposedName) {
                        posthog.capture('student_name_corrected', { pageIndex: a.index });
                      }
                    }}
                    placeholder="Õpilase nimi"
                    style={inputStyle}
                  />
                </div>
              </div>
            ))}
          </div>
          )}

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Confirmation summary */}
          {includedCount > 0 && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 6, padding: '14px 18px', marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#166534', margin: '0 0 6px 0' }}>
                Kokkuvõte enne kinnitamist:
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#15803d' }}>
                <span>Kindlad: <strong>{assignments.filter((a) => a.include && a.confidence === 'high').length}</strong></span>
                <span>Kahtlased: <strong>{assignments.filter((a) => a.include && (a.confidence === 'medium' || a.confidence === 'low')).length}</strong></span>
                <span>Leidmata: <strong>{assignments.filter((a) => a.include && a.confidence === 'none').length}</strong></span>
                <span>Välja jäetud: <strong>{assignments.filter((a) => !a.include).length}</strong></span>
              </div>
              {consentStats && (
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#15803d', marginTop: 8 }}>
                  <span style={{ fontWeight: 600 }}>Nõusolek:</span>
                  <span style={{ color: '#15803d' }}>Olemas: <strong>{(() => {
                    const matched = assignments.filter(a => a.include && a.matchedStudentId);
                    return matched.filter(a => roster.find(s => s.id === a.matchedStudentId)?.hasConsent).length;
                  })()}</strong></span>
                  <span style={{ color: '#92400e' }}>Puudub: <strong>{(() => {
                    const matched = assignments.filter(a => a.include && a.matchedStudentId);
                    return matched.filter(a => {
                      const student = roster.find(s => s.id === a.matchedStudentId);
                      return student && !student.hasConsent;
                    }).length;
                  })()}</strong></span>
                  <span style={{ color: '#6b7280' }}>Sobitamata: <strong>{assignments.filter(a => a.include && !a.matchedStudentId).length}</strong></span>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={includedCount === 0}
              style={{
                flex: 1,
                background: includedCount === 0 ? '#9ca3af' : '#1C2832',
                color: '#F8F3DA',
                fontWeight: 700,
                fontSize: 15,
                padding: '13px',
                border: 'none',
                cursor: includedCount === 0 ? 'not-allowed' : 'pointer',
                borderRadius: 4,
              }}
            >
              Kinnita ja loo {(() => {
                const names = new Set(assignments.filter(a => a.include && a.confirmedName.trim()).map(a => a.confirmedName.trim()));
                return names.size;
              })()} õpilase tulemused ({includedCount} lehte)
            </button>
            <button
              type="button"
              onClick={() => { setPhase('upload'); setAssignments([]); setError(null); setRenderProgress(null); }}
              style={{ padding: '13px 20px', background: '#F8F3DA', color: '#1C2832', fontWeight: 700, fontSize: 15, border: '1.5px solid #DAD0A1', cursor: 'pointer', borderRadius: 4 }}
            >
              Alusta uuesti
            </button>
          </div>
        </>
      )}

      {/* ── Phase: confirming ── */}
      {phase === 'confirming' && (
        <div style={{ background: '#fff', border: '1.5px solid #DAD0A1', padding: '40px 32px', textAlign: 'center', borderRadius: 6 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>💾</div>
          <p style={{ fontSize: 15, color: '#1C2832', fontWeight: 600 }}>Loon tulemusi andmebaasis...</p>
        </div>
      )}

      {/* ── Phase: done ── */}
      {phase === 'done' && (
        <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', padding: '40px 32px', textAlign: 'center', borderRadius: 6 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>✅</div>
          <p style={{ fontSize: 15, color: '#166534', fontWeight: 700 }}>Tulemused edukalt loodud! Suunan tagasi...</p>
        </div>
      )}

      {phase === 'upload' && error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginTop: 16 }}>
          {error}
        </div>
      )}
    </div>
  );
}
