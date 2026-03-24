import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const invites = await db.inviteToken.findMany({
      where: { createdBy: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const result = invites.map((inv) => ({
      id: inv.id,
      name: inv.name,
      email: inv.email,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      status: inv.usedAt
        ? 'used'
        : inv.expiresAt < now
          ? 'expired'
          : 'pending',
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/invites error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const allowedRoles = ['TEACHER', 'SCHOOL_ADMIN', 'SUPERADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Ainult õpetajad saavad kutseid saata' }, { status: 403 });
    }

    const body = await request.json() as { name?: string; email?: string };
    const name = (body.name ?? '').trim();
    const email = (body.email ?? '').trim().toLowerCase();

    if (!name) return NextResponse.json({ error: 'Nimi on kohustuslik' }, { status: 400 });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Kehtiv e-posti aadress on kohustuslik' }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'See kasutaja on juba registreeritud' }, { status: 409 });
    }

    const now = new Date();
    const pendingInvite = await db.inviteToken.findFirst({
      where: {
        email,
        usedAt: null,
        expiresAt: { gt: now },
      },
    });
    if (pendingInvite) {
      return NextResponse.json({ error: 'Kutse on juba saadetud sellele e-postile' }, { status: 409 });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const invite = await db.inviteToken.create({
      data: {
        email,
        name,
        role: 'TEACHER',
        token,
        createdBy: user.id,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://fyysika-tagasiside.vercel.app';
    const inviterName = user.name || 'Kolleeg';

    await resend.emails.send({
      from: 'Maasiku Unistus <onboarding@resend.dev>',
      to: email,
      subject: `${inviterName} kutsub sind Maasiku Unistust proovima`,
      html: `<div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1C2832; font-size: 20px;">Tere, ${name}!</h2>
  <p style="color: #374151; font-size: 15px; line-height: 1.6;">
    ${inviterName} kutsub sind proovima <strong>Maasiku Unistust</strong> — AI-põhist tagasiside platvormi,
    mis aitab õpetajatel kontrolltööde tagasisidet kiiremini ja põhjalikumalt anda.
  </p>
  <p style="color: #374151; font-size: 15px; line-height: 1.6;">
    Registreeru ja proovi tasuta:
  </p>
  <a href="${baseUrl}/auth/register?invite=${token}&email=${encodeURIComponent(email)}"
     style="display: inline-block; background: #1C2832; color: #F8F3DA; padding: 12px 24px;
            text-decoration: none; font-weight: 700; font-size: 15px; margin: 16px 0;">
    Loo konto →
  </a>
  <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
    See kutse kehtib 7 päeva. Kui sa ei soovi liituda, ignoreeri seda kirja.
  </p>
</div>`,
    });

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        name: invite.name,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error('POST /api/invites error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
