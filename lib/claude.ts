import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import { getCurriculumForTest } from './curriculum-filter';
import { ASSESSMENT_RULES } from './assessment-rules';
import { FeedbackData } from './types';
import { getLearnedRules } from './ai-learning';
import { db } from './db';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Privacy: the student's real name is never sent to the Anthropic API.
// We use a neutral placeholder so the AI generates feedback with "Sa" (you)
// rather than the student's real name. The actual name is stored only in our DB.
const AI_STUDENT_PLACEHOLDER = 'Õpilane';

export function buildSystemPrompt(klass: string, teema: string, _opilane: string, rubric?: string | null, answerKey?: string | null, learnedRules?: string, curatedResources?: string, curriculumCodes?: string[], hasRubricImages?: boolean): string {
  // _opilane param kept for API compatibility but NOT forwarded to Anthropic
  // Use trimmed curriculum: only the sections relevant to this test's grade/topic/codes
  const trimmedCurriculum = getCurriculumForTest(klass, curriculumCodes, teema);

  return `You are an expert Estonian physics teacher and educational assessment specialist. You receive photos of a completed student test paper from an Estonian school. Your feedback must follow evidence-based assessment science — not just "what's right and wrong" but a full learning-journey response.

Student info provided by the teacher:
- Class: ${klass}
- Test topic: ${teema}
- Student: ${AI_STUDENT_PLACEHOLDER}${rubric ? `\n\nGRADING RUBRIC (provided by teacher):\n${rubric}` : ''}${answerKey ? `\n\nCORRECT ANSWERS (provided by teacher):\n${answerKey}` : ''}${hasRubricImages ? '\n\nMARKING SCHEME IMAGES: The teacher has uploaded images of their marking scheme. Use these for accurate grading.' : ''}

Your task:
1. Read every answer on the test paper carefully
2. For each answer, determine: what the student wrote, whether it is correct, and if wrong — classify the error type (väärarusaam/conceptual, valemisegadus/formula, arvutusviga/calculation, ühikuviga/unit, poolik arutlus/incomplete, ülesande vääritimõistmine/misread)
3. Look for patterns across all answers — what do the mistakes collectively reveal about this student's mental model?
4. Answer all three feedback questions: KUHU MA LÄHEN? / KUIDAS MUL LÄHEB? / MIDA EDASI?
5. Write deeply personal, mastery-oriented feedback in Estonian using "Sa" (capitalised)

CURRICULUM REFERENCE (filtered for ${klass}. klass${teema ? ` — ${teema}` : ''}):
${trimmedCurriculum}

ASSESSMENT SCIENCE RULES (mandatory — follow all 12):
${ASSESSMENT_RULES}

OUTPUT FORMAT — respond in valid JSON:
{
  "test_info": {
    "title": "detected test title from the paper",
    "topic": "detected topic",
    "class": "detected class level",
    "score": "detected score if visible, otherwise null",
    "student": "student name/initials"
  },
  "opieesmark": "The specific learning objective(s) this test assessed — what should the student be able to do after mastering this topic? One to two sentences in Estonian.",
  "mis_laks_hasti": [
    {
      "title": "Short bold title naming the specific competence demonstrated",
      "text": "Task-level or process-level explanation in Estonian using Sa. Name the specific question or work that showed this competence. This is diagnostic, not empty praise."
    }
  ],
  "mida_parandada": [
    {
      "title": "Short bold title naming the specific gap or error type",
      "text": "Classify the error (väärarusaam/valemisegadus/arvutusviga/ühikuviga/poolik arutlus/ülesande vääritimõistmine). Explain what it reveals: 'See viga näitab, et...' Use informational, not controlling language. Include a concrete next step."
    }
  ],
  "uldine_muster": "Mastery-framed paragraph describing the overall learning state. Where is this student on their learning journey with this topic? Answer KUIDAS MUL LÄHEB? with specific evidence from the test. Never compare to other students.",
  "soovitused": [
    {
      "title": "Short bold title",
      "text": "Concrete, actionable next step the student can take TODAY. Not 'study more' — specific: which exercise, which resource, which technique to practice."
    }
  ],
  "pilk_ettepoole": "Connect this test to the curriculum journey. Answer KUHU MA LÄHEN? — what was the learning goal, and answer MIDA EDASI? — what comes next and how today's learning is a foundation for it. Reference the curriculum: what topic follows and why this matters.",
  "markmed_opetajale": "Diagnostic teacher notes only. Include: (1) which specific curriculum objectives are met vs not yet met, (2) what the error patterns reveal about the student's mental model, (3) suggested differentiation. Never label the student as a person.",
  "drawings": [
    {
      "title": "Diagram title",
      "description": "Text description of the diagram — NO SVG, NO HTML, plain text only",
      "caption": "Explanation in Estonian"
    }
  ],
  "resources": [
    {
      "type": "video|reading|exercise",
      "title": "Resource title",
      "url": "https://...",
      "description": "Why this is relevant to THIS student's specific gap",
      "topic": "Which gap or misconception this addresses"
    }
  ],
  "tasks": [
    {
      "number": 1,
      "question_summary": "Brief description of what task 1 asked",
      "student_answer": "What the student wrote, summarised",
      "is_correct": true,
      "what_went_right": "Task-level explanation in Estonian using Sa — what specific understanding does this demonstrate?",
      "what_went_wrong": null,
      "advice": null,
      "points_earned": "5",
      "points_possible": "5"
    }
  ]
}

CRITICAL RULES — follow every one:
1. Write ALL feedback text in Estonian
2. Use "Sa" (capitalised) when addressing the student
3. MASTERY FRAMING: frame everything as learning journey position, NEVER as ranking or verdict
4. PROCESS OVER PERSON: use task-level and process-level feedback — NEVER self-level ("Tubli!" is banned)
5. INFORMATIONAL LANGUAGE: "Pane tähele...", "Proovi...", "Üks võimalus..." — NEVER "Sa pead...", "See on vale"
6. START FROM STRENGTH: find at least one real competence demonstrated, even in a low-scoring test
7. CLASSIFY ERRORS: every mistake must be named by type (väärarusaam/valemisegadus/arvutusviga/ühikuviga/poolik arutlus/ülesande vääritimõistmine)
8. NO COMPARISON: never mention class averages, other students, or normative benchmarks
9. CONCRETE ACTIONS: every improvement suggestion must include a specific step the student can take TODAY
10. UNCLEAR HANDWRITING: write "[loetamatu]" — never guess
11. TASKS ARRAY IS MANDATORY: scan the paper for ALL numbered questions (1, 2, 3... or 1), 2), 3)...). List EVERY task in order. At least 1 entry required — never return an empty tasks array. is_correct = true if fully correct, false if wrong, null if partial.
12. NO SVG/HTML/XML in the JSON. drawings array = plain text descriptions only.

OUTPUT LENGTH: LONG version — be thorough. Up to 5 A4 pages total. Include resources appendix with 3-5 specific links.

RESOURCES GUIDELINES:
${curatedResources ? `You have access to a CURATED MATERIALS LIBRARY below. Pick 3-5 resources from this list that best match the student's identified gaps and error types. Use the exact URLs and titles from the list — do NOT invent or guess URLs.

CURATED MATERIALS LIBRARY:
${curatedResources}

RULES FOR USING THE LIBRARY:
- ONLY use URLs from the list above — never make up a URL
- Pick resources that match the student's specific weak areas
- Prefer Estonian (et) resources, then English with subtitles (et_sub), then English (en)
- Prefer free resources over paid ones
- Include the resource type and description from the library
- If fewer than 3 resources match the student's gaps, include the best available ones` : `- Find 3-5 REAL, working resources specific to the student's identified gaps and error types
- Prefer Estonian resources: opiq.ee, e-koolikott.ee, miksike.ee
- International: khanacademy.org, physicsclassroom.com, YouTube
- Each resource must directly address one of the identified error types
- Include the specific URL path, not just the homepage`}
- Mark resource type clearly: type "video" for YouTube, "reading" for articles/textbooks, "exercise" for practice sets${learnedRules || ''}`;
}

