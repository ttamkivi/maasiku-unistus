import { createHash, randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { Role } from '@/lib/generated/prisma/client';

const SMART_ID_URL =
  process.env.SK_SMART_ID_URL || 'https://sid.demo.sk.ee/smart-id-rp/v2';
const MOBILE_ID_URL =
  process.env.SK_MOBILE_ID_URL || 'https://tsp.demo.sk.ee/mid-api';
const RP_UUID =
  process.env.SK_RP_UUID || '00000000-0000-0000-0000-000000000000';
const RP_NAME = process.env.SK_RP_NAME || 'DEMO';

function generateHashData(): { hashBase64: string; verificationCode: string } {
  const randomData = randomBytes(64);
  const hashBytes = createHash('sha256').update(randomData).digest();
  const hashBase64 = hashBytes.toString('base64');
  const code = ((hashBytes[0] << 8) | hashBytes[1]) % 10000;
  const verificationCode = code.toString().padStart(4, '0');
  return { hashBase64, verificationCode };
}

function parseCertSubject(subject: string): {
  personalCode: string;
  name: string;
} {
  // Format examples:
  // Smart-ID:  "SERIALNUMBER=30303039914, CN=TESTNUMBER,NOEMAIL,30303039914, C=EE"
  // ID-card DN: "/serialNumber=38001010002/CN=JÕEORG,JAAK-KRISTJAN,38001010002/C=EE"

  let personalCode = '';
  let name = '';

  // Try SERIALNUMBER= (Smart-ID / Mobile-ID cert subject)
  const serialMatch = subject.match(/SERIALNUMBER=([0-9]{11})/i);
  if (serialMatch) {
    personalCode = serialMatch[1];
  }

  // Try CN=LASTNAME,FIRSTNAME,PERSONALCODE or CN=FIRSTNAME,LASTNAME,PERSONALCODE
  const cnMatch = subject.match(/CN=([^,/]+(?:,[^,/=]+)*)/i);
  if (cnMatch) {
    const cnParts = cnMatch[1].split(',').map((p) => p.trim());
    // Last part is often the personal code repeated; take first two parts as name
    const nameParts = cnParts.filter((p) => !/^\d{11}$/.test(p) && p !== 'NOEMAIL');
    if (nameParts.length >= 1) {
      // Smart-ID format: "TESTNUMBER,NOEMAIL,30303039914" — not a real name
      // Real format: "TAMM,MARI-LIIS,38001010002"
      name = nameParts.join(' ');
    }
  }

  // If personalCode not found via SERIALNUMBER, try last CN segment
  if (!personalCode) {
    const cnMatch2 = subject.match(/CN=([^/]+)/i);
    if (cnMatch2) {
      const parts = cnMatch2[1].split(',').map((p) => p.trim());
      const codeCandidate = parts.find((p) => /^\d{11}$/.test(p));
      if (codeCandidate) personalCode = codeCandidate;
    }
  }

  return { personalCode, name };
}

function formatName(rawName: string): string {
  // Convert "MARI-LIIS TAMM" → "Mari-Liis Tamm"
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

// ─── Smart-ID ────────────────────────────────────────────────────────────────

export async function startSmartIdAuth(
  personalCode: string
): Promise<{ sessionId: string; verificationCode: string }> {
  const { hashBase64, verificationCode } = generateHashData();

  const response = await fetch(
    `${SMART_ID_URL}/authentication/pno/EE/${personalCode}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        relyingPartyUUID: RP_UUID,
        relyingPartyName: RP_NAME,
        certificateLevel: 'QUALIFIED',
        allowedInteractionsOrder: [
          {
            type: 'displayTextAndPIN',
            displayText60: 'Logi sisse Õpetaja Tagasiside',
          },
        ],
        hash: hashBase64,
        hashType: 'SHA256',
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    if (response.status === 404) {
      throw new Error('Isikukoodiga kontot ei leitud Smart-ID süsteemis');
    }
    if (response.status === 400) {
      throw new Error('Vigane isikukood');
    }
    throw new Error(`Smart-ID viga: ${response.status}${errText ? ' – ' + errText : ''}`);
  }

  const data = await response.json();
  return { sessionId: data.sessionID, verificationCode };
}

export async function pollSmartIdSession(sessionId: string): Promise<{
  state: 'RUNNING' | 'COMPLETE' | 'ERROR';
  name?: string;
  personalCode?: string;
}> {
  const response = await fetch(
    `${SMART_ID_URL}/session/${sessionId}?timeoutMs=3000`
  );

  if (!response.ok) {
    return { state: 'ERROR' };
  }

  const data = await response.json();

  if (data.state === 'RUNNING') {
    return { state: 'RUNNING' };
  }

  if (data.state === 'COMPLETE') {
    if (data.result?.endResult !== 'OK') {
      return { state: 'ERROR' };
    }
    const subject: string = data.cert?.subject || '';
    const { personalCode, name } = parseCertSubject(subject);
    return {
      state: 'COMPLETE',
      personalCode,
      name: formatName(name),
    };
  }

  return { state: 'ERROR' };
}

// ─── Mobile-ID ───────────────────────────────────────────────────────────────

export async function startMobileIdAuth(
  phoneNumber: string,
  personalCode: string
): Promise<{ sessionId: string; challengeCode: string }> {
  const { hashBase64, verificationCode: challengeCode } = generateHashData();

  const response = await fetch(`${MOBILE_ID_URL}/authentication`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      relyingPartyUUID: RP_UUID,
      relyingPartyName: RP_NAME,
      phoneNumber,
      nationalIdentityNumber: personalCode,
      language: 'EST',
      displayText: 'Logi sisse',
      hash: hashBase64,
      hashType: 'SHA256',
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    if (response.status === 404) {
      throw new Error('Telefoninumbri või isikukoodiga kontot ei leitud Mobiil-ID süsteemis');
    }
    if (response.status === 400) {
      throw new Error('Vigane telefoninumber või isikukood');
    }
    throw new Error(`Mobiil-ID viga: ${response.status}${errText ? ' – ' + errText : ''}`);
  }

  const data = await response.json();
  return { sessionId: data.sessionID, challengeCode };
}

export async function pollMobileIdSession(sessionId: string): Promise<{
  state: 'RUNNING' | 'COMPLETE' | 'ERROR';
  name?: string;
  personalCode?: string;
}> {
  const response = await fetch(
    `${MOBILE_ID_URL}/authentication/session/${sessionId}?timeoutMs=3000`
  );

  if (!response.ok) {
    return { state: 'ERROR' };
  }

  const data = await response.json();

  if (data.state === 'RUNNING') {
    return { state: 'RUNNING' };
  }

  if (data.state === 'COMPLETE') {
    if (data.result !== 'OK') {
      return { state: 'ERROR' };
    }
    const subject: string = data.cert?.subject || '';
    const { personalCode, name } = parseCertSubject(subject);
    return {
      state: 'COMPLETE',
      personalCode,
      name: formatName(name),
    };
  }

  return { state: 'ERROR' };
}

// ─── Find or create user ─────────────────────────────────────────────────────

export async function findOrCreateEidUser(
  personalCode: string,
  name: string
) {
  const existing = await db.user.findUnique({ where: { personalCode } });
  if (existing) return existing;

  const syntheticEmail = `${personalCode}@eid.opetajatagasiside.ee`;

  const user = await db.user.create({
    data: {
      email: syntheticEmail,
      name: name || `Kasutaja ${personalCode}`,
      personalCode,
      role: Role.TEACHER,
      password: null,
      teacherProfile: {
        create: {},
      },
    },
  });

  return user;
}
