import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { analyzeTest } from '@/lib/claude';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

// ── Rate limiter with cleanup ────────────────────────────────────────────────
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

// Clean up stale entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of requestCounts) {
    if (now > val.resetTime) requestCounts.delete(key);
  }
}, 5 * 60_000);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count++;
  return true;
}

// ── Zod input validation ─────────────────────────────────────────────────────
const AnalyzeSchema = z.object({
  klass: z.string().trim().min(1, 'Klass on kohustuslik').max(100),
  teema: z.string().trim().min(1, 'Teema on kohustuslik').max(500),
  opilane: z.string().trim().min(1, 'Õpilase nimi on kohustuslik').max(200),
  images: z.array(z.string().min(1)).min(1, 'Vähemalt üks foto on kohustuslik').max(8, 'Maksimaalselt 8 fotot lubatud'),
  testResultId: z.string().max(36).optional(),
  rubric: z.string().max(5000).optional(),
  answerKey: z.string().max(5000).optional(),
});

// ── Max base64 image size: ~10 MB per image ──────────────────────────────────
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Liiga palju päringuid. Palun oota minut aega.' }, { status: 429 });
  }

  try {
    // ── 1. Authentication ──────────────────────────────────────────────────
    const cookieStore = await cookies();
    const token = cookieStore.get('mu_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Palun logi sisse.' }, { status: 401 });
    }

    const session = await db.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            teacherProfile: { select: { id: true } },
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Sessioon on aegunud. Palun logi uuesti sisse.' }, { status: 401 });
    }

    const { user } = session;

    // Only teachers and admins may trigger AI analysis
    if (!['TEACHER', 'SCHOOL_ADMIN', 'ADMIN', 'SUPERADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Ainult õpetajad saavad analüüsi käivitada.' }, { status: 403 });
    }

    // ── 2. Input validation (Zod) ──────────────────────────────────────────
    const body = await request.json();
    const parsed = AnalyzeSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json({ error: firstIssue?.message ?? 'Vigane sisend.' }, { status: 400 });
    }

    const { klass, teema, opilane, images, testResultId, rubric, answerKey } = parsed.data;

    // Validate image sizes to prevent DoS
    for (const img of images) {
      if (img.length > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: 'Foto on liiga suur. Maksimaalne suurus on 10 MB.' }, { status: 400 });
      }
    }

    // ── 3. Consent check (when linked to a test result) ────────────────────
    if (testResultId) {
      const existingResult = await db.testResult.findUnique({
        where: { id: testResultId },
        select: {
          testId: true,
          studentId: true,
          test: { select: { teacherId: true, subjectId: true } },
        },
      });

      // Verify teacher owns this test result
      if (!existingResult) {
        return NextResponse.json({ error: 'Testi tulemust ei leitud.' }, { status: 404 });
      }

      if (existingResult.test.teacherId !== user.teacherProfile?.id && !['ADMIN', 'SUPERADMIN'].includes(user.role)) {
        return NextResponse.json({ error: 'Sul pole õigust seda tulemust analüüsida.' }, { status: 403 });
      }

      // Check parental consent if student is linked
      if (existingResult.studentId) {
        const { hasAIConsent } = await import('@/lib/consent');
        const hasConsent = await hasAIConsent(existingResult.studentId, existingResult.test.subjectId);
        if (!hasConsent) {
          await audit('AI_ANALYSIS_BLOCKED_NO_CONSENT', {
            userId: user.id,
            targetType: 'TestResult',
            targetId: testResultId,
            details: { studentId: existingResult.studentId, reason: 'no_parent_consent' },
            ip,
          });
          return NextResponse.json({
            error: 'Sellel õpilasel puudub lapsevanema nõusolek AI analüüsiks. Palun küsi enne nõusolekut.',
          }, { status: 403 });
        }
      }
    }

    // ── 4. Run AI analysis ─────────────────────────────────────────────────
    const feedback = await analyzeTest(klass, teema, opilane, images, rubric, answerKey);

    await audit('AI_ANALYSIS_COMPLETED', {
      userId: user.id,
      targetType: 'TestResult',
      targetId: testResultId,
      details: { klass, teema },
      ip,
    });

    // ── 5. Save result if linked to TestResult ─────────────────────────────
    if (testResultId) {
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
    console.error('Analysis error:', error instanceof Error ? error.message : String(error));
    // Never expose internal error details to the client
    return NextResponse.json({
      error: 'Analüüsi käigus tekkis viga. Palun proovi uuesti. Kui probleem püsib, võta ühendust tugiteenusega.',
    }, { status: 500 });
  }
}
