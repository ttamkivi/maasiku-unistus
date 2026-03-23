import { NextRequest, NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { db } from '@/lib/db';
import { UserFeedbackSchema, parseBody } from '@/lib/validation';
import fs from 'fs';
import path from 'path';

interface FeedbackEntry {
  id: string;
  type: string;
  message: string;
  email?: string;
  userId?: string;
  page?: string;
  referer?: string;
  timestamp: string;
}

async function appendToFile(entry: FeedbackEntry) {
  const filePath = '/tmp/mu-feedback.json';
  let existing: FeedbackEntry[] = [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    existing = JSON.parse(raw);
  } catch {}
  existing.push(entry);
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8');
}

async function trySendEmail(entry: FeedbackEntry) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = parseInt(process.env.SMTP_PORT ?? '587', 10);

  if (!smtpHost || !smtpUser || !smtpPass) return;

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: smtpUser,
      to: 'taavi.tamkivi@gmail.com',
      subject: `[Maasiku Unistus] Tagasiside: ${entry.type}`,
      text: [
        `Tüüp: ${entry.type}`,
        `Sõnum: ${entry.message}`,
        `E-post: ${entry.email ?? '—'}`,
        `Kasutaja ID: ${entry.userId ?? '—'}`,
        `Leht: ${entry.page ?? entry.referer ?? '—'}`,
        `Aeg: ${entry.timestamp}`,
      ].join('\n'),
    });
  } catch (err) {
    console.error('Feedback email send failed:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = parseBody(UserFeedbackSchema, raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { type, message, email } = parsed.data;
    const page = (raw as { page?: string }).page;

    // Get userId from session
    let userId: string | undefined;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('mu_session')?.value;
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

    // Get referer from request headers
    const headersList = await headers();
    const referer = headersList.get('referer') ?? undefined;

    const entry: FeedbackEntry = {
      id: crypto.randomUUID(),
      type,
      message,
      email: email || undefined,
      userId,
      page: page ?? undefined,
      referer,
      timestamp: new Date().toISOString(),
    };

    // Log to console always
    console.log('[FEEDBACK]', JSON.stringify(entry, null, 2));

    // Append to file
    try {
      await appendToFile(entry);
    } catch (err) {
      console.error('Feedback file write failed:', err);
    }

    // Try email (non-blocking)
    trySendEmail(entry).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Feedback route error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
