import { NextRequest, NextResponse } from 'next/server';
import { generateDocx } from '@/lib/docx-generator';
import { FeedbackData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const feedback: FeedbackData = await request.json();
    const buffer = await generateDocx(feedback);
    const filename = `tagasiside_${feedback.test_info.class}_${feedback.test_info.student}_${Date.now()}.docx`.replace(/[^a-zA-Z0-9._-]/g, '_');
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('DOCX error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Dokumendi genereerimine ebaõnnestus.' }, { status: 500 });
  }
}
