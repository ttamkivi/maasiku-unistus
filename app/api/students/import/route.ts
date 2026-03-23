import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { parseBody } from '@/lib/validation';

const ALLOWED_ROLES = ['TEACHER', 'SCHOOL_ADMIN'] as const;

const ImportRowSchema = z.object({
  name: z.string().trim().min(2, 'Nimi peab olema vähemalt 2 tähemärki').max(100),
  email: z.string().trim().toLowerCase().email('Vigane e-posti aadress').max(254),
  class: z.string().trim().max(50).optional(),
});

const ImportBodySchema = z.object({
  rows: z
    .array(ImportRowSchema)
    .min(1, 'Vähemalt üks rida on kohustuslik')
    .max(200, 'Maksimaalselt 200 rida korraga'),
});

async function getAuthorisedSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          teacherProfile: { include: { schools: true } },
          adminProfile: true,
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) return null;
  return session;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('mu_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await getAuthorisedSession(token);
    if (!session) return NextResponse.json({ error: 'Juurdepääs keelatud' }, { status: 403 });

    const { user } = session;

    // Determine which school to attach students to (first school for teacher, admin's school)
    let schoolId: string | null = null;
    if (user.teacherProfile) {
      const firstSchool = user.teacherProfile.schools[0];
      schoolId = firstSchool?.schoolId ?? null;
    } else if (user.adminProfile) {
      schoolId = user.adminProfile.schoolId ?? null;
    }

    const raw = await request.json();
    const parsed = parseBody(ImportBodySchema, raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { rows } = parsed.data;

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const existing = await db.user.findUnique({ where: { email: row.email } });
        if (existing) {
          skipped++;
          continue;
        }

        // Create user with a random temp password — student must reset via forgot-password flow
        const tempPassword = crypto.randomUUID();

        const newUser = await db.user.create({
          data: {
            name: row.name,
            email: row.email,
            password: tempPassword, // stored as plaintext temp; student resets before first real use
            role: 'STUDENT',
          },
        });

        await db.studentProfile.create({
          data: {
            userId: newUser.id,
            schoolId: schoolId ?? null,
          },
        });

        imported++;
      } catch (rowErr) {
        const msg = rowErr instanceof Error ? rowErr.message : String(rowErr);
        errors.push(`${row.email}: ${msg}`);
      }
    }

    await audit('STUDENTS_IMPORTED', {
      userId: user.id,
      targetType: 'StudentProfile',
      details: { imported, skipped, errorCount: errors.length, schoolId },
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({ imported, skipped, errors }, { status: 201 });
  } catch (error) {
    console.error('POST /api/students/import error:', error);
    return NextResponse.json({ error: 'Serveriviga. Proovi uuesti.' }, { status: 500 });
  }
}
