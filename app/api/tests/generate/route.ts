import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db';
import { getCurriculumForTest } from '@/lib/curriculum-filter';
import { resolveProvider, checkUsageLimit, logUsage } from '@/lib/ai-provider';

// ── Vercel runtime config ────────────────────────────────────────────────────
// AI calls can take 20–60s (4-agent pipeline). Default 10s would 504.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * POST /api/tests/generate — AI-generate a test with questions, answer key, and rubric
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Logi sisse' }, { status: 401 });
  }

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Sessioon aegunud' }, { status: 401 });
  }

  const user = session.user;
  if (user.role !== 'TEACHER' && user.role !== 'SUPERADMIN' && user.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Pole õigust' }, { status: 403 });
  }

  const teacherProfileId = user.teacherProfile?.id;

  const body = await req.json();
  const { curriculumCode, topic, subject, grade, difficulty, questionCount, duration, prompt, files } = body as {
    curriculumCode?: string;
    topic?: string;
    subject?: string;
    grade: string;
    difficulty: string;
    questionCount: string;
    duration: string;
    prompt?: string;
    files?: { name: string; type: string; base64: string }[];
  };

  const difficultyText: Record<string, string> = {
    basic: 'Basic level — straightforward recall and simple application. Most students should be able to score well.',
    standard: 'Standard level — aligned with the national curriculum expectations. Mix of recall, application, and some analysis.',
    advanced: 'Advanced level — requires deeper reasoning, multi-step problem solving, and connections between concepts.',
  };

  // Build topic description from available info
  const topicDesc = [curriculumCode, topic].filter(Boolean).join(' — ') || subject || 'Üldine kontrolltöö';
  const subjectName = subject || 'aineõpetaja';

  // Include curriculum reference only for physics (where we have structured data)
  // Use trimmed curriculum: only the sections relevant to this grade/topic
  const isPhysics = subject === 'Füüsika' || (curriculumCode && curriculumCode.startsWith('F'));
  const trimmedCurriculum = isPhysics
    ? getCurriculumForTest(grade, curriculumCode ? [curriculumCode] : undefined, topic || subject)
    : '';
  const curriculumBlock = trimmedCurriculum
    ? `\nCURRICULUM REFERENCE (filtered for ${grade}. klass${topic ? ` — ${topic}` : ''}):\n${trimmedCurriculum}\n`
    : '';
  const curriculumRule = curriculumCode
    ? `Follow the curriculum requirements for ${curriculumCode} precisely.`
    : 'Follow the Estonian national curriculum for this subject and grade level.';

  const systemPrompt = `You are an expert Estonian ${subjectName} who creates high-quality tests (kontrolltöö) for students. You follow the Estonian national curriculum (Eesti riiklik õppekava).
${curriculumBlock}
YOUR TASK: Create a complete test (kontrolltöö) for the following parameters:
- Topic: ${topicDesc}
${subject ? `- Subject: ${subject}` : ''}
- Grade: ${grade}. klass
- Number of questions: ${questionCount}
- Duration: ${duration} minutes
- Difficulty: ${difficultyText[difficulty] || difficultyText.standard}

OUTPUT FORMAT: You must respond in valid JSON with exactly this structure:
{
  "title": "Test title in Estonian",
  "questions": "Full test text in Estonian, formatted for printing. Include:\n- Test header with title and space for name/date\n- Numbered questions (1, 2, 3...)\n- Point values for each question shown as (Xp)\n- Clear instructions for each question type\n- Total points at the end",
  "answerKey": "Complete answer key in Estonian:\n- Each question numbered to match\n- Full worked solutions with intermediate steps\n- Final answers clearly marked\n- Alternative acceptable answers noted where applicable",
  "rubric": "Detailed rubric in Estonian:\n- Point breakdown for each question\n- Partial credit criteria\n- Common mistakes to watch for\n- What earns full marks vs partial marks"
}

CRITICAL RULES:
1. Write ALL content in Estonian
2. ${curriculumRule}
3. Use correct notation and units appropriate to the subject
4. Include a mix of question types appropriate to the subject (conceptual, applied, analytical)
5. Scale difficulty and depth to ${duration} minutes
6. Point values must be realistic and total to a round number (e.g. 40, 50, or 60 points)
7. The answer key must show FULL worked solutions, not just final answers
8. The rubric must specify partial credit rules clearly
9. Questions should scaffold from easier to harder`;

  const userTextMessage = prompt
    ? `Generate the test with these additional instructions from the teacher: ${prompt}`
    : `Generate a complete ${duration}-minute test for ${grade}. klass on ${topicDesc} with ${questionCount} questions.`;

  // Build multimodal message content: text + any attached files
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedFileTypes = [...allowedImageTypes, 'application/pdf', 'text/plain', 'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
  const userContent: Anthropic.MessageCreateParams['messages'][0]['content'] = [];

  // Validate and add file attachments
  if (files && files.length > 0) {
    // Server-side limits: max 10 files, max 10MB per file (base64 ≈ 13.3MB)
    const MAX_FILES = 10;
    const MAX_BASE64_SIZE = 14 * 1024 * 1024; // ~10MB original file

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Maksimaalselt ${MAX_FILES} faili korraga` }, { status: 400 });
    }

    for (const file of files) {
      // Validate file type
      if (!allowedFileTypes.includes(file.type) && !file.type.startsWith('image/')) {
        return NextResponse.json({ error: `Toetamata failiformaat: ${file.name} (${file.type})` }, { status: 400 });
      }

      // Validate size
      if (file.base64.length > MAX_BASE64_SIZE) {
        return NextResponse.json({ error: `Fail "${file.name}" on liiga suur (max 10 MB)` }, { status: 400 });
      }

      if (allowedImageTypes.includes(file.type)) {
        // Image files — send as image blocks
        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: file.base64,
          },
        });
        userContent.push({
          type: 'text',
          text: `[Uploaded image: ${file.name}]`,
        });
      } else if (file.type === 'application/pdf') {
        // PDF files — send as document blocks
        userContent.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: file.base64,
          },
        } as Anthropic.DocumentBlockParam);
        userContent.push({
          type: 'text',
          text: `[Uploaded PDF: ${file.name}]`,
        });
      } else {
        // Other files (docx, xlsx, csv, txt) — try to decode as text
        try {
          const decoded = Buffer.from(file.base64, 'base64').toString('utf-8');
          userContent.push({
            type: 'text',
            text: `[Content from uploaded file "${file.name}"]:\n${decoded.slice(0, 50000)}`,
          });
        } catch {
          userContent.push({
            type: 'text',
            text: `[File "${file.name}" uploaded but could not be read as text]`,
          });
        }
      }
    }

    userContent.push({
      type: 'text',
      text: `\nThe teacher has uploaded ${files.length} reference file(s) above. Use them as background material when creating the test. Now:\n\n${userTextMessage}`,
    });
  }

  // If no files, just use the text message
  const messageContent = userContent.length > 0 ? userContent : userTextMessage;

  try {
    // Resolve AI provider for this teacher
    const providerInfo = teacherProfileId
      ? await resolveProvider(teacherProfileId)
      : { provider: 'anthropic', model: 'claude-sonnet-4-6', apiKey: process.env.ANTHROPIC_API_KEY || '', schoolId: null };

    if (teacherProfileId) {
      const limitCheck = await checkUsageLimit(providerInfo.schoolId, teacherProfileId);
      if (!limitCheck.allowed) {
        return NextResponse.json({ error: limitCheck.reason || 'Kasutuslimiit täis' }, { status: 429 });
      }
    }

    const aiStart = Date.now();
    const aiClient = new Anthropic({ apiKey: providerInfo.apiKey });
    const response = await aiClient.messages.create({
      model: providerInfo.model,
      max_tokens: 12000,
      metadata: { user_id: 'pseudonymised' },
      system: systemPrompt,
      messages: [{ role: 'user', content: messageContent }],
    });

    if (teacherProfileId) {
      await logUsage({
        schoolId: providerInfo.schoolId,
        teacherProfileId,
        provider: providerInfo.provider,
        model: providerInfo.model,
        operation: 'generate_test',
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        durationMs: Date.now() - aiStart,
        success: true,
      });
    }

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    let jsonText = content.text.trim();

    // Strip markdown code fences if present
    const jsonMatch = jsonText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    } else {
      const start = jsonText.indexOf('{');
      const end = jsonText.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        jsonText = jsonText.slice(start, end + 1);
      }
    }

    let parsed: { title: string; questions: string; answerKey: string; rubric: string };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // If JSON parsing fails, try to use jsonrepair
      const { jsonrepair } = await import('jsonrepair');
      const repaired = jsonrepair(jsonText);
      parsed = JSON.parse(repaired);
    }

    return NextResponse.json({
      title: parsed.title,
      questions: parsed.questions,
      answerKey: parsed.answerKey,
      rubric: parsed.rubric,
    });
  } catch (err) {
    console.error('Test generation error:', err);
    return NextResponse.json(
      { error: 'AI genereerimine ebaõnnestus. Proovi uuesti.' },
      { status: 500 }
    );
  }
}
