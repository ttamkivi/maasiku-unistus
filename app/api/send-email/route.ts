import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { generateDocx } from '@/lib/docx-generator';
import { FeedbackData } from '@/lib/types';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { feedback, email, note }: { feedback: FeedbackData; email: string; note?: string } = await request.json();
    if (!email || !feedback) {
      return NextResponse.json({ error: 'E-post ja tagasiside on kohustuslikud.' }, { status: 400 });
    }
    const buffer = await generateDocx(feedback);
    const base64 = buffer.toString('base64');
    const subject = `Füüsika tagasiside: ${feedback.test_info.class} - ${feedback.test_info.topic} - ${feedback.test_info.student}`;
    const bodyText = `Tere,\n\nLisatud on füüsika kontrolltöö tagasiside. See tagasiside on loodud AI abil õpetaja juhendamisel.\n\n${feedback.test_info.class} | ${feedback.test_info.topic} | ${feedback.test_info.student}${feedback.test_info.score ? ` | ${feedback.test_info.score}` : ''}${note ? `\n\nÕpetaja märkus: ${note}` : ''}\n\nTagasiside fail on lisatud manusena (.docx).\n\nFüüsika Tagasiside rakendus`;
    const filename = `tagasiside_${feedback.test_info.class}_${feedback.test_info.student}.docx`.replace(/[^a-zA-Z0-9._-]/g, '_');
    await resend.emails.send({
      from: 'Füüsika Tagasiside <onboarding@resend.dev>',
      to: email,
      subject,
      text: bodyText,
      attachments: [{ filename, content: base64 }],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'E-kirja saatmine ebaõnnestus.' }, { status: 500 });
  }
}
