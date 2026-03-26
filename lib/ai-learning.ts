/**
 * AI Learning Module — the system's accumulating "brain".
 *
 * Two functions:
 * 1. recordPatterns() — after QA pass 2, extract corrections and save/update
 *    patterns in the FeedbackPattern table. Called after every analysis.
 *
 * 2. getLearnedRules() — before pass 1, load the most relevant accumulated
 *    patterns and format them as additional prompt rules. Called before every analysis.
 *
 * The more tests the system grades, the smarter pass 1 becomes.
 * This accumulated knowledge is the product's core IP.
 */

import { db } from './db';
import { QALogEntry } from './qa-validator';

// ── Record patterns from QA corrections ──────────────────────────────────────

/**
 * After QA pass 2, extract meaningful corrections and store/update them
 * as FeedbackPatterns. Patterns with higher frequency get more weight
 * in pass 1's prompt.
 */
export async function recordPatterns(
  qaLog: QALogEntry[],
  topic: string | null,
  grade: string | null
): Promise<{ newPatterns: number; updatedPatterns: number }> {
  let newPatterns = 0;
  let updatedPatterns = 0;

  // Only learn from actual corrections (not "ok" findings)
  const corrections = qaLog.filter(
    (entry) => entry.correction !== null && entry.severity !== 'ok'
  );

  for (const entry of corrections) {
    // Try to find an existing pattern with similar correction
    // Match on dimension + similar pattern text
    const existing = await db.feedbackPattern.findFirst({
      where: {
        dimension: entry.dimension,
        pattern: entry.finding,
        active: true,
      },
    });

    if (existing) {
      // Increment frequency — this pattern keeps recurring
      await db.feedbackPattern.update({
        where: { id: existing.id },
        data: {
          frequency: existing.frequency + 1,
          // Update severity if new one is higher
          severity: severityRank(entry.severity) > severityRank(existing.severity)
            ? entry.severity
            : existing.severity,
          // Keep the latest correction wording (it may be refined)
          correction: entry.correction!,
          updatedAt: new Date(),
        },
      });
      updatedPatterns++;
    } else {
      // New pattern — save it
      await db.feedbackPattern.create({
        data: {
          dimension: entry.dimension,
          pattern: entry.finding,
          correction: entry.correction!,
          topic: topic || null,
          grade: grade || null,
          severity: entry.severity,
          frequency: 1,
          active: true,
          updatedAt: new Date(),
        },
      });
      newPatterns++;
    }
  }

  return { newPatterns, updatedPatterns };
}

function severityRank(s: string): number {
  switch (s) {
    case 'critical': return 3;
    case 'important': return 2;
    case 'minor': return 1;
    default: return 0;
  }
}

// ── Load learned rules for pass 1 prompt ─────────────────────────────────────

/**
 * Load the most relevant accumulated patterns and format them as
 * additional rules for the pass 1 system prompt. More frequent patterns
 * appear first.
 *
 * Returns a formatted text block to append to the system prompt,
 * or empty string if no patterns exist yet.
 */
export async function getLearnedRules(
  topic: string | null,
  grade: string | null
): Promise<string> {
  // Load patterns relevant to this topic/grade, plus general patterns
  // Filter by both topic AND grade so grade 7 patterns don't leak into grade 12 analyses
  const patterns = await db.feedbackPattern.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ topic: null }, { topic: topic || undefined }] },
        { OR: [{ grade: null }, { grade: grade || undefined }] },
      ],
    },
    orderBy: [
      { frequency: 'desc' },  // most common first
      { severity: 'asc' },    // critical before important
    ],
    take: 20, // cap at 20 rules to avoid prompt bloat
  });

  if (patterns.length === 0) return '';

  const rules = patterns.map((p: { dimension: string; topic: string | null; grade: string | null; frequency: number; pattern: string; correction: string }, i: number) => {
    const topicNote = p.topic ? ` [${p.topic}]` : '';
    const gradeNote = p.grade ? ` [${p.grade}. kl]` : '';
    const freqNote = p.frequency > 2 ? ` (seen ${p.frequency}x)` : '';
    return `${i + 1}. [${p.dimension.toUpperCase()}${topicNote}${gradeNote}]${freqNote} ${p.pattern} → ${p.correction}`;
  });

  return `\n\nLEARNED FROM PREVIOUS QA REVIEWS — avoid these known mistakes:
${rules.join('\n')}`;
}
