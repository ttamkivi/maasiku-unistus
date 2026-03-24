import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { ConsentRequestSchema, parseBody } from '@/lib/validation';

const resend = new Resend(process.env.RESEND_API_KEY);

const CONSENT_RATE_LIMIT = 5;           // max emails per IP per window
const CONSENT_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

async function sendConsentEmail(
  parentEmail: string,
  parentName: string | null,
  studentName: string,
  teacherName: string,
  token: string
): Promise<void> {
  const consentUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/consent/${token}`;
  const greeting = parentName ? `Lugupeetud ${parentName}` : 'Lugupeetud lapsevanem';

  const htmlBody = `<!DOCTYPE html>
<html lang="et">
<head><meta charset="UTF-8"><title>Lapsevanema nõusolek — Õpetaja Tagasiside</title></head>
<body style="font-family: 'Open Sans', Arial, sans-serif; background: #F8F3DA; padding: 32px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 36px; box-shadow: 0 2px 12px rgba(28,40,50,0.08);">
    <h1 style="font-size: 22px; color: #1C2832; margin-bottom: 8px;">Õpetaja Tagasiside</h1>
    <div style="height: 3px; background: #DAD0A1; margin-bottom: 24px;"></div>
    <p style="font-size: 15px; color: #1C2832;">${greeting},</p>
    <p style="font-size: 15px; color: #1C2832; line-height: 1.6;">
      Õpetaja <strong>${teacherName}</strong> kasutab Õpetaja Tagasiside platvormi, et anda Teie lapsele
      (<strong>${studentName}</strong>) isikupärastatud tagasisidet kontrolltööde kohta.
    </p>
    <p style="font-size: 15px; color: #1C2832; line-height: 1.6;">
      Selleks on vaja Teie nõusolekut, sest süsteem kasutab tehisintellekti Teie lapse
      töödest tagasiside koostamiseks. <strong>Enne analüüsi asendatakse õpilase nimi pseudonüümiga</strong> — pärisnimi ei lahku meie serverist.
    </p>
    <div style="background: #F8F3DA; border-radius: 6px; padding: 16px; margin: 20px 0; border: 1.5px solid #DAD0A1;">
      <strong style="font-size: 13px; color: #1C2832;">Teie GDPR-i õigused:</strong>
      <ul style="font-size: 13px; color: #1C2832; margin-top: 8px; padding-left: 18px; line-height: 1.7;">
        <li>Õigus tutvuda oma lapse andmetega</li>
        <li>Õigus andmete kustutamisele</li>
        <li>Õigus nõusolek igal ajal tagasi võtta (aadressil fyysika-tagasiside.vercel.app/dashboard/parent)</li>
      </ul>
      <p style="font-size: 12px; color: #1C2832; opacity: 0.7; margin-top: 8px; margin-bottom: 0;">
        Õiguslik alus: GDPR art. 6(1)(a) — nõusolek
      </p>
    </div>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${consentUrl}"
         style="background: #1C2832; color: #fff; font-size: 15px; font-weight: 700;
                padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Vasta nõusolekutaotlusele →
      </a>
    </div>
    <p style="font-size: 12px; color: #1C2832; opacity: 0.6; text-align: center;">
      See link aegub 30 päeva pärast.<br>
      Küsimuste korral võtke ühendust õpetajaga või kirjutage taavi.tamkivi@gmail.com
    </p>
  </div>
</body>
</html>`;

  if (!process.env.RESEND_API_KEY) {
    // Dev-only fallback — logs to console so dev can verify email content
    console.log('[Consent email – RESEND_API_KEY not set, logging to console]');
    console.log(`To: ${parentEmail}\nConsent URL: ${consentUrl}`);
    return;
  }

  await resend.emails.send({
    from: 'Õpetaja Tagasiside <onboarding@resend.dev>',
    to: parentEmail,
    subject: 'Lapsevanema nõusolek — Õpetaja Tagasiside',
    html: htmlBody,
  });
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Pole sisselogitud' }, { status: 401 });
    }

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Seanss on aegunud' }, { status: 401 });
    }

    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Ainult õpetajad saavad nõusolekuid saata' }, { status: 403 });
    }

    const teacherProfile = await db.teacherProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Õpetaja profiil puudub' }, { status: 400 });
    }

    // Rate limit: max 5 consent emails per IP per hour
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const windowStart = new Date(Date.now() - CONSENT_RATE_WINDOW_MS);
    const recentCount = await db.auditLog.count({
      where: {
        action: 'CONSENT_REQUESTED',
        ipAddress: ip,
        timestamp: { gte: windowStart },
      },
    });
    if (recentCount >= CONSENT_RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Liiga palju nõusolekutaotlusi. Proovi tunni aja pärast uuesti.' },
        { status: 429 }
      );
    }

    const raw = await request.json();
    const parsed = parseBody(ConsentRequestSchema, raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { studentId, parentEmail, parentName } = parsed.data;

    const student = await db.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { name: true } } },
    });

    if (!student) {
      return NextResponse.json({ error: 'Õpilast ei leitud' }, { status: 404 });
    }

    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const consentRequest = await db.consentRequest.create({
      data: {
        requestedById: teacherProfile.id,
        studentId,
        parentEmail,
        parentName: parentName ?? null,
        inviteToken,
        expiresAt,
        status: 'PENDING',
      },
    });

    await audit('CONSENT_REQUESTED', {
      userId: session.user.id,
      targetType: 'ConsentRequest',
      targetId: consentRequest.id,
      details: { parentEmail, studentId, studentName: student.user.name },
      consentRequestId: consentRequest.id,
      ip,
      userAgent: request.headers.get('user-agent'),
    });

    await sendConsentEmail(
      parentEmail,
      parentName ?? null,
      student.user.name,
      session.user.name,
      inviteToken
    );

    return NextResponse.json({ ok: true, requestId: consentRequest.id });
  } catch (error) {
    console.error('POST /api/consent/request error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
