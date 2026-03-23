import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import { db } from '@/lib/db';

async function sendConsentEmail(
  parentEmail: string,
  parentName: string | null,
  studentName: string,
  teacherName: string,
  token: string
): Promise<void> {
  const consentUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/consent/${token}`;
  const greeting = parentName ? `Lugupeetud ${parentName}` : 'Lugupeetud lapsevanem';

  const htmlBody = `
<!DOCTYPE html>
<html lang="et">
<head><meta charset="UTF-8"><title>Lapsevanema nõusolek — Maasiku Unistus</title></head>
<body style="font-family: 'Open Sans', Arial, sans-serif; background: #F8F3DA; padding: 32px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 36px; box-shadow: 0 2px 12px rgba(28,40,50,0.08);">
    <h1 style="font-size: 22px; color: #1C2832; margin-bottom: 8px;">Maasiku Unistus</h1>
    <div style="height: 3px; background: #DAD0A1; margin-bottom: 24px;"></div>

    <p style="font-size: 15px; color: #1C2832;">${greeting},</p>

    <p style="font-size: 15px; color: #1C2832; line-height: 1.6;">
      Õpetaja <strong>${teacherName}</strong> kasutab Maasiku Unistus platvormi, et anda Teie lapsele
      (<strong>${studentName}</strong>) isikupärastatud tagasisidet kontrolltööde kohta.
    </p>

    <p style="font-size: 15px; color: #1C2832; line-height: 1.6;">
      Selleks on vaja Teie nõusolekut, sest süsteem kasutab tehisintellekti Teie lapse
      töödest tagasiside koostamiseks. Andmeid säilitatakse turvaliselt ja ei jagata
      kolmandate osapooltega.
    </p>

    <div style="background: #F8F3DA; border-radius: 6px; padding: 16px; margin: 20px 0; border: 1.5px solid #DAD0A1;">
      <strong style="font-size: 13px; color: #1C2832;">Teie GDPR-i õigused:</strong>
      <ul style="font-size: 13px; color: #1C2832; margin-top: 8px; padding-left: 18px; line-height: 1.7;">
        <li>Õigus tutvuda oma lapse andmetega</li>
        <li>Õigus andmete kustutamisele</li>
        <li>Õigus nõusolek igal ajal tagasi võtta</li>
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
      Kui Teil on küsimusi, võtke ühendust õpetajaga.
    </p>
  </div>
</body>
</html>`;

  const textBody = `${greeting},

Õpetaja ${teacherName} kasutab Maasiku Unistus platvormi, et anda Teie lapsele (${studentName}) isikupärastatud tagasisidet kontrolltööde kohta.

Selleks on vaja Teie nõusolekut. Tehisintellekt analüüsib Teie lapse töid ja saadab tagasiside õpetajale. Andmeid säilitatakse turvaliselt.

Teie GDPR-i õigused: juurdepääs andmetele, andmete kustutamine, nõusolek igal ajal tagasi võtta.
Õiguslik alus: GDPR art. 6(1)(a)

Vasta nõusolekutaotlusele: ${consentUrl}

Link aegub 30 päeva pärast.`;

  const smtpConfigured =
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (!smtpConfigured) {
    console.log('[Consent email - SMTP not configured, logging to console]');
    console.log(`To: ${parentEmail}`);
    console.log(`Subject: Lapsevanema nõusolek — Maasiku Unistus`);
    console.log(`Consent URL: ${consentUrl}`);
    console.log(textBody);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Maasiku Unistus" <${process.env.SMTP_USER}>`,
    to: parentEmail,
    subject: 'Lapsevanema nõusolek — Maasiku Unistus',
    text: textBody,
    html: htmlBody,
  });
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('mu_session')?.value;

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

    const body = await request.json();
    const { studentId, parentEmail, parentName } = body as {
      studentId: string;
      parentEmail: string;
      parentName?: string;
    };

    if (!studentId || !parentEmail) {
      return NextResponse.json(
        { error: 'studentId ja parentEmail on kohustuslikud' },
        { status: 400 }
      );
    }

    const student = await db.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { name: true } } },
    });

    if (!student) {
      return NextResponse.json({ error: 'Õpilast ei leitud' }, { status: 404 });
    }

    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const consentRequest = await db.parentConsentRequest.create({
      data: {
        teacherId: teacherProfile.id,
        studentId,
        parentEmail,
        parentName: parentName ?? null,
        inviteToken,
        expiresAt,
        status: 'PENDING',
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CONSENT_REQUESTED',
        targetType: 'ParentConsentRequest',
        targetId: consentRequest.id,
        details: JSON.stringify({ parentEmail, studentId, studentName: student.user.name }),
        consentRequestId: consentRequest.id,
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
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
