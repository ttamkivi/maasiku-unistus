# Sprint 18: 4-Agent Agentic Engine + Shared Brain

## Context

Õpetaja Tagasiside currently uses a single monolithic AI call in `lib/claude.ts` — one function (`buildSystemPrompt`) does everything: digitalization, grading, feedback generation. This sprint refactors the core engine into a proper 4-agent pipeline with a shared knowledge brain.

Read AGENTS.md first. Check `node_modules/next/dist/docs/` before writing any code.

**Before starting:** read the existing `lib/claude.ts`, `lib/curriculum.ts`, `lib/assessment-rules.ts`, and `lib/types.ts` to understand what already exists. Do NOT delete anything — refactor incrementally.

---

## Architecture Overview

```
Teacher upload
      │
      ▼
┌─────────────────────┐
│  Agent 1            │  Digitalization & Personalization
│  digitalize-agent   │  Reads scans → identifies students → segments pages
└─────────┬───────────┘
          │ {studentId, segments[], confidence}
          ▼
┌─────────────────────┐
│  Agent 2            │  Assessment (objective grading only)
│  assess-agent       │  Reads answers → compares to rubric → assigns points
└─────────┬───────────┘
          │ {tasks[], totalScore, errorTypes[]}
          ▼
┌─────────────────────┐
│  Agent 3            │  Feedback (personalized academic feedback)
│  feedback-agent     │  Uses brain + student history → generates feedback JSON
└─────────┬───────────┘
          │ {FeedbackData}
          ▼
┌─────────────────────┐
│  Agent 4            │  QA & Cross-Check
│  qa-agent           │  Validates all three agents → flags issues → corrects
└─────────┬───────────┘
          │ {approved, FeedbackData (possibly corrected)}
          ▼
      DB + UI
```

All four agents share a common **Brain** — a static knowledge base in `lib/brain/`.

---

## Task 1: Build the Shared Brain (`lib/brain/`)

Create a new directory `lib/brain/` with a comprehensive, subject-expandable knowledge base that all four agents import from.

### 1a. Create `lib/brain/index.ts`

Main entry point. Exports a `loadBrain()` function that returns the relevant brain sections for a given subject and grade:

```typescript
import { PHYSICS_CURRICULUM } from './physics';
import { MATHEMATICS_CURRICULUM } from './mathematics';
import { ASSESSMENT_SCIENCE } from './assessment';
import { ESTONIAN_GRADING_RULES } from './grading';
import { SCHOOL_SYSTEM_CONTEXT } from './school-system';
import { PEDAGOGY_PRINCIPLES } from './pedagogy';

export type Subject = 'physics' | 'mathematics' | 'biology' | 'chemistry' | 'history' | 'estonian' | 'english' | 'unknown';

export interface BrainContext {
  curriculum: string;
  assessmentScience: string;
  gradingRules: string;
  schoolContext: string;
  pedagogyPrinciples: string;
  subject: Subject;
  grade: string;
}

export function detectSubject(teema: string, klass: string): Subject {
  const lower = teema.toLowerCase();
  if (lower.includes('füüsika') || lower.includes('jõud') || lower.includes('energia') || 
      lower.includes('elekter') || lower.includes('magneti') || lower.includes('mehaanika') ||
      lower.includes('optika') || lower.includes('termodünaamika')) return 'physics';
  if (lower.includes('matemaat') || lower.includes('algebra') || lower.includes('geomeetria') ||
      lower.includes('trigonomeetria') || lower.includes('funktsioon') || lower.includes('tõenäosus')) return 'mathematics';
  if (lower.includes('bioloogia') || lower.includes('organism') || lower.includes('rakk')) return 'biology';
  if (lower.includes('keemia') || lower.includes('element') || lower.includes('reaktsioon')) return 'chemistry';
  if (lower.includes('ajalugu') || lower.includes('sõda') || lower.includes('revolutsioon')) return 'history';
  if (lower.includes('eesti keel') || lower.includes('grammatika') || lower.includes('kirjand')) return 'estonian';
  if (lower.includes('english') || lower.includes('inglise')) return 'english';
  return 'unknown';
}

export function loadBrain(teema: string, klass: string, curriculumCodes?: string[]): BrainContext {
  const subject = detectSubject(teema, klass);
  
  let curriculum = '';
  switch (subject) {
    case 'physics':
      curriculum = PHYSICS_CURRICULUM;
      break;
    case 'mathematics':
      curriculum = MATHEMATICS_CURRICULUM;
      break;
    default:
      curriculum = `No specific curriculum loaded for subject "${subject}". Apply general Estonian school assessment principles.`;
  }

  return {
    curriculum,
    assessmentScience: ASSESSMENT_SCIENCE,
    gradingRules: ESTONIAN_GRADING_RULES,
    schoolContext: SCHOOL_SYSTEM_CONTEXT,
    pedagogyPrinciples: PEDAGOGY_PRINCIPLES,
    subject,
    grade: klass,
  };
}

export { PHYSICS_CURRICULUM, MATHEMATICS_CURRICULUM, ASSESSMENT_SCIENCE, ESTONIAN_GRADING_RULES, SCHOOL_SYSTEM_CONTEXT, PEDAGOGY_PRINCIPLES };
```

### 1b. Create `lib/brain/physics.ts`

Move the existing `CURRICULUM` export from `lib/curriculum.ts` here. Rename it `PHYSICS_CURRICULUM`. Keep the existing `lib/curriculum.ts` as a re-export for backward compatibility:

```typescript
// lib/curriculum.ts (updated — just re-exports for backward compat)
export { PHYSICS_CURRICULUM as CURRICULUM } from './brain/physics';
```

The actual content stays identical — just moved to the new location.

### 1c. Create `lib/brain/mathematics.ts`

Create a comprehensive Estonian mathematics curriculum. Base it on the national curriculum (riiklik õppekava) for grades 7–12. Include:

