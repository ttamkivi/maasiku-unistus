import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db';
import { CURRICULUM } from '@/lib/curriculum';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * POST /api/materials/generate — AI-generate a learning material
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
  const { curriculumCode, topic, type, language, difficulty, prompt } = body;

  if (!curriculumCode || !type) {
    return NextResponse.json({ error: 'Ainekava teema ja materjali tüüp on kohustuslikud' }, { status: 400 });
  }

  const lang = language === 'en' ? 'English' : 'Estonian';

  const typeInstructions: Record<string, string> = {
    exercise: `Create a worksheet / exercise set for students. Include:
- 6-10 problems of varying difficulty (easy → medium → challenging)
- Clear instructions for each problem
- Space/format hints for student answers
- A separate ANSWER KEY section at the end
- Include at least one problem that requires graphing or diagram interpretation
- Include at least one conceptual/explain-why question`,
    reading: `Create an explanatory reading material for students. Include:
- Clear introduction that connects to everyday life
- Key concepts explained step by step with examples
- Important formulas highlighted and explained (what each variable means)
- 2-3 real-world application examples
- Summary of key points at the end
- 3-5 self-check questions at the end`,
    video: `Create a detailed video script for a 5-8 minute educational video. Include:
- Opening hook that grabs attention (question or surprising fact)
- Step-by-step explanation with visual cues [SHOW: ...] for what should appear on screen
- Demonstration/experiment descriptions [DEMO: ...]
- Key formula explanations with visual annotations
- Summary and call-to-action at the end
- Timestamps for each section`,
    course: `Create a detailed lesson plan for a 45-minute class. Include:
- Learning objectives (what students should know/be able to do after)
- Materials needed
- Warm-up activity (5 min)
- Main instruction with timing (25 min) — include demonstrations, examples, board work
- Student activity / group work (10 min)
- Wrap-up and assessment (5 min)
- Homework suggestions
- Differentiation notes for advanced and struggling students`,
  };

  const difficultyText: Record<string, string> = {
    basic: 'Basic level — simple, foundational problems. Suitable for students who are still learning the fundamentals.',
    standard: 'Standard level — aligned with the national curriculum expectations for this grade.',
    advanced: 'Advanced level — deeper problems that require multi-step reasoning and connections between concepts.',
  };

  const systemPrompt = `You are an expert ${lang === 'Estonian' ? 'Estonian' : 'English-speaking'} physics teacher who creates high-quality educational materials for 9th grade physics students in Estonia. You follow the Estonian national curriculum (Eesti riiklik õppekava) precisely.

CURRICULUM REFERENCE:
${CURRICULUM}

SPECIFIC TOPIC: ${curriculumCode} — ${topic}

MATERIAL TYPE: ${type}
${typeInstructions[type] || typeInstructions.exercise}

DIFFICULTY: ${difficultyText[difficulty] || difficultyText.standard}

CRITICAL RULES:
1. Write ALL content in ${lang}
2. Follow the Estonian national curriculum requirements for this specific topic
3. Use correct physics notation and SI units
4. Include proper formulas with LaTeX-style notation where needed
5. Make content age-appropriate for 14-15 year old students
6. Be pedagogically sound — scaffold from simple to complex
7. If exercises: include answer key at the end
8. Use clear formatting with headers, numbered items, and visual separation`;

  const userMessage = prompt
    ? `Generate the material with these additional instructions from the teacher: ${prompt}`
    : `Generate a high-quality ${type} material for topic ${curriculumCode} — ${topic}.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      metadata: { user_id: 'pseudonymised' },
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract a title from the first line if possible
    const lines = content.text.trim().split('\n');
    let title = `${topic} — ${type}`;
    if (lines[0] && (lines[0].startsWith('#') || lines[0].length < 100)) {
      title = lines[0].replace(/^#+\s*/, '').trim();
    }

    return NextResponse.json({ content: content.text, title });
  } catch (err) {
    console.error('Material generation error:', err);
    return NextResponse.json(
      { error: 'AI genereerimine ebaõnnestus. Proovi uuesti.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/materials/generate — save a generated material to the library
 */
export async function PUT(req: NextRequest) {
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
  const { curriculumCode, topic, title, type, language, content } = body;

  if (!curriculumCode || !title || !type || !content) {
    return NextResponse.json({ error: 'Puuduvad kohustuslikud väljad' }, { status: 400 });
  }

  // Save as a learning resource with a data URL containing the content
  const resource = await db.learningResource.create({
    data: {
      curriculumCode,
      title,
      // Store generated content as a data URI so it can be displayed inline
      url: `data:text/plain;generated=true`,
      type,
      language: language || 'et',
      isFree: true,
      provider: 'AI genereeritud',
      description: content.slice(0, 500) + (content.length > 500 ? '...' : ''),
      gradeRange: '9',
      topic: topic || null,
      quality: 3,
      addedBy: user.id,
      verified: false,
    },
  });

  return NextResponse.json({ resource }, { status: 201 });
}
