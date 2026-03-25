// Placeholder — PDF generation removed, using DOCX endpoint instead
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Use /api/generate-docx instead' }, { status: 410 });
}
