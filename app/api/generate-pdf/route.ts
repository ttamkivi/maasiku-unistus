import { NextRequest, NextResponse } from 'next/server';
import { generatePdf } from '@/lib/pdf-generator';
import { FeedbackData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const feedback: FeedbackData = await request.json();
    const buffer = generatePdf(feedback);
    const filename = `tagasiside_${feedback.test_info.class}_${feedback.test_info.student}_${Date.now()}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('PDF error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'PDF genereerimine ebaõnnestus.' }, { status: 500 });
  }
}
