import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import { uploadPhotoToBlob } from '@/lib/blob';
import { captureServerEvent } from '@/lib/posthog-server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getTeacherSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.teacherProfile) return null;
  return session;
}

// POST /api/tests/[id]/batch-import
// action "identify": send page images, get back proposed student names
// action "confirm": create TestResult records for confirmed assignments
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

    const teacherProfile = session.user.teacherProfile!;
    const { id } = await params;

    const test = await db.test.findFirst({
      where: { id, teacherId: teacherProfile.id, deletedAt: null },
    });
    if (!test) return NextResponse.json({ error: 'Testi ei leitud' }, { status: 404 });

    const body = await request.json();
    const { action } = body as { action: string };

    // ── IDENTIFY: extract student name from each page image ──
    if (action === 'identify') {
      const { pages } = body as { pages: string[] }; // base64 JPEG images

      if (!pages || pages.length === 0) {
        return NextResponse.json({ error: 'Lehed puuduvad' }, { status: 400 });
      }
      if (pages.length > 50) {
        return NextResponse.json({ error: 'Maksimaalselt 50 lehte korraga' }, { status: 400 });
      }

      // Build message content: one image per page
      const imageBlocks: Anthropic.ImageBlockParam[] = pages.map((b64) => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: b64,
        },
      }));

      const textBlock: Anthropic.TextBlockParam = {
        type: 'text',
        text: `These are scanned pages from student test papers. There are ${pages.length} images (numbered 1 to ${pages.length} in the order provided).

For each image, find the student's full name. The name is usually at the top of the page (e.g., "Nimi:", "Õpilane:", or written in a header field). If you cannot find a name, use null.

Return ONLY valid JSON in this exact format, no other text:
{
  "pages": [
    {"index": 0, "name": "Eesnimi Perenimi"},
    {"index": 1, "name": null},
    ...
  ]
}`,
      };

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [...imageBlocks, textBlock],
          },
        ],
      });

      const rawText = response.content.find((b) => b.type === 'text')?.text ?? '{}';
      let parsed: { pages: Array<{ index: number; name: string | null }> };
      try {
        parsed = JSON.parse(rawText);
      } catch {
        // Try to extract JSON from the response
        const match = rawText.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : { pages: [] };
      }

      return NextResponse.json(parsed);
    }

    // ── CONFIRM: create TestResult records ──
    if (action === 'confirm') {
      const { assignments } = body as {
        assignments: Array<{
          studentName: string;
          photo: string; // base64 JPEG for the page
          storageMode?: string;
        }>;
      };

      if (!assignments || assignments.length === 0) {
        return NextResponse.json({ error: 'Ühtegi tulemust pole' }, { status: 400 });
      }

      const created = await Promise.all(
        assignments.map(async (a, i) => {
          const blobResult = await uploadPhotoToBlob(a.photo, `batch-${Date.now()}-${i}.jpg`);
          const photoData = blobResult
            ? { storageMode: 'blob', storageKey: blobResult.url, base64Data: null as string | null }
            : { storageMode: 'local_only', base64Data: a.photo };

          return db.testResult.create({
            data: {
              testId: id,
              studentName: a.studentName.trim(),
              status: 'UPLOADED',
              storageMode: blobResult ? 'blob' : (a.storageMode || 'local_only'),
              uploadedAt: new Date(),
              photos: {
                create: [photoData],
              },
            },
            select: { id: true, studentName: true },
          });
        })
      );

      captureServerEvent(session.user.id, 'scan_uploaded', { testId: id, count: created.length });
      return NextResponse.json({ created }, { status: 201 });
    }

    return NextResponse.json({ error: 'Tundmatu toiming' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/tests/[id]/batch-import error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
