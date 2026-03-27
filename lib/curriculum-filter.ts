/**
 * Curriculum Filter — extracts only relevant sections from the full curriculum.
 *
 * Instead of sending the entire 56KB curriculum (≈14,000 tokens) with every AI call,
 * this module returns only the sections relevant to the test being analyzed.
 *
 * Typical savings: 14,000 → 2,000–4,000 tokens per call.
 * Over two calls (analysis + QA) that's ~20,000 fewer input tokens per test sheet.
 */

import { CURRICULUM } from './curriculum';

// ── Section boundaries (line-number ranges in CURRICULUM) ──────────────────
// These are identified by the ### headers in curriculum.ts.
// Each section key maps to: { start: header line content, nextStart: next header }
// We use string matching rather than line numbers so it survives minor edits.

interface CurriculumSection {
  id: string;
  grade: string;        // "8", "9", "10", "11", "12"
  topic: string;        // short topic identifier
  headerMatch: string;  // unique string that appears at the start of this section's header
}

/**
 * Registry of all sections in the curriculum.
 * Order matters — sections are extracted in the order they appear in CURRICULUM.
 */
const SECTIONS: CurriculumSection[] = [
  // ── Põhikool ──
  { id: 'intro',     grade: 'all', topic: 'intro',          headerMatch: 'Kolmanda kooliastme' },
  { id: '8-optics',  grade: '8',   topic: 'Valgusõpetus',   headerMatch: '#### Valgusõpetus' },
  { id: '8-mech',    grade: '8',   topic: 'Mehaanika',       headerMatch: '#### Mehaanika' },
  { id: '9-heat',    grade: '9',   topic: 'Soojusõpetus',   headerMatch: '#### Soojusõpetus' },
  { id: '9-elec',    grade: '9',   topic: 'Elektriõpetus',  headerMatch: '#### Elektriõpetus' },

  // ── Gümnaasium ──
  { id: 'gym-intro', grade: 'gym', topic: 'intro',          headerMatch: 'Gümnaasiumi lõpuks' },
  { id: 'F1',        grade: '10',  topic: 'Kinemaatika',    headerMatch: '### F1' },
  { id: 'F2',        grade: '10',  topic: 'Dünaamika',      headerMatch: '### F2' },
  { id: 'F3',        grade: '10',  topic: 'Jäävusseadused', headerMatch: '### F3' },
  { id: 'F4',        grade: '11',  topic: 'Termodünaamika', headerMatch: '### F4' },
  { id: 'F5',        grade: '11',  topic: 'Elektrostaatika', headerMatch: '### F5' },
  { id: 'F6',        grade: '11',  topic: 'Elektromagnetism', headerMatch: '### F6' },
  { id: 'F7',        grade: '12',  topic: 'Optika',         headerMatch: '### F7' },
  { id: 'F8',        grade: '12',  topic: 'Tuumafüüsika',  headerMatch: '### F8' },
];

/**
 * Map curriculum codes like "F9.2.1" to section IDs.
 *
 * Code format for põhikool: "F{grade}.{topicIndex}.{subtopic}"
 *   F8.1.x → Valgusõpetus
 *   F8.2.x → Mehaanika
 *   F9.1.x → Soojusõpetus
 *   F9.2.x → Elektriõpetus
 *
 * Code format for gümnaasium: "F{courseNumber}" or "F{courseNumber}.x.x"
 *   F1, F1.1.x → F1 Kinemaatika
 *   F2, F2.1.x → F2 Dünaamika
 *   etc.
 */
function codesToSectionIds(codes: string[]): Set<string> {
  const ids = new Set<string>();

  for (const code of codes) {
    const normalized = code.trim().toUpperCase();

    // Põhikool codes: F8.1.x, F9.2.x etc.
    const pohikoolMatch = normalized.match(/^F(8|9)\.(\d)/);
    if (pohikoolMatch) {
      const grade = pohikoolMatch[1]; // "8" or "9"
      const topicIndex = pohikoolMatch[2]; // "1" or "2"

      if (grade === '8' && topicIndex === '1') ids.add('8-optics');
      if (grade === '8' && topicIndex === '2') ids.add('8-mech');
      if (grade === '9' && topicIndex === '1') ids.add('9-heat');
      if (grade === '9' && topicIndex === '2') ids.add('9-elec');
      continue;
    }

    // Gümnaasium codes: F1, F2, ..., F8 (possibly with subtopics like F1.1.1)
    const gymMatch = normalized.match(/^F(\d)(?:\.|$)/);
    if (gymMatch) {
      const courseNum = gymMatch[1]; // "1" through "8"
      ids.add(`F${courseNum}`);
    }
  }

  return ids;
}