```typescript
export const MATHEMATICS_CURRICULUM = `# Eesti matemaatika ainekava (põhikool ja gümnaasium)

Source: Riiklik õppekava (RT I, 29.08.2014, 18), Tallinna Reaalkooli matemaatika ainekava.

---

## Põhikool (7.–9. klass)

### 7. klass
**Arvud ja tehted**
- Naturaalarvud, täisarvud, ratsionaalarvud — teisendused ja tehted
- Murrud: liitmine, lahutamine, korrutamine, jagamine
- Protsentarvutus: protsendi leidmine arvust, arvu leidmine protsendi järgi
- Astme mõiste; astmete korrutamine ja jagamine (sama alusega)

**Algebra**
- Muutuja ja avaldis; avaldise väärtuse leidmine
- Lineaarvõrrand ühe tundmatuga: lahendamine ja rakendamine
- Lineaarse võrrandisüsteemi lahendamine (2 võrrandit, 2 tundmatut)

**Geomeetria**
- Lõik, sirge, kiir, nurk — mõisted ja mõõtmine
- Kolmnurk: liigid, kongruentsus (KKK, KNK, NKN), pindala
- Ringjoon ja ring: raadius, diameeter, pindala, ümbermõõt

---

### 8. klass
**Algebra**
- Ruutvõrrand: lahendamine (diskriminant, Vieta teoreemid)
- Ruutfunktsioon y = ax² + bx + c: graafik, tipp, nullkohad
- Ebavõrrandid: lineaarsed ja ruutebavõrrandid

**Geomeetria**
- Nelinurkade liigid ja omadused (rööpkülik, ristkülik, romb, trapets)
- Pütagorase teoreemi rakendused
- Ringi ja ringjoone pikkus, pindala; sektori pindala

**Statistika ja tõenäosus**
- Andmestiku kirjeldamine: aritmeetiline keskmine, mediaan, mood
- Tõenäosuse alused: soodne juhtum, klassikaline tõenäosus

---

### 9. klass
**Algebra**
- Juuravaldised: ruutjuur, kuupjuur; lihtsustamine
- Astmed ja logaritmid (sissejuhatus)
- Funktsioonid: lineaar-, ruut-, astmefunktsioon — graafik ja omadused

**Geomeetria**
- Sarnasuskolmnurgad: tunnused ja rakendused
- Trigonomeetria (teravnurga sin, cos, tan): rakendused kolmnurgas
- Ringiga seotud nurgad: kesknurk, keerumisnurk

**Tõenäosus ja statistika**
- Kombinatoorika alused: kombinatsioonid, permutatsioonid
- Sündmuste tõenäosuse arvutamine

---

## Gümnaasium (10.–12. klass)

### Kitsas matemaatika (versioon üldhariduseks)

**10. klass**
- Funktsioonide üldmõisted; paaritu/paaris funktsioon
- Eksponentfunktsioon ja logaritmfunktsioon
- Trigonomeetrilised funktsioonid (siinus, koosinus, tangens)

**11. klass**
- Trigonomeetrilised võrrandid
- Aritmeetiline ja geomeetriline jada
- Planimeetria kordamine + ringiga seotud seos

**12. klass**
- Statistika: normaljaotuse sissejuhatus
- Tõenäosus: tingimuslik tõenäosus
- Matemaatika riigieksami ettevalmistus

---

### Lai matemaatika (versiooni reaal- ja tehnilised erialad)

**10. klass**
- Reaalarvude hulk; absoluutväärtus; intervalid
- Eksponent- ja logaritmfunktsioon; võrrandid
- Trigonomeetria: teisendusvalemid, tuletis (sissejuhatus)

**11. klass**
- Diferentsiaalarvutus: tuletis, ekstreemumid, graafiku analüüs
- Integraalarvutus: määramata ja määratud integraal
- Vektorid tasandil ja ruumis

**12. klass**
- Kompleksarvud
- Kombinatoorika ja tõenäosus (süvendatud)
- Maatriksid (sissejuhatus)

---

## Hindamine matemaatikas

**Põhikooli lõpueksam (9. klass):** kombineeritult teooriaülesanded ja rakendusülesanded. Lubatud: kalkulaator, valemileht.

**Gümnaasiumi riigieksam:** kitsas (50% elanikkonnast) + lai (tehnikaerialadele). Maksimaalselt 100 punkti. Ülesanded: lühivastused (1-2p), täislahendused (3-6p).

**Hindamistüübid matemaatikas:**
- Arvutusviga (arvutusviga) — põhimõte õige, arvutus vale
- Valemiviga (valemisegadus) — vale valem valitud
- Väärarusaam (conceptual gap) — fundamentaalne mõisteviga
- Ühikuviga — tulemuse ühik puudu või vale
- Poolik lahendus — õige suund, aga lõpetamata
- Ülesande vääritimõistmine — vale ülesandepüstitus
`;
```

### 1d. Create `lib/brain/grading.ts`

```typescript
export const ESTONIAN_GRADING_RULES = `# Eesti hindamissüsteem

## Kümnepallisüsteem (10-point scale — used in grades 5–9 and gymnasium)

Percentage → Grade mapping (TRK hindamisjuhend + riiklik norm):
- 95–100% → 10 (väga hea / suurepärane)
- 90–94%  → 9  (väga hea)
- 85–89%  → 8  (hea)
- 75–84%  → 7  (hea)
- 70–74%  → 6  (rahuldav)
- 60–69%  → 5  (rahuldav)
- 50–59%  → 4  (rahuldav/kasin)
- 40–49%  → 3  (puudulik)
- 20–39%  → 2  (puudulik)
- 0–19%   → 1  (nõrk/arvestamata)

## Viiepalliline süsteem (5-point scale — also used)
- 5 = väga hea (90–100%)
- 4 = hea (75–89%)
- 3 = rahuldav (50–74%)
- 2 = puudulik (20–49%)
- 1 = nõrk (0–19%)

