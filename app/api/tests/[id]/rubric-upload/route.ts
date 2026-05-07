import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import { uploadPhotoToBlob } from '@/lib/blob';
import { db } from '@/lib/db';

// ── Vercel runtime config ────────────────────────────────────────────────────
// AI calls can take 20–60s (4-agent pipeline). Default 10s would 504.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function getTeacherSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.teacherProfile && session.user.role !== 'SUPERADMIN') return null;
  return session;
}

/**
 * Extract text from an uploaded rubric file using Claude Vision.
 * Supports images (JPEG, PNG) only. PDFs should be converted to images first.
 */
async function extractTextFromRubric(base64Data: string, mediaType: string): Promise<string> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Validate media type - only support JPEG and PNG
  if (mediaType === 'application/pdf') {
    throw new Error('PDF-faile tuleb enne saata pildiks. Kasutage JPEG või PNG formaati.');
  }

  const supportedTypes = ['image/jpeg', 'image/png'];
  if (!supportedTypes.includes(mediaType)) {
    throw new Error(`Mitttoetatud failitüüp: ${mediaType}. Kasutage JPEG või PNG.`);
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png',
              data: base64Data,
            },
          },
          {
            type: 'text',
            text: 'Palun ekstraheerige kõik tekst sellest dokumentist. Tagastage ainult ekstraheeritud tekst, säilitades struktuuri.',
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Ootamatu vastus Claude API-st');
  }

  return content.text;
}

// POST /api/tests/[id]/rubric-upload
// Upload a rubric file (image or PDF), extract text with Claude Vision,
// and return the Vercel Blob URL + extracted text
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await getTeacherSession(token);
    if (!session) return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });

    const { id } = await params;

    // Verify test exists and belongs to this teacher
    const test = await db.test.findFirst({
      where: { id, teacherId: session.user.teacherProfile!.id },
    });
    if (!test) return NextResponse.json({ error: 'Testi ei leitud' }, { status: 404 });

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Fail on kohustuslik' }, { status: 400 });
    }

    // Validate file type - only JPEG and PNG are supported (PDFs can be scanned as images)
    const supportedMimeTypes = ['image/jpeg', 'image/png'];
    if (!supportedMimeTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Mittotoetatud failitüüp. Kasutage JPEG või PNG pildifaile.',
      }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'Fail on liiga suur. Maksimaalne suurus on 10MB.',
      }, { status: 400 });
    }

    // Read file as base64
    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');

    // Extract text from the rubric file using Claude Vision
    let extractedText: string;
    try {
      extractedText = await extractTextFromRubric(base64Data, file.type);
    } catch (err) {
      console.error('Error extracting text from rubric:', err);
      return NextResponse.json({
        error: err instanceof Error ? err.message : 'Tekstide ekstraheerimise viga',
      }, { status: 500 });
    }

    // Upload to Vercel Blob
    const filename = `rubric-${id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const blobResult = await uploadPhotoToBlob(base64Data, filename.replace(/\.[^.]+$/, '.jpg'));

    // If blob upload fails (e.g., no token in dev), return without blob URL
    const blobUrl = blobResult?.url || null;

    return NextResponse.json(
      {
        url: blobUrl,
        extractedText: extractedText,
        fileName: file.name,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/tests/[id]/rubric-upload error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
