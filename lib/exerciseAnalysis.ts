import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function analyzeExercise(
  topic: string,
  subjectName: string | null,
  grade: string | null,
  studentName: string,
  studentNote: string | null,
  photos: { base64Data: string; caption?: string | null }[]
): Promise<object> {
  const gradeCtx = grade ? ` (${grade}. klass)` : '';
  const subjectCtx = subjectName || 'üldained';

  const systemPrompt = `You are an expert Estonian teacher providing personalised feedback on a student's homework exercises.
You receive photos of the student's work from their exercise book or workbook.

Context:
- Subject: ${subjectCtx}${gradeCtx}
- Topic/what they were working on: ${topic}
- Student: ${studentName}
${studentNote ? `- Student's note: ${studentNote}` : ''}

Your task:
1. Carefully examine ALL the photos of the student's work
2. Identify what exercises or tasks the student was solving
3. Evaluate correctness, understanding, and presentation
4. Identify specific STRENGTHS — what they did well
5. Identify specific areas for IMPROVEMENT with concrete, actionable advice
6. Write personalised feedback in Estonian using "Sa" (capitalised)
7. Focus on LEARNING and IMPROVEMENT, not just grading

OUTPUT FORMAT — valid JSON only, no markdown wrapping:
{
  "summary": "2-3 sentence overall assessment in Estonian",
  "overallScore": number from 0-10 reflecting mastery (or null if not applicable),
  "maxScore": 10,
  "strengths": [
    "Specific strength in Estonian",
    "Another strength"
  ],
  "improvements": [
    "Specific improvement area with concrete advice in Estonian",
    "Another improvement"
  ],
  "sections": [
    {
      "title": "Exercise or section title (e.g. Ülesanne 5.1)",
      "content": "Detailed feedback for this specific exercise in Estonian"
    }
  ],
  "recommendation": "One concrete next step for the student to practice, in Estonian"
}`;

  const imageContent: Anthropic.ImageBlockParam[] = photos.map((photo) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: photo.base64Data,
    },
  }));

  const captionText = photos
    .map((p, i) => (p.caption ? `Foto ${i + 1}: ${p.caption}` : null))
    .filter(Boolean)
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: captionText
              ? `Siin on ${photos.length} foto õpilase harjutustest.\n\nFotomärkused:\n${captionText}\n\nPalun analüüsi tööd ja anna tagasidet.`
              : `Siin on ${photos.length} foto õpilase harjutustest. Palun analüüsi tööd ja anna tagasidet.`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : text;
  return JSON.parse(jsonrepair(jsonStr.trim()));
}

export async function reviewFeedback(
  draft: object,
  photos: { base64Data: string; caption?: string | null }[]
): Promise<object> {
  const imageContent: Anthropic.ImageBlockParam[] = photos.map((photo) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: photo.base64Data,
    },
  }));

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: `You are a strict fact-checker reviewing AI-generated student feedback.
Your ONLY job is to find and fix factual errors — incorrect calculations, wrong formula applications, wrong numerical results, wrong units, wrong physics/math/chemistry concepts.
Do NOT change the tone, language (Estonian), structure, or pedagogical content unless it contains a factual error.
Return the corrected JSON object with exactly the same structure as the input. No explanation, no markdown — valid JSON only.`,
    messages: [
      {
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: `Here is the student's work (photos above) and the draft feedback below. Check every calculation and factual claim against the photos. Fix any errors silently.\n\nDraft feedback:\n${JSON.stringify(draft)}`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : text;
  return JSON.parse(jsonrepair(jsonStr.trim()));
}