## Mitteeristav hindamine
Some Estonian schools use pass/fail (arvestatud/mittearvestatud) for certain subjects or portfolio work.

## Grading rules from TRK hindamisjuhend:
1. The grade reflects mastery of learning outcomes — NOT effort or behaviour
2. Written tests must include detailed feedback alongside the grade
3. A student has the right to an improved grade (järeltöö) after additional learning
4. The teacher must communicate grading criteria BEFORE the test, not after
5. Partial credit (poolpunktid) is allowed and encouraged for multi-step problems
6. Handwritten tests: if handwriting is illegible — the answer cannot be awarded points without teacher judgment

## What the AI must do:
- Detect if the test paper shows a total score, percentage, or grade written by the teacher
- If a scoring rubric was provided: use it exactly — do NOT deviate
- If no rubric: use the percentage → grade table above to suggest a grade
- Report grade ONLY in test_info.score — never repeat or emphasize the grade in the feedback text
- If grading scale is ambiguous: note it in markmed_opetajale and ask teacher to confirm
`;
```

### 1e. Create `lib/brain/school-system.ts`

```typescript
export const SCHOOL_SYSTEM_CONTEXT = `# Eesti koolisüsteem — kontekst AI agentidele

## Kooliastmed (school levels)
- Põhikool I aste: 1.–3. klass (ages 7–10)
- Põhikool II aste: 4.–6. klass (ages 10–13)
- Põhikool III aste: 7.–9. klass (ages 13–16) — PEAMINE SIHTRÜHM
- Gümnaasium: 10.–12. klass (ages 16–19)

## Kontrolltöö (test) types in Estonian schools:
- Kontrolltöö — standard class test (20–45 min)
- Iseseisev töö / tunnikontrolltöö — short in-class check (10–15 min)
- Kordamisülesanded — revision tasks
- Kodutöö — homework (less common as formal assessment)
- Arvestustöö — end-of-unit test (counting towards grade)
- Eksam — formal exam (gümnaasiumi lõpueksam, riigieksam)

## Grading authority:
- Classroom teacher grades all coursework
- National exams (riigieksamid) are externally marked
- AI is NEVER the final grader — it assists the teacher who makes the final call

## Typical class sizes: 20–35 students per class

## Language: ALL student-facing feedback must be in Estonian (eesti keel).
Teacher-facing notes can mix Estonian and English but prefer Estonian.

## Student age considerations:
- 7.–9. klass (ages 13–16): feedback should be direct, respectful, and concrete
- Gümnaasium (ages 16–19): feedback can be slightly more technical
- Never use condescending language regardless of age

## Privacy rules (GDPR + Estonian data protection):
- Student real names are NEVER sent to external AI APIs
- The AI receives only a placeholder ("Õpilane") — never a real name
- All feedback is generated with "Sa" (you) — personalized via DB after generation
- Student work images may contain personal info — treat as confidential

## Common Estonian school subjects with typical test topics:
- Füüsika: valgusõpetus, mehaanika, elekter, magnetism, termodünaamika, optika
- Matemaatika: algebra, geomeetria, trigonomeetria, funktsioonid, statistika
- Keemia: aatom, perioodilisustabel, reaktsioonid, orgaaniline keemia
- Bioloogia: rakud, evolutsioon, ökoloogia, inimkeha
- Ajalugu: Eesti ajalugu, maailma ajalugu
- Eesti keel: grammatika, kirjand, teksti analüüs
`;
```

### 1f. Create `lib/brain/pedagogy.ts`

```typescript
export const PEDAGOGY_PRINCIPLES = `# Akadeemilise tagasiside pedagoogilised põhimõtted

## Allikad / Sources:
- Hattie & Timperley (2007) "The Power of Feedback" — Review of Educational Research
- Guskey (2019) "Grades Versus Comments" — Phi Delta Kappan  
- Koenka et al (2021) "A Meta-Analysis of Grades and Comments" — Review of Educational Research
- Ryan & Deci (2020) "Intrinsic and Extrinsic Motivation" — Contemporary Educational Psychology
- Aus, Arro & Malleus-Kotšegarov (2022) "Teaduspõhine vaade hindamisele" — Tallinn University
- Harks et al (2014) "The Effects of Feedback on Achievement, Interest and Self-Evaluation"
- Knight & Cooper (2019) "Using Written Feedback to Support Learning"

## Three levels of feedback (Hattie & Timperley framework):
1. TASK level — feedback on the specific task performance ("Your answer to question 3 correctly applied Newton's 2nd law")
2. PROCESS level — feedback on strategies used ("You systematically checked units — this is excellent scientific practice")
3. SELF level — general praise or criticism ("Good job!" or "You're weak in physics") — AVOID: it does not help learning

## The three feedback questions every response must answer:
1. KUHU MA LÄHEN? (Feed Up) — What is the learning goal?
2. KUIDAS MUL LÄHEB? (Feed Back) — What is the current performance level?
3. MIDA EDASI? (Feed Forward) — What are the next steps?

## Evidence on grades vs. comments:
- When grades and comments are shown together: students focus on grade, ignore comments (Butler 1988, Guskey 2019)
- Comments-only: students read and use feedback significantly more
- Application: keep grade/score in a separate structural field, not in the narrative text

## Growth mindset language patterns (Carol Dweck research):
- Instead of: "Sa oled andekas" → Say: "Sa kasutasid head strateegiat"
- Instead of: "Sa ei suutnud" → Say: "Sa oled veel õppimas"
- Instead of: "See on vale" → Say: "See lähenemisviis näitab, et järgmine samm on..."
- Effort and strategy attribution > ability attribution