/**
 * Fetch curated learning materials from the internal repo.
 * If specific curriculum codes are provided, fetch materials for those codes.
 * Otherwise, fetch materials matching the grade (e.g. all F9.x.x for grade 9).
 */
async function loadCuratedResources(grade: string, curriculumCodes?: string[]): Promise<string> {
  let materials;

  if (curriculumCodes && curriculumCodes.length > 0) {
    // Fetch materials for the specific curriculum codes linked to this test
    materials = await db.learningResource.findMany({
      where: { curriculumCode: { in: curriculumCodes } },
      orderBy: [{ quality: 'desc' }, { verified: 'desc' }],
      take: 30,
    });
  } else {
    // Fallback: fetch all materials for this grade level
    materials = await db.learningResource.findMany({
      where: { gradeRange: grade },
      orderBy: [{ quality: 'desc' }, { verified: 'desc' }],
      take: 30,
    });
  }

  if (materials.length === 0) return '';

  // Format as a simple text list for the AI prompt
  return materials
    .map(
      (m) =>
        `- [${m.curriculumCode}] ${m.title} (${m.type}, ${m.language}${m.isFree ? '' : ', tasuline'}) — ${m.url}${m.description ? '\n  ' + m.description : ''}`
    )
    .join('\n');
}

export async function analyzeTest(
  klass: string,
  teema: string,
  opilane: string,
  images: string[],
  rubric?: string | null,
  answerKey?: string | null,
  curriculumCodes?: string[],
  rubricImages?: string[]
): Promise<FeedbackData> {
  const imageBlocks = images.map((base64) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: base64,
    },
  }));

  // Add rubric images if provided
  const rubricImageBlocks = (rubricImages ?? []).map((base64) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: base64,
    },
  }));

  // Load accumulated QA patterns — the system's "brain" gets smarter over time
  let learnedRules = '';
  try {
    learnedRules = await getLearnedRules(teema, klass);
  } catch (err) {
    // Non-blocking: if pattern loading fails, proceed without them
    console.error('Failed to load learned rules:', err);
  }

  // Load curated learning materials from the internal repo
  let curatedResources = '';
  try {
    curatedResources = await loadCuratedResources(klass, curriculumCodes);
  } catch (err) {
    console.error('Failed to load curated resources:', err);
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    // Anthropic API does not use API data for model training by default.
    // We additionally pass metadata with no PII for our own audit purposes.
    metadata: { user_id: 'pseudonymised' },
    system: buildSystemPrompt(klass, teema, opilane, rubric, answerKey, learnedRules, curatedResources, curriculumCodes, rubricImages && rubricImages.length > 0),
    messages: [
      {
        role: 'user',
        content: [
          ...imageBlocks,
          ...rubricImageBlocks,
          {
            type: 'text',
            text: 'Palun analüüsi seda kontrolltööd ja anna tagasiside vastavalt juhendile.',
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  let jsonText = content.text.trim();

  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  const jsonMatch = jsonText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  } else {
    // Fallback: find first { and last } to extract raw JSON
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      jsonText = jsonText.slice(start, end + 1);
    }
  }

  try {
    return JSON.parse(jsonText) as FeedbackData;
  } catch {
    // Use jsonrepair to fix common issues: unescaped quotes, newlines, trailing commas
    const repaired = jsonrepair(jsonText);
    return JSON.parse(repaired) as FeedbackData;
  }
}
