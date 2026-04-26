// lib/agents/digitalize-agent.ts

import Anthropic from '@anthropic-ai/sdk';
import { ScannedPage, StudentSegment, DigitalizationResult } from './types';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  } catch {
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