## Self-determination theory (Ryan & Deci) — motivation:
- AUTONOMY: give the student control ("Proovi ise otsustada, kumb meetod sobib")
- COMPETENCE: build perceived competence ("See ülesanne näitas, et Sa mõistad...")
- RELATEDNESS: connect to meaningful goals ("See oskus läheb vaja, kui...")
- Controlling language kills intrinsic motivation

## Misconception-driven feedback:
- Every error reveals a mental model — identify it
- Name the misconception explicitly: "See viga näitab, et Sa kujutad jõudu ette kui..." 
- Then provide the corrective model: "Tegelikult on jõud..."
- One conceptual fix is worth more than 10 drill corrections

## Formative vs summative assessment:
- Formative (jooksev) — feedback to support ongoing learning → use ALL 12 rules
- Summative (kokkuvõttev) — grade at end of unit → grade is final, but feedback still valuable
- This AI system is primarily formative — the teacher decides if it counts summatively

## What NOT to write (banned phrases in Estonian context):
- "Tubli!" / "Suurepärane!" (self-level praise — empty)
- "Sa oled nõrk füüsikas" (person labeling)
- "Enamik õpilasi saab sellega hakkama" (normative comparison)
- "Sa pead rohkem õppima" (controlling, non-actionable)
- "See on vale" (no explanation of WHY or WHAT the correct model is)
- "Üllatavalt hea" (implies low expectations)
`;
```

### 1g. Create `lib/brain/assessment.ts`

Move the existing content from `lib/assessment-rules.ts` here. Keep `lib/assessment-rules.ts` as a re-export:

```typescript
// lib/assessment-rules.ts (updated — backward compat re-export)
export { ASSESSMENT_SCIENCE as ASSESSMENT_RULES } from './brain/assessment';
```

---

## Task 2: Create the Agent Types (`lib/agents/types.ts`)

```typescript
// lib/agents/types.ts

export interface ScannedPage {
  base64Image: string;       // base64-encoded image
  pageIndex: number;         // 0-indexed page number in upload
  sourceFile: string;        // original filename
}

// ── Agent 1 output ──────────────────────────────────────────────────────────

export interface StudentSegment {
  studentIdentifier: string;    // name/initials detected by AI
  confidence: 'high' | 'medium' | 'low' | 'none';
  matchedStudentId?: string;    // matched against class roster (if available)
  matchedStudentName?: string;
  pages: ScannedPage[];         // the pages belonging to this student
  rawText?: string;             // extracted text content
  handwritingType: 'handwritten' | 'printed' | 'mixed' | 'unknown';
  formatType: 'test' | 'homework' | 'essay' | 'unknown';
}

export interface DigitalizationResult {
  segments: StudentSegment[];
  escalations: DigitalizationEscalation[];
  processingNotes: string;
}

export interface DigitalizationEscalation {
  pageIndices: number[];
  reason: 'name_not_found' | 'text_unreadable' | 'ambiguous_student' | 'multiple_students_unclear' | 'damaged_scan';
  description: string;
  requiresHumanReview: boolean;
}

// ── Agent 2 output ──────────────────────────────────────────────────────────

export interface TaskAssessment {
  number: number;
  questionSummary: string;
  studentAnswer: string;         // what the student wrote (summarized)
  correctAnswer?: string;        // from rubric/answer key, if provided
  isCorrect: boolean | null;     // null = partial
  errorType?: 'vaararusaam' | 'valemisegadus' | 'arvutusviga' | 'uhikuviga' | 'poolik_arutlus' | 'vaaritimõistmine' | null;
  pointsEarned: number | null;
  pointsPossible: number | null;
  graderNotes: string;           // internal grader observation, NOT feedback
}

export interface AssessmentResult {
  tasks: TaskAssessment[];
  totalPointsEarned: number | null;
  totalPointsPossible: number | null;
  percentage: number | null;
  suggestedGrade: string | null;   // from grading scale, or null if rubric insufficient
  errorPattern: string;             // overall pattern of errors for Agent 3
  gradingConfidence: 'high' | 'medium' | 'low';
  gradingNotes: string;             // for teacher (not student)
}

// ── Agent 3 output ──────────────────────────────────────────────────────────

// Re-uses FeedbackData from lib/types.ts — Agent 3 produces a full FeedbackData object

// ── Agent 4 output ──────────────────────────────────────────────────────────

export type AgentId = 'digitalization' | 'assessment' | 'feedback' | 'qa';

export interface QAIssue {
  agent: AgentId;
  severity: 'critical' | 'warning' | 'suggestion';
  rule?: string;              // which rule was violated (e.g., "RULE 3: PROCESS OVER PERSON")
  description: string;
  originalText?: string;      // the problematic text
  suggestedFix?: string;      // corrected text
}

export interface QAResult {
  approved: boolean;
  issues: QAIssue[];
  correctedFeedback?: Partial<import('../types').FeedbackData>;  // Agent 4 corrections applied
  qaScore: number;            // 0–100 confidence score
  summary: string;            // one-sentence QA verdict
}

// ── Orchestrator ────────────────────────────────────────────────────────────

export interface AgentPipelineInput {
  pages: ScannedPage[];
  klass: string;
  teema: string;
  rubric?: string | null;
  answerKey?: string | null;
  classRoster?: { id: string; name: string }[];
  studentHistory?: string | null;    // prior test results summary for this student
  testId: string;
  teacherId: string;
}

export interface AgentPipelineResult {
  digitalization: DigitalizationResult;
  assessment: AssessmentResult;
  feedback: import('../types').FeedbackData;
  qa: QAResult;
  finalFeedback: import('../types').FeedbackData;  // QA-corrected final version
  escalations: DigitalizationEscalation[];
  processingTimeMs: number;
}
```

---

## Task 3: Agent 1 — Digitalization & Personalization (`lib/agents/digitalize-agent.ts`)

This agent's ONLY job: look at raw scanned images, identify students, segment multi-student files, extract readable text. It does NOT grade. It does NOT generate feedback.

