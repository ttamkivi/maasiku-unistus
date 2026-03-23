import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import { CURRICULUM } from './curriculum';
import { FeedbackData } from './types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export function buildSystemPrompt(klass: string, teema: string, opilane: string, rubric?: string | null, answerKey?: string | null): string {
  return `You are an expert Estonian physics teacher and tutor. You receive photos of a completed student test paper from an Estonian school.

Student info provided by the teacher:
- Class: ${klass}
- Test topic: ${teema}
- Student name/initials: ${opilane}${rubric ? `\n\nGRADING RUBRIC (provided by teacher):\n${rubric}` : ''}${answerKey ? `\n\nCORRECT ANSWERS (provided by teacher):\n${answerKey}` : ''}

Your task:
1. Read every answer on the test paper carefully
2. For each answer, determine: what the student wrote, whether it's correct, and if wrong — WHY it's wrong (conceptual gap, formula confusion, calculation error, unit error, incomplete, or misread question)
3. Look for patterns across all answers
4. Write deeply personal feedback in Estonian using "Sa" (capitalised)

Use the curriculum reference below to place this test in the learning journey — what the student has already learned, what's coming next.

CURRICULUM REFERENCE:
${CURRICULUM}

OUTPUT FORMAT — respond in valid JSON:
{
  "test_info": {
    "title": "detected test title from the paper",
    "topic": "detected topic",
    "class": "detected class level",
    "score": "detected score if visible, otherwise null",
    "student": "student name/initials"
  },
  "mis_laks_hasti": [
    {
      "title": "Short bold title",
      "text": "Detailed explanation in Estonian using Sa..."
    }
  ],
  "mida_parandada": [
    {
      "title": "Short bold title",
      "text": "Detailed explanation with specific advice..."
    }
  ],
  "uldine_muster": "Paragraph describing the overall pattern...",
  "soovitused": [
    {
      "title": "Short bold title",
      "text": "Specific actionable recommendation..."
    }
  ],
  "pilk_ettepoole": "Paragraph connecting current learning to what's next...",
  "markmed_opetajale": "Paragraph with teacher-only notes about this student...",
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
      "description": "Why this is relevant",
      "topic": "Which topic this covers"
    }
  ],
  "tasks": [
    {
      "number": 1,
      "question_summary": "Brief description of what task 1 asked",
      "student_answer": "What the student wrote, summarised",
      "is_correct": true,
      "what_went_right": "Explanation in Estonian using Sa...",
      "what_went_wrong": null,
      "advice": null,
      "points_earned": "5",
      "points_possible": "5"
    }
  ]
}

CRITICAL RULES:
- Write ALL feedback text in Estonian
- Use "Sa" (capitalised) when addressing the student
- Be specific — reference actual questions and actual student answers
- Start with what went well, even if the score is low
- Explain errors as a conversation, not a verdict
- Connect to curriculum — mention what comes next
- If you cannot read part of the handwriting, say so honestly ("[loetamatu]")
- Never invent content that isn't visible in the photos
- TASKS ARRAY IS MANDATORY — even if handwriting is unclear. Scan the paper carefully for numbered questions (1, 2, 3... or 1), 2), 3)...). List EVERY task/question in order. If you cannot read the question clearly, write "[loetamatu]" in question_summary. is_correct = true if fully correct, false if wrong, null if partial. There must be at least 1 entry in tasks — never return an empty tasks array.

OUTPUT LENGTH: LONG version — be thorough. Up to 5 A4 pages total. Include resources appendix with 3-5 specific links.
IMPORTANT: Do NOT include any SVG, HTML, or XML in the JSON. The drawings array must only contain plain text descriptions. SVG breaks JSON parsing.

RESOURCES GUIDELINES:
- Find 3-5 REAL, working resources specific to the student's identified weaknesses
- Prefer Estonian resources: opiq.ee, e-koolikott.ee, miksike.ee
- International: khanacademy.org, physicsclassroom.com, YouTube
- Each resource must directly address one of the identified mistakes
- Include the specific URL path, not just the homepage
- Mark resource type clearly: type "video" for YouTube, "reading" for articles/textbooks, "exercise" for practice sets`;
}

export async function analyzeTest(
  klass: string,
  teema: string,
  opilane: string,
  images: string[],
  rubric?: string | null,
  answerKey?: string | null
): Promise<FeedbackData> {
  const imageBlocks = images.map((base64) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: base64,
    },
  }));

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: buildSystemPrompt(klass, teema, opilane, rubric, answerKey),
    messages: [
      {
        role: 'user',
        content: [
          ...imageBlocks,
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
