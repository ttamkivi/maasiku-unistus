import { NextRequest, NextResponse } from 'next/server';
import { analyzeTest } from '@/lib/claude';
import { db } from '@/lib/db';

const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  if (record.count >= 10) return false;
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Liiga palju päringuid. Palun oota minut aega.' }, { status: 429 });
  }
  try {
    const body = await request.json();
    const { klass, teema, opilane, images, testResultId, rubric, answerKey } = body;
    if (!klass || !teema || !opilane || !images || images.length === 0) {
      return NextResponse.json({ error: 'Puuduvad kohustuslikud andmed.' }, { status: 400 });
    }
    if (images.length > 8) {
      return NextResponse.json({ error: 'Maksimaalselt 8 fotot lubatud.' }, { status: 400 });
    }
    const feedback = await analyzeTest(klass, teema, opilane, images, rubric, answerKey);

    if (testResultId) {
      // Find the TestResult to get testId for redirect
      const existingResult = await db.testResult.findUnique({
        where: { id: testResultId },
        select: { testId: true },
      });

      if (existingResult) {
        await db.testResult.update({
          where: { id: testResultId },
          data: {
            rawFeedback: JSON.stringify(feedback),
            status: 'DRAFT',
            analyzedAt: new Date(),
          },
        });

        return NextResponse.json({
          ...feedback,
          testResultId,
          testId: existingResult.testId,
        });
      }
    }

    return NextResponse.json(feedback);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Analysis error FULL:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