```typescript
// lib/agents/digitalize-agent.ts

import Anthropic from '@anthropic-ai/sdk';
import { ScannedPage, StudentSegment, DigitalizationResult, DigitalizationEscalation } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildDigitalizationPrompt(classRoster?: { id: string; name: string }[]): string {
  const rosterText = classRoster && classRoster.length > 0
    ? `\n\nCLASS ROSTER (match detected names against these):\n${classRoster.map(s => `- ${s.name}`).join('\n')}`
    : '\n\nNo class roster provided — identify names from the paper itself.';

  return `You are a document digitalization specialist for Estonian school test papers. Your ONLY job is to:
1. Read the scanned page(s)
2. Identify whose work this is (student name/initials)
3. Determine the document type and handwriting style
4. Flag any issues with readability or student identification

You do NOT grade. You do NOT give feedback. You only identify and digitize.
${rosterText}

IDENTIFICATION RULES:
- Look for the student's name at the top of the page, in a header, or on a cover sheet
- Names may be written as: full name, first name only, initials (J.M.), or abbreviated
- If one file contains multiple students' work, identify each section separately
- Handwriting may be: clearly printed, cursive, partially legible
- If name is completely unreadable: flag as escalation (name_not_found)
- If multiple students appear on one page: flag as escalation (multiple_students_unclear)

OUTPUT FORMAT — respond in valid JSON:
{
  "segments": [
    {
      "studentIdentifier": "name or initials detected from the paper",
      "confidence": "high|medium|low|none",
      "pageIndices": [0, 1, 2],
      "rawText": "all readable text from this student's pages, preserving structure",
      "handwritingType": "handwritten|printed|mixed|unknown",
      "formatType": "test|homework|essay|unknown",
      "matchedRosterName": "exact name from roster if matched, otherwise null"
    }
  ],
  "escalations": [
    {
      "pageIndices": [3],
      "reason": "name_not_found|text_unreadable|ambiguous_student|multiple_students_unclear|damaged_scan",
      "description": "Brief explanation in Estonian",
      "requiresHumanReview": true
    }
  ],
  "processingNotes": "Brief note about overall quality of the scan and any issues encountered"
}

CRITICAL: If ANY page cannot be reliably attributed to a student, create an escalation entry. Never guess a student name with low confidence — flag it instead.`;
}

export async function runDigitalizationAgent(
  pages: ScannedPage[],
  classRoster?: { id: string; name: string }[]
): Promise<DigitalizationResult> {
  const imageContent = pages.map(p => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: p.base64Image,
    },
  }));

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    system: buildDigitalizationPrompt(classRoster),
    messages: [
      {
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: `Please analyze these ${pages.length} scanned page(s). Identify all students and segment their work. Flag any readability or identification issues.`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in digitalization response');
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Map parsed segments back to ScannedPage objects
    const segments: StudentSegment[] = parsed.segments.map((s: any) => ({
      studentIdentifier: s.studentIdentifier || 'Tundmatu',
      confidence: s.confidence || 'low',
      matchedStudentId: classRoster?.find(r => r.name === s.matchedRosterName)?.id,
      matchedStudentName: s.matchedRosterName || undefined,
      pages: (s.pageIndices || []).map((i: number) => pages[i]).filter(Boolean),
      rawText: s.rawText || '',
      handwritingType: s.handwritingType || 'unknown',
      formatType: s.formatType || 'unknown',
    }));

    return {
      segments,
      escalations: parsed.escalations || [],
      processingNotes: parsed.processingNotes || '',
    };
  } catch (e) {
    // If parsing fails, return a single escalation for the whole batch
    return {
      segments: [],
      escalations: [{
        pageIndices: pages.map((_, i) => i),
        reason: 'text_unreadable',
        description: 'AI ei suutnud skaneeringut töödelda. Palun kontrollige pildi kvaliteeti.',
        requiresHumanReview: true,
      }],
      processingNotes: 'Digitalization agent failed to parse response.',
    };
  }
}
```

---

## Task 4: Agent 2 — Assessment (`lib/agents/assess-agent.ts`)

This agent's ONLY job: compare student answers to the correct answers/rubric and assign points. It is purely objective. No feedback language. No advice. Just facts.

```typescript
// lib/agents/assess-agent.ts

import Anthropic from '@anthropic-ai/sdk';
import { StudentSegment, AssessmentResult, TaskAssessment } from './types';
import { ESTONIAN_GRADING_RULES } from '../brain/grading';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildAssessmentPrompt(rubric?: string | null, answerKey?: string | null): string {
  return `You are an objective grader for Estonian school tests. Your ONLY job is to:
1. Read each task/question from the student's work
2. Compare the student's answer to the correct answer (if provided)
3. Assign points and classify error types
4. Identify patterns across all errors

You do NOT write feedback. You do NOT address the student. You do NOT make suggestions.
You ONLY evaluate and score — like a marking machine.

${rubric ? `RUBRIC PROVIDED BY TEACHER:\n${rubric}\n` : 'No rubric provided — use your subject knowledge to assess correctness.'}
${answerKey ? `ANSWER KEY:\n${answerKey}\n` : ''}

GRADING STANDARDS:
${ESTONIAN_GRADING_RULES}

ERROR CLASSIFICATION (use these exact terms):
- vaararusaam — conceptual misunderstanding (wrong mental model)
- valemisegadus — formula confusion (wrong formula selected)
- arvutusviga — calculation error (correct approach, wrong arithmetic)
- uhikuviga — unit error (missing or wrong unit)
- poolik_arutlus — incomplete reasoning (correct direction, unfinished)
- vaaritimõistmine — task misread (solved a different problem)

