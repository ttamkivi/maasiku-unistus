import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import { uploadPhotoToBlob } from '@/lib/blob';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function analyzeHomework(
  assignmentTitle: string,
  assignmentDescription: string,
  subjectName: string | null,
  studentName: string,
  photos: { base64Data: string; caption?: string }[]
): Promise<object> {
  const systemPrompt = `You are an expert Estonian teacher providing personalised homework feedback. You receive photos of a student's completed homework from their workbook.

Assignment:
- Title: ${assignmentTitle}
- Subject: ${subjectName || 'General'}
- Assignment text: ${assignmentDescription}

Student: ${studentName}

Your task:
1. Look carefully at all the photos of the student's work
2. Evaluate how well the student completed the assignment
3. Identify specific strengths — what they did well
4. Identify specific areas for improvement — what needs work and HOW to improve
5. Write personalised feedback in Estonian using "Sa" (you, capitalised)

OUTPUT FORMAT — valid JSON only, no markdown:
{
  "summary": "2-3 sentence overall assessment in Estonian",
  "overallScore": number from 0-10 (or null if not applicable),
  "maxScore": 10,
  "strengths": [
    "Specific thing done well, in Estonian",
    "Another strength"
  ],
  "improvements": [
    "Specific area to improve with concrete advice, in Estonian",
    "Another improvement area"
  ],
  "sections": [
    {
      "title": "Section or question title",
      "content": "Detailed feedback for this section in Estonian"
    }
  ],
  "recommendation": "One concrete next step for the student, in Estonian"
}`;

  const imageContent: Anthropic.ImageBlockParam[] = photos.map(photo => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: photo.base64Data,
    },
  }));

  const captionText = photos
    .map((p, i) => p.caption ? `Photo ${i + 1}: ${p.caption}` : null)
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
              ? `Here are ${photos.length} photo(s) of the student's homework work.\n\nPhoto notes:\n${captionText}\n\nPlease analyze the work and provide structured feedback.`
              : `Here are ${photos.length} photo(s) of the student's homework work. Please analyze and provide structured feedback.`,
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: assignmentId } = await params;
  const token = req.cookies.get('mu_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { studentProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: { subject: true },
  });
  if (!assignment || assignment.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Assignment not found or not published' }, { status: 404 });
  }

  const { photos, studentNote } = await req.json();
  if (!photos || photos.length === 0) {
    return NextResponse.json({ error: 'Vähemalt üks foto on kohustuslik' }, { status: 400 });
  }
  if (photos.length > 10) {
    return NextResponse.json({ error: 'Maksimaalselt 10 fotot' }, { status: 400 });
  }

  const studentId = session.user.studentProfile?.id || null;
  const studentName = session.user.name;

  // Check for existing submission
  if (studentId) {
    const existing = await db.assignmentSubmission.findFirst({
      where: { assignmentId, studentId },
    });
    if (existing) {
      return NextResponse.json({ id: existing.id });
    }
  }

  // Upload photos to Vercel Blob (if token is set), else fall back to base64
  const photoCreateData = await Promise.all(
    photos.map(async (p: { base64Data: string; caption?: string }, i: number) => {
      const result = await uploadPhotoToBlob(p.base64Data, `submission-${Date.now()}-${i}.jpg`);
      if (result) {
        return {
          storageMode: 'blob',
          storageKey: result.url,
          base64Data: null as string | null,
          caption: p.caption || null,
        };
      }
      return {
        storageMode: 'local_only',
        base64Data: p.base64Data,
        caption: p.caption || null,
      };
    })
  );

  // Create submission record
  const submission = await db.assignmentSubmission.create({
    data: {
      assignmentId,
      studentId,
      studentName,
      studentNote: studentNote || null,
      status: 'ANALYZING',
      photos: {
        create: photoCreateData,
      },
    },
  });

  // Run AI analysis
  try {
    const feedback = await analyzeHomework(
      assignment.title,
      assignment.description,
      assignment.subject?.name || null,
      studentName,
      photos
    );

    await db.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        rawFeedback: JSON.stringify(feedback),
        status: 'FEEDBACK_READY',
        analyzedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('Assignment analysis error:', err);
    await db.assignmentSubmission.update({
      where: { id: submission.id },
      data: { status: 'SUBMITTED' },
    });
  }

  return NextResponse.json({ id: submission.id });
}