/**
 * Extract a section from the curriculum text by finding the header
 * and collecting everything until the next section of equal or higher level.
 */
function extractSection(text: string, headerMatch: string): string | null {
  const lines = text.split('\n');
  let startIdx = -1;

  // Find the line containing the header
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(headerMatch)) {
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) return null;

  // Determine the header level (count #'s)
  const headerLine = lines[startIdx];
  const headerLevel = (headerLine.match(/^#+/) || [''])[0].length;

  // Collect lines until we hit another header of equal/higher level or a --- separator
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Stop at a horizontal rule (section separator)
    if (line === '---') {
      endIdx = i;
      break;
    }

    // Stop at a header of equal or higher level (fewer or equal #'s)
    const match = line.match(/^(#{1,4})\s/);
    if (match && match[1].length <= headerLevel) {
      endIdx = i;
      break;
    }
  }

  return lines.slice(startIdx, endIdx).join('\n').trim();
}

/**
 * Returns a trimmed version of the curriculum containing only relevant sections.
 *
 * @param grade - Class level: "8", "9", "10", "11", "12"
 * @param curriculumCodes - Specific curriculum codes like ["F9.2.1", "F9.2.3"]
 * @param topic - Optional topic name for fuzzy matching (e.g. "Elektriõpetus")
 * @returns Trimmed curriculum text (typically 2,000–4,000 tokens vs 14,000 for full)
 */
export function getCurriculumForTest(
  grade: string,
  curriculumCodes?: string[],
  topic?: string | null,
): string {
  const parts: string[] = [];

  // Always include a short header
  parts.push('# Eesti füüsika ainekava (asjakohased osad)\n');

  // ── Strategy 1: Use specific curriculum codes if available ──
  if (curriculumCodes && curriculumCodes.length > 0) {
    const targetIds = codesToSectionIds(curriculumCodes);

    // Add the appropriate intro section
    const isGym = curriculumCodes.some(c => /^F\d(?:\.|$)/.test(c.trim().toUpperCase()) && !c.match(/^F[89]\./i));
    const isPohikool = curriculumCodes.some(c => /^F[89]\./i.test(c.trim()));

    if (isPohikool) {
      const intro = extractSection(CURRICULUM, 'Kolmanda kooliastme');
      if (intro) parts.push(intro + '\n\n---\n');
    }
    if (isGym) {
      const intro = extractSection(CURRICULUM, 'Gümnaasiumi lõpuks');
      if (intro) parts.push(intro + '\n\n---\n');
    }

    // Add the specific sections
    for (const section of SECTIONS) {
      if (targetIds.has(section.id)) {
        const text = extractSection(CURRICULUM, section.headerMatch);
        if (text) parts.push(text + '\n\n---\n');
      }
    }

    // If we found specific sections, return them
    if (parts.length > 1) {
      return parts.join('\n');
    }
  }

  // ── Strategy 2: Fall back to grade-based filtering ──
  const normalizedGrade = grade.replace(/[^0-9]/g, ''); // "9. klass" → "9"

  // Add the appropriate intro
  if (['8', '9'].includes(normalizedGrade)) {
    const intro = extractSection(CURRICULUM, 'Kolmanda kooliastme');
    if (intro) parts.push(intro + '\n\n---\n');
  } else if (['10', '11', '12'].includes(normalizedGrade)) {
    const intro = extractSection(CURRICULUM, 'Gümnaasiumi lõpuks');
    if (intro) parts.push(intro + '\n\n---\n');
  }

  // Add all sections for this grade
  for (const section of SECTIONS) {
    if (section.grade === normalizedGrade) {
      const text = extractSection(CURRICULUM, section.headerMatch);
      if (text) parts.push(text + '\n\n---\n');
    }
  }

  // ── Strategy 3: If topic name matches, try to narrow further ──
  if (topic && parts.length > 2) {
    // Check if the topic name matches one specific section
    const topicLower = topic.toLowerCase();
    const matchingSection = SECTIONS.find(
      s => s.grade === normalizedGrade && topicLower.includes(s.topic.toLowerCase())
    );
    if (matchingSection) {
      // Return just the intro + that one section
      const narrowParts: string[] = [parts[0], parts[1]]; // header + intro
      const text = extractSection(CURRICULUM, matchingSection.headerMatch);
      if (text) narrowParts.push(text + '\n\n---\n');
      return narrowParts.join('\n');
    }
  }

  // If we still have nothing specific, return the full curriculum as fallback
  if (parts.length <= 1) {
    return CURRICULUM;
  }

  return parts.join('\n');
}

/**
 * Estimate token count for the trimmed curriculum.
 * Rough approximation: 1 token ≈ 4 characters for Estonian text.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