OUTPUT FORMAT — respond in valid JSON only:
{
  "tasks": [
    {
      "number": 1,
      "questionSummary": "Brief description of what task 1 asked (1 sentence)",
      "studentAnswer": "What the student wrote, summarized faithfully",
      "correctAnswer": "The correct answer (from rubric or your knowledge)",
      "isCorrect": true,
      "errorType": null,
      "pointsEarned": 5,
      "pointsPossible": 5,
      "graderNotes": "Internal note: why this is correct/incorrect (for teacher)"
    }
  ],
  "totalPointsEarned": 32,
  "totalPointsPossible": 50,
  "percentage": 64,
  "suggestedGrade": "5",
  "errorPattern": "2-3 sentence summary of what the errors collectively reveal about the student's understanding",
  "gradingConfidence": "high|medium|low",
  "gradingNotes": "Any grader uncertainty, rubric ambiguities, or notes for the teacher"
}

RULES:
1. List EVERY numbered task you find — never skip one
2. isCorrect = true (fully correct), false (wrong), null (partial credit)
3. For partial credit: explain in graderNotes what was right and what was wrong
4. If no rubric and you're unsure: note in gradingNotes and set gradingConfidence to "low"
5. errorType is null for correct answers
6. suggestedGrade uses the 10-point Estonian scale
7. Output raw JSON — no markdown fences, no explanation`;
}

export async function runAssessmentAgent(
  segment: StudentSegment,
  rubric?: string | null,
  answerKey?: string | null,
  rubricImages?: string[]
): Promise<AssessmentResult> {
  const imageContent = segment.pages.map(p => ({
    type: 'image' as const,
    source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: p.base64Image },
  }));

  // Add rubric images if provided
  const rubricImageContent = (rubricImages || []).map(img => ({
    type: 'image' as const,
    source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: img },
  }));

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: buildAssessmentPrompt(rubric, answerKey),
    messages: [
      {
        role: 'user',
        content: [
          ...imageContent,
          ...(rubricImageContent.length > 0 ? [{ type: 'text' as const, text: 'Rubric/marking scheme images follow:' }, ...rubricImageContent] : []),
          {
            type: 'text',
            text: 'Please assess this student test paper. Grade each task and identify error types.',
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  
  try {
    const { jsonrepair } = await import('jsonrepair');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonrepair(jsonMatch?.[0] || '{}'));
    return parsed as AssessmentResult;
  } catch {
    return {
      tasks: [],
      totalPointsEarned: null,
      totalPointsPossible: null,
      percentage: null,
      suggestedGrade: null,
      errorPattern: 'Assessment agent could not parse the test.',
      gradingConfidence: 'low',
      gradingNotes: 'Parsing failed — teacher review required.',
    };
  }
}
```

---

## Task 5: Agent 3 — Feedback (`lib/agents/feedback-agent.ts`)

This agent generates the full personalized academic feedback. It takes the assessment output and the brain, and produces a complete FeedbackData JSON. It does NOT look at images — it works from the assessment output only.

```typescript
// lib/agents/feedback-agent.ts

import Anthropic from '@anthropic-ai/sdk';
import { AssessmentResult } from './types';
import { FeedbackData } from '../types';
import { loadBrain } from '../brain/index';
import { jsonrepair } from 'jsonrepair';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildFeedbackPrompt(
  klass: string,
  teema: string,
  assessment: AssessmentResult,
  studentHistory?: string | null,
  curatedResources?: string
): string {
  const brain = loadBrain(teema, klass);

  return `You are an expert Estonian teacher and educational assessment specialist — the most empathetic, evidence-based feedback writer in Estonia.

You have received the GRADED assessment from an objective grader. Your job is to transform this into rich, personalized academic feedback following all evidence-based rules. You write in Estonian using "Sa" (capitalised, formal).

CLASS: ${klass}
TOPIC: ${teema}
SUBJECT: ${brain.subject}

GRADED ASSESSMENT RESULTS:
${JSON.stringify(assessment, null, 2)}

${studentHistory ? `STUDENT HISTORY (prior tests in this subject):\n${studentHistory}\n` : ''}

CURRICULUM REFERENCE (${brain.subject}, ${klass}):
${brain.curriculum}

ASSESSMENT SCIENCE RULES (MANDATORY — ALL 12):
${brain.assessmentScience}

ESTONIAN GRADING CONTEXT:
${brain.gradingRules}

PEDAGOGY PRINCIPLES:
${brain.pedagogyPrinciples}

${curatedResources ? `CURATED MATERIALS LIBRARY:\n${curatedResources}\n` : ''}

OUTPUT FORMAT — full FeedbackData JSON:
{
  "test_info": { ... },
  "opieesmark": "...",
  "mis_laks_hasti": [ { "title": "...", "text": "..." } ],
  "mida_parandada": [ { "title": "...", "text": "..." } ],
  "uldine_muster": "...",
  "soovitused": [ { "title": "...", "text": "..." } ],
  "pilk_ettepoole": "...",
  "markmed_opetajale": "...",
  "resources": [ ... ],
  "tasks": [ ... ]
}

CRITICAL RULES:
1. ALL student-facing text in Estonian
2. Use "Sa" (capitalised)
3. NEVER mention the grade/score in the narrative text — it's in test_info.score only
4. MASTERY FRAMING throughout — learning journey, not verdict
5. PROCESS OVER PERSON — task-level and process-level only
6. START FROM STRENGTH — find what the student DID understand
7. CONCRETE NEXT STEPS — specific actions, not "study more"
8. NO COMPARISON to other students
9. tasks[] array must include every task from the assessment
10. resources[] must use only curated URLs if library was provided`;
}

export async function runFeedbackAgent(
  klass: string,
  teema: string,
  assessment: AssessmentResult,
  studentHistory?: string | null,
  curatedResources?: string
): Promise<FeedbackData> {
  const systemPrompt = buildFeedbackPrompt(klass, teema, assessment, studentHistory, curatedResources);

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Generate comprehensive academic feedback based on the graded assessment above. Write in Estonian, follow all 12 assessment science rules. Be thorough — this is the feedback the student will use to grow.`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonrepair(jsonMatch?.[0] || '{}')) as FeedbackData;
  } catch {
    throw new Error('Feedback agent failed to produce valid JSON');
  }
}
```

---

## Task 6: Agent 4 — QA (`lib/agents/qa-agent.ts`)

This agent validates the work of all three previous agents. It is the final gate before feedback reaches the teacher.

```typescript
// lib/agents/qa-agent.ts

