import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { UserFeedbackSchema, parseBody } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = parseBody(UserFeedbackSchema, raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { type, message } = parsed.data;
    const page = (raw as { page?: string }).page;
    const screenshotUrl = (raw as { screenshotUrl?: string }).screenshotUrl || null;

    // Get userId from session
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('ot_session')?.value;
      if (token) {
        const session = await db.session.findUnique({
          where: { token },
          select: { userId: true, expiresAt: true },
        });
        if (session && session.expiresAt > new Date()) {
          userId = session.userId;
        }
      }
    } catch {}

    // Save to database
    const feedback = await db.userFeedback.create({
      data: {
        userId,
        type,
        message,
        page: page || null,
        screenshotUrl,
        status: 'NEW',
      },
    });

    console.log('[FEEDBACK]', feedback.id, type, message.substring(0, 80));

    return NextResponse.json({ ok: true, id: feedback.id });
  } catch (error) {
    console.error('Feedback route error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
