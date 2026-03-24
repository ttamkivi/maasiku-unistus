import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findOrCreateEidUser } from '@/lib/eid';
import { db } from '@/lib/db';

function parseDN(dn: string): { personalCode: string; name: string } {
  // Format: "/serialNumber=38001010002/CN=JÕEORG,JAAK-KRISTJAN,38001010002/C=EE"
  // or comma-separated: "serialNumber=38001010002, CN=JÕEORG JAAK-KRISTJAN, C=EE"
  let personalCode = '';
  let name = '';

  const serialMatch = dn.match(/serialNumber=([0-9]{11})/i);
  if (serialMatch) {
    personalCode = serialMatch[1];
  }

  const cnMatch = dn.match(/CN=([^/,]+(?:[^/]*?)?)(?:\/|,\s*[A-Z]+=|$)/i);
  if (cnMatch) {
    const cnValue = cnMatch[1].trim();
    // CN might be "JÕEORG,JAAK-KRISTJAN,38001010002" or "JÕEORG JAAK-KRISTJAN"
    const parts = cnValue.split(',').map((p) => p.trim());
    const nameParts = parts.filter((p) => !/^\d{11}$/.test(p));
    name = nameParts.join(' ');
  }

  if (!personalCode) {
    // Try to find 11-digit sequence as fallback
    const codeMatch = dn.match(/\b([3-6]\d{10})\b/);
    if (codeMatch) personalCode = codeMatch[1];
  }

  return { personalCode, name };
}

function formatName(rawName: string): string {
  return rawName
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('-')
    )
    .join(' ');
}

export async function GET(request: NextRequest) {
  try {
    const dnHeader =
      request.headers.get('SSL_CLIENT_S_DN') ||
      request.headers.get('ssl_client_s_dn') ||
      request.headers.get('x-ssl-client-s-dn');

    const verifyHeader =
      request.headers.get('SSL_CLIENT_VERIFY') ||
      request.headers.get('ssl_client_verify') ||
      request.headers.get('x-ssl-client-verify');

    if (!dnHeader) {
      return NextResponse.json(
        {
          error:
            'ID-kaardi autentimine pole konfigureeritud. Võtke ühendust administraatoriga.',
        },
        { status: 503 }
      );
    }

    if (verifyHeader && verifyHeader !== 'SUCCESS') {
      return NextResponse.json(
        { error: 'ID-kaardi sertifikaat ei ole kehtiv.' },
        { status: 401 }
      );
    }

    const { personalCode, name } = parseDN(dnHeader);

    if (!personalCode) {
      return NextResponse.json(
        { error: 'Isikukoodi ei õnnestunud sertifikaadist lugeda.' },
        { status: 400 }
      );
    }

    const user = await findOrCreateEidUser(personalCode, formatName(name));

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.session.create({
      data: { userId: user.id, token, expiresAt },
    });

    const cookieStore = await cookies();
    cookieStore.set('ot_session', token, {
      httpOnly: true,
      expires: expiresAt,
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('ID-card auth error:', error);
    return NextResponse.json(
      { error: 'Serveriviga. Proovi uuesti.' },
      { status: 500 }
    );
  }
}