import Anthropic from '@anthropic-ai/sdk';
import { DigitalizationResult, AssessmentResult, QAResult, QAIssue } from './types';
import { FeedbackData } from '../types';
import { ASSESSMENT_SCIENCE } from '../brain/assessment';
import { jsonrepair } from 'jsonrepair';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const QA_SYSTEM_PROMPT = `You are a quality assurance specialist for an AI-generated student feedback system. You check whether three AI agents did their work correctly.

Your job is to:
1. Verify Agent 1 (Digitalization) identified students correctly
2. Verify Agent 2 (Assessment) graded consistently and correctly
3. Verify Agent 3 (Feedback) followed all 12 assessment science rules
4. Flag any violations, suggest corrections, and give an overall approval decision

THE 12 ASSESSMENT SCIENCE RULES TO CHECK:
${ASSESSMENT_SCIENCE}

ADDITIONAL QA CHECKS:
- Does the feedback contain any student name? (should be "Sa" only — privacy violation if real name)
- Does the feedback compare to other students? (Rule 11 violation)
- Does the feedback include grade/score in the narrative text? (Rule 1 violation)
- Does feedback address the student at a self level? ("Tubli!" / "Sa oled nõrk") (Rule 3 violation)
- Does each mida_parandada item have a concrete next step? (Rule 9 violation)
- Are ALL tasks from the assessment present in feedback.tasks[]? (completeness check)
- Are grade percentages consistent (assessment.percentage ≈ what's implied in feedback)?

OUTPUT FORMAT — respond in valid JSON:
{
  "approved": true,
  "qaScore": 87,
  "summary": "One-sentence QA verdict",
  "issues": [
    {
      "agent": "digitalization|assessment|feedback|qa",
      "severity": "critical|warning|suggestion",
      "rule": "RULE 3: PROCESS OVER PERSON",
      "description": "What is wrong",
      "originalText": "The problematic text",
      "suggestedFix": "Corrected version"
    }
  ],
  "correctedFeedback": {
    "uldine_muster": "corrected text if needed",
    "mida_parandada": [ ... ]
  }
}

approved = true if no CRITICAL issues. warnings and suggestions still allow approval.
correctedFeedback = only include fields that need correction — partial object is fine.`;

export async function runQAAgent(
  digitalization: DigitalizationResult,
  assessment: AssessmentResult,
  feedback: FeedbackData
): Promise<QAResult> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',  // QA can use a faster/cheaper model
    max_tokens: 4096,
    system: QA_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Please QA check these three agent outputs:

AGENT 1 DIGITALIZATION OUTPUT:
${JSON.stringify(digitalization, null, 2)}

AGENT 2 ASSESSMENT OUTPUT:
${JSON.stringify(assessment, null, 2)}

AGENT 3 FEEDBACK OUTPUT:
${JSON.stringify(feedback, null, 2)}

Check for all rule violations, consistency issues, and quality problems. Be thorough.`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonrepair(jsonMatch?.[0] || '{}')) as QAResult;
  } catch {
    return {
      approved: false,
      issues: [{ agent: 'qa', severity: 'critical', description: 'QA agent itself failed to produce valid output', requiresHumanReview: true } as any],
      qaScore: 0,
      summary: 'QA agent failed — manual review required',
    };
  }
}
```

---

## Task 7: Orchestrator (`lib/agents/orchestrator.ts`)

Coordinates all four agents in sequence. Handles escalations. Returns the final combined result.

```typescript
// lib/agents/orchestrator.ts

import { runDigitalizationAgent } from './digitalize-agent';
import { runAssessmentAgent } from './assess-agent';
import { runFeedbackAgent } from './feedback-agent';
import { runQAAgent } from './qa-agent';
import { AgentPipelineInput, AgentPipelineResult } from './types';
import { FeedbackData } from '../types';

export async function runAgentPipeline(input: AgentPipelineInput): Promise<AgentPipelineResult> {
  const start = Date.now();

  // ── Agent 1: Digitalization ──────────────────────────────────────────────
  console.log('[Pipeline] Agent 1: Digitalization starting...');
  const digitalization = await runDigitalizationAgent(input.pages, input.classRoster);

  // Collect all escalations — these need teacher attention
  const allEscalations = digitalization.escalations;

  // If no segments identified at all — cannot proceed
  if (digitalization.segments.length === 0) {
    throw new Error('Agent 1: No student segments identified. All pages require human review.');
  }

  // Process first (or only) segment — orchestrator processes one student at a time
  const segment = digitalization.segments[0];

  // ── Agent 2: Assessment ──────────────────────────────────────────────────
  console.log('[Pipeline] Agent 2: Assessment starting...');
  const assessment = await runAssessmentAgent(
    segment,
    input.rubric,
    input.answerKey,
  );

  // ── Agent 3: Feedback ────────────────────────────────────────────────────
  console.log('[Pipeline] Agent 3: Feedback starting...');
  // Load curated resources from DB (reuse existing logic)
  const { loadCuratedResourcesForAgent } = await import('../claude');
  const curatedResources = await loadCuratedResourcesForAgent(input.klass);

  const feedback = await runFeedbackAgent(
    input.klass,
    input.teema,
    assessment,
    input.studentHistory,
    curatedResources
  );

  // ── Agent 4: QA ──────────────────────────────────────────────────────────
  console.log('[Pipeline] Agent 4: QA starting...');
  const qa = await runQAAgent(digitalization, assessment, feedback);

  // Apply QA corrections to feedback
  const finalFeedback: FeedbackData = qa.correctedFeedback
    ? { ...feedback, ...qa.correctedFeedback }
    : feedback;

  console.log(`[Pipeline] Complete in ${Date.now() - start}ms. QA score: ${qa.qaScore}. Approved: ${qa.approved}`);

  return {
    digitalization,
    assessment,
    feedback,
    qa,
    finalFeedback,
    escalations: allEscalations,
    processingTimeMs: Date.now() - start,
  };
}
```

