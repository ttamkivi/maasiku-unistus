import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db';
import { CURRICULUM } from '@/lib/curriculum';

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
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Sessioon aegunud' }, { status: 401 });
  }

  const user = session.user;
  if (user.role !== 'TEACHER' && user.role !== 'SUPERADMIN' && user.role !== 'SCHOOL_ADMIN') {
    return NextResponse.json({ error: 'Pole õigust' }, { status: 403 });
  }

  const body = await req.json();
  const { curriculumCode, topic, grade, difficulty, questionCount, duration, prompt } = body;

  if (!curriculumCode) {
    return NextResponse.json({ error: 'Ainekava teema on kohustuslik' }, { status: 400 });
  }

  const difficultyText: Record<string, string> = {
    basic: 'Basic level — straightforward recall and simple application. Most students should be able to score well.',
    standard: 'Standard level — aligned with the national curriculum expectations. Mix of recall, application, and some analysis.',
    advanced: 'Advanced level — requires deeper reasoning, multi-step problem solving, and connections between concepts.',
  };

  const systemPrompt = `You are an expert Estonian physics teacher who creates high-quality tests (kontrolltöö) for students. You follow the Estonian national curriculum (Eesti riiklik õppekava) precisely.

CURRICULUM REFERENCE:
${CURRICULUM}

YOUR TASK: Create a complete test (kontrolltöö) for the following parameters:
- Topic: ${curriculumCode} — ${topic}
- Grade: ${grade}. klass
- Number of questions: ${questionCount}
- Duration: ${duration} minutes
- Difficulty: ${difficultyText[difficulty] || difficultyText.standard}

OUTPUT FORMAT: You must respond in valid JSON with exactly this structure:
{
  "title": "Test title in Estonian (e.g. 'Soojusõpetus — kontrolltöö nr 1')",
  "questions": "Full test text in Estonian, formatted for printing. Include:\n- Test header with title and space for name/date\n- Numbered questions (1, 2, 3...)\n- Point values for each question shown as (Xp)\n- Clear instructions for each question type\n- Space indicators like [Joonis] or [Graafik] where students need to draw\n- Total points at the end",
  "answerKey": "Complete answer key in Estonian:\n- Each question numbered to match\n- Full worked solutions with intermediate steps\n- Final answers clearly marked\n- Alternative acceptable answers noted where applicable",
  "rubric": "Detailed rubric in Estonian:\n- Point breakdown for each question\n- Partial credit criteria\n- Common mistakes to watch for\n- What earns full marks vs partial marks"
}

CRITICAL RULES:
1. Write ALL content in Estonian
2. Follow the curriculum requirements for ${curriculumCode} precisely
3. Use correct physics notation and SI units
4. Include a mix of question types:
   - Conceptual/explain questions (seleta, põhjenda)
   - Calculation questions with given values (arvuta)
   - Graph/diagram interpretation (graafik, joonis)
   - At least one real-world application (igapäevaelu)
5. Scale difficulty and depth to ${duration} minutes
6. Point values must be realistic and total to a round number (e.g. 40, 50, or 60 points)
7. The answer key must show FULL worked solutions, not just final answers
8. The rubric must specify partial credit rules clearly
9. Questions should scaffold from easier to harder
10. Include formula reminders at the top of the test if relevant`;

  const userMessage = prompt
    ? `Generate the test with these additional instructions from the teacher: ${prompt}`
    : `Generate a complete ${duration}-minute test for ${grade}. klass on topic ${curriculumCode} — ${topic} with ${questionCount} questions.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 12000,
      metadata: { user_id: 'pseudonymised' },
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

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