---

## Task 8: Export helper from `lib/claude.ts`

Add this export to the existing `lib/claude.ts` so the orchestrator can call it:

```typescript
// Add to lib/claude.ts — do NOT remove anything existing

export async function loadCuratedResourcesForAgent(grade: string): Promise<string> {
  return loadCuratedResources(grade);
}
```

---

## Task 9: Update `lib/claude.ts` — add agentic wrapper

Add a new exported function that routes to the agentic pipeline while keeping the old `analyzeTest()` function intact for backward compatibility:

```typescript
// Add to lib/claude.ts

export async function analyzeTestAgentic(
  pages: ScannedPage[],
  klass: string,
  teema: string,
  opilane: string,
  rubric?: string | null,
  answerKey?: string | null,
  classRoster?: { id: string; name: string }[],
  studentHistory?: string | null,
  testId?: string,
  teacherId?: string,
): Promise<FeedbackData> {
  const { runAgentPipeline } = await import('./agents/orchestrator');
  const { ScannedPage } = await import('./agents/types');

  const result = await runAgentPipeline({
    pages,
    klass,
    teema,
    rubric,
    answerKey,
    classRoster,
    studentHistory,
    testId: testId || 'unknown',
    teacherId: teacherId || 'unknown',
  });

  // Log QA result for monitoring
  if (!result.qa.approved) {
    console.warn('[analyzeTestAgentic] QA did not approve. Issues:', result.qa.issues);
  }

  return result.finalFeedback;
}
```

---

## Task 10: Feature flag for agentic mode

In `lib/features.ts`, add:

```typescript
export const AGENTIC_ANALYSIS_ENABLED = process.env.AGENTIC_ANALYSIS_ENABLED === 'true';
```

In the main analyze API route (`app/api/tests/[id]/analyze/route.ts` or equivalent), add a toggle:

```typescript
import { AGENTIC_ANALYSIS_ENABLED } from '@/lib/features';

// Inside the analyze handler:
const feedbackData = AGENTIC_ANALYSIS_ENABLED
  ? await analyzeTestAgentic(pages, klass, teema, opilane, rubric, answerKey, classRoster, studentHistory, testId, teacherId)
  : await analyzeTest(/* existing params */);
```

Add to `.env.example`:
```
AGENTIC_ANALYSIS_ENABLED=false
```

This allows gradual rollout without breaking existing functionality.

---

## Task 11: Add `references/mathematics-curriculum.md`

Create this file with the same content as `lib/brain/mathematics.ts` (the MATHEMATICS_CURRICULUM string) but in readable markdown format. This allows the curriculum to be updated without code changes.

Future subjects should follow the same pattern: create `references/[subject]-curriculum.md` and `lib/brain/[subject].ts`.

---

## Task 12: Run tests and verify

```bash
npm run build    # must succeed
npm run test     # all 71 tests must still pass
npm run lint     # no new lint errors
```

Write a new test in `__tests__/agents.test.ts` that verifies:
1. `runDigitalizationAgent` returns a DigitalizationResult shape (mock the Anthropic call)
2. `runAssessmentAgent` returns an AssessmentResult shape (mock)
3. `runFeedbackAgent` returns a FeedbackData shape (mock)
4. `runQAAgent` returns a QAResult with `approved` boolean (mock)
5. `runAgentPipeline` calls all four agents in sequence (integration mock)
6. Feature flag `AGENTIC_ANALYSIS_ENABLED=false` routes to old `analyzeTest()` function

---

## Order of Operations

1. Task 11 (references/mathematics-curriculum.md) — pure content, no risk
2. Task 1 (lib/brain/) — new files only, nothing broken
3. Task 2 (agent types) — new file only
4. Task 3 (Agent 1 digitalize) — new file
5. Task 4 (Agent 2 assess) — new file
6. Task 5 (Agent 3 feedback) — new file
7. Task 6 (Agent 4 QA) — new file
8. Task 7 (Orchestrator) — new file
9. Task 8 (claude.ts export addition) — small additive change
10. Task 9 (claude.ts agentic wrapper) — additive, behind feature flag
11. Task 10 (feature flag) — wire it up
12. Task 12 (tests + verify)

Commit after each task. Never remove the existing `analyzeTest()` function — it stays as fallback.

---

## Notes on model selection per agent

- **Agent 1 (Digitalization):** `claude-opus-4-5` — needs strong vision for handwritten text
- **Agent 2 (Assessment):** `claude-sonnet-4-5` — objective grading, structured output, balance cost/quality
- **Agent 3 (Feedback):** `claude-opus-4-5` — highest quality needed for student-facing text
- **Agent 4 (QA):** `claude-haiku-4-5-20251001` — rule-checking, structured, can be fast and cheap

This gives optimal quality where it matters while keeping cost reasonable.

---

## Brain expansion roadmap (NOT this sprint — document for future)

Future subjects to add to `lib/brain/`:
- `biology.ts` — bioloogia, 7.–12. klass
- `chemistry.ts` — keemia, 8.–12. klass
- `history.ts` — ajalugu, 7.–12. klass
- `estonian.ts` — eesti keel ja kirjandus
- `english.ts` — inglise keel

Each follows the same pattern as `physics.ts` and `mathematics.ts`.
