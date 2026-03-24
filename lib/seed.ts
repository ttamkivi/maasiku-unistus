import { db } from './db';
import { hashPassword } from './auth';
import { Role } from './generated/prisma/client';
import { randomUUID } from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// REFERENCE DATA
// ══════════════════════════════════════════════════════════════════════════════

const schools = [
  { name: 'Tallinna Reaalkool', type: 'gümnaasium', district: 'Kesklinn' },
  { name: 'Demo Kool',          type: 'põhikool',   district: 'Kesklinn' },
];

const subjects = [
  // ── Loodusained (riiklik õppekava: PÕK + GÕK) ──────────────────────────────
  { name: 'Loodusõpetus', category: 'loodusained', gradeLevels: '1-6' },
  { name: 'Loodusained (integreeritud)', category: 'loodusained', gradeLevels: '4-6' },
  { name: 'Bioloogia', category: 'loodusained', gradeLevels: '7-12' },
  { name: 'Füüsika', category: 'loodusained', gradeLevels: '7-12' },
  { name: 'Keemia', category: 'loodusained', gradeLevels: '8-12' },
  { name: 'Geograafia', category: 'loodusained', gradeLevels: '7-12' },
  // GÕK valikkursused – loodusained
  { name: 'Elu keemia', category: 'loodusained', gradeLevels: '10-12' },
  { name: 'Geenitehnoloogia', category: 'loodusained', gradeLevels: '10-12' },
  { name: 'Geoinformaatika', category: 'loodusained', gradeLevels: '10-12' },
  { name: 'Kosmoloogia', category: 'loodusained', gradeLevels: '10-12' },
  { name: 'Loodusvarad ja ühiskond', category: 'loodusained', gradeLevels: '10-12' },
  { name: 'Loodusteadused ja ühiskond', category: 'loodusained', gradeLevels: '10-12' },

  // ── Matemaatika (PÕK + GÕK) ─────────────────────────────────────────────────
  { name: 'Matemaatika', category: 'matemaatika', gradeLevels: '1-9' },
  { name: 'Matemaatika (kitsas)', category: 'matemaatika', gradeLevels: '10-12' },
  { name: 'Matemaatika (lai)', category: 'matemaatika', gradeLevels: '10-12' },
  { name: 'Informaatika', category: 'matemaatika', gradeLevels: '4-12' },
  { name: 'Programmeerimine', category: 'matemaatika', gradeLevels: '4-12' },
  { name: 'Male', category: 'matemaatika', gradeLevels: '1-6' },

  // ── Keel ja kirjandus (PÕK + GÕK) ───────────────────────────────────────────
  { name: 'Eesti keel', category: 'keel ja kirjandus', gradeLevels: '1-9' },
  { name: 'Kirjandus', category: 'keel ja kirjandus', gradeLevels: '4-9' },
  { name: 'Eesti keel ja kirjandus', category: 'keel ja kirjandus', gradeLevels: '10-12' },
  { name: 'Eesti keel teise keelena', category: 'keel ja kirjandus', gradeLevels: '1-12' },
  { name: 'Draamaõpetus', category: 'keel ja kirjandus', gradeLevels: '4-9' },
  { name: 'Meedia ja mõjutamine', category: 'keel ja kirjandus', gradeLevels: '10-12' },
  { name: 'Eesti kirjandus (valik)', category: 'keel ja kirjandus', gradeLevels: '10-12' },

  // ── Võõrkeeled (PÕK + GÕK) ─────────────────────────────────────────────────
  { name: 'Inglise keel (A-võõrkeel)', category: 'võõrkeeled', gradeLevels: '1-12' },
  { name: 'Vene keel (A-võõrkeel)', category: 'võõrkeeled', gradeLevels: '1-12' },
  { name: 'Vene keel (B-võõrkeel)', category: 'võõrkeeled', gradeLevels: '4-12' },
  { name: 'Saksa keel (B-võõrkeel)', category: 'võõrkeeled', gradeLevels: '4-12' },
  { name: 'Prantsuse keel (B-võõrkeel)', category: 'võõrkeeled', gradeLevels: '4-12' },
  { name: 'Soome keel (B-võõrkeel)', category: 'võõrkeeled', gradeLevels: '4-12' },
  { name: 'Hispaania keel (C-võõrkeel)', category: 'võõrkeeled', gradeLevels: '7-12' },
  { name: 'Saksa keel (C-võõrkeel)', category: 'võõrkeeled', gradeLevels: '7-12' },
  { name: 'Prantsuse keel (C-võõrkeel)', category: 'võõrkeeled', gradeLevels: '7-12' },
  { name: 'Rootsi keel', category: 'võõrkeeled', gradeLevels: '7-12' },
  { name: 'Ladina keel', category: 'võõrkeeled', gradeLevels: '10-12' },

  // ── Sotsiaalained (PÕK + GÕK) ────────────────────────────────────────────────
  { name: 'Inimeseõpetus', category: 'sotsiaalained', gradeLevels: '1-9' },
  { name: 'Ajalugu', category: 'sotsiaalained', gradeLevels: '4-12' },
  { name: 'Ühiskonnaõpetus', category: 'sotsiaalained', gradeLevels: '7-12' },
  // GÕK valikkursused – sotsiaalained
  { name: 'Majandus ja ettevõtlus', category: 'sotsiaalained', gradeLevels: '10-12' },
  { name: 'Riigikaitseõpetus', category: 'sotsiaalained', gradeLevels: '10-12' },
  { name: 'Usundiõpetus', category: 'sotsiaalained', gradeLevels: '10-12' },
  { name: 'Filosoofia', category: 'sotsiaalained', gradeLevels: '10-12' },
  { name: 'Psühholoogia', category: 'sotsiaalained', gradeLevels: '10-12' },
  { name: 'Uurimistöö alused', category: 'sotsiaalained', gradeLevels: '10-12' },
  { name: 'Eesti ja maailm', category: 'sotsiaalained', gradeLevels: '10-12' },

  // ── Kunstiained (PÕK + GÕK) ─────────────────────────────────────────────────
  { name: 'Kunst', category: 'kunstiained', gradeLevels: '1-9' },
  { name: 'Muusika', category: 'kunstiained', gradeLevels: '1-12' },
  { name: 'Kunstiajalugu', category: 'kunstiained', gradeLevels: '10-12' },
  { name: 'Pilliõpetus', category: 'kunstiained', gradeLevels: '1-12' },
  { name: 'Koolimuusika (valik)', category: 'kunstiained', gradeLevels: '10-12' },
  { name: 'Visuaalkunst (valik)', category: 'kunstiained', gradeLevels: '10-12' },
  { name: 'Disain ja tehnoloogia', category: 'kunstiained', gradeLevels: '10-12' },

  // ── Tehnoloogia (PÕK) ────────────────────────────────────────────────────────
  { name: 'Tööõpetus', category: 'tehnoloogia', gradeLevels: '1-3' },
  { name: 'Töö- ja tehnoloogiaõpetus', category: 'tehnoloogia', gradeLevels: '4-9' },
  { name: 'Käsitöö ja kodundus', category: 'tehnoloogia', gradeLevels: '4-9' },

  // ── Kehaline kasvatus (PÕK + GÕK) ────────────────────────────────────────────
  { name: 'Kehaline kasvatus', category: 'kehaline kasvatus', gradeLevels: '1-12' },
  { name: 'Tervislik eluviis (valik)', category: 'kehaline kasvatus', gradeLevels: '10-12' },
  { name: 'Riigikaitse ja sport', category: 'kehaline kasvatus', gradeLevels: '10-12' },
];

// ══════════════════════════════════════════════════════════════════════════════
// DEMO CLASS 9.B — 38 students
// Students 1-30 have parent consent for Füüsika AI analysis
// Students 31-38 do NOT have consent (teacher sees what happens)
// ══════════════════════════════════════════════════════════════════════════════

const demoStudents = [
  // ── WITH CONSENT (1-30) ────────────────────────────────────────────────────
  { first: 'Juhan',   last: 'Mets' },
  { first: 'Mari',    last: 'Kask' },
  { first: 'Peeter',  last: 'Tamm' },
  { first: 'Liis',    last: 'Kuusk' },
  { first: 'Rasmus',  last: 'Pärn' },
  { first: 'Anna',    last: 'Saar' },
  { first: 'Karl',    last: 'Lepp' },
  { first: 'Kadri',   last: 'Vaher' },
  { first: 'Martin',  last: 'Rebane' },
  { first: 'Laura',   last: 'Ilves' },
  { first: 'Siim',    last: 'Põld' },
  { first: 'Hanna',   last: 'Järv' },
  { first: 'Oliver',  last: 'Raud' },
  { first: 'Emma',    last: 'Laur' },
  { first: 'Markus',  last: 'Sepp' },
  { first: 'Sofia',   last: 'Rand' },
  { first: 'Kristjan', last: 'Org' },
  { first: 'Mia',     last: 'Kukk' },
  { first: 'Robert',  last: 'Lill' },
  { first: 'Helena',  last: 'Paju' },
  { first: 'Andreas', last: 'Mägi' },
  { first: 'Grete',   last: 'Kivi' },
  { first: 'Oskar',   last: 'Teder' },
  { first: 'Nora',    last: 'Kallas' },
  { first: 'Henrik',  last: 'Ots' },
  { first: 'Liisa',   last: 'Pihl' },
  { first: 'Mattias', last: 'Roots' },
  { first: 'Mirtel',  last: 'Nurm' },
  { first: 'Daniel',  last: 'Valk' },
  { first: 'Kertu',   last: 'Aas' },
  // ── WITHOUT CONSENT (31-38) ────────────────────────────────────────────────
  { first: 'Sander',  last: 'Koppel' },
  { first: 'Triin',   last: 'Luik' },
  { first: 'Sten',    last: 'Tomson' },
  { first: 'Hele',    last: 'Mitt' },
  { first: 'Joosep',  last: 'Vahter' },
  { first: 'Anette',  last: 'Pärg' },
  { first: 'Taavi',   last: 'Rätsep' },
  { first: 'Elina',   last: 'Hint' },
];

const CONSENT_CUTOFF = 30; // first 30 students have consent

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function toEmail(first: string, last: string, domain: string): string {
  return `${first.toLowerCase().replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/õ/g,'o')}.${last.toLowerCase().replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/õ/g,'o')}@${domain}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

export async function main() {
  console.log('Seeding database...');

  // ── 1. Schools ──────────────────────────────────────────────────────────────
  console.log('Seeding schools...');
  for (const school of schools) {
    const existing = await db.school.findFirst({ where: { name: school.name } });
    if (existing) {
      await db.school.update({
        where: { id: existing.id },
        data: { type: school.type, district: school.district, city: 'Tallinn' },
      });
    } else {
      await db.school.create({
        data: { name: school.name, type: school.type, district: school.district, city: 'Tallinn' },
      });
    }
  }
  console.log(`Seeded ${schools.length} schools.`);

  // ── 2. Subjects ─────────────────────────────────────────────────────────────
  console.log('Seeding subjects...');
  for (const subject of subjects) {
    const existing = await db.subject.findFirst({ where: { name: subject.name } });
    if (existing) {
      await db.subject.update({
        where: { id: existing.id },
        data: { category: subject.category, gradeLevels: subject.gradeLevels },
      });
    } else {
      await db.subject.create({
        data: { name: subject.name, category: subject.category, gradeLevels: subject.gradeLevels },
      });
    }
  }
  console.log(`Seeded ${subjects.length} subjects.`);

  // ── 3. Admin user ───────────────────────────────────────────────────────────
  console.log('Seeding admin user...');
  const hashedAdminPw = await hashPassword('Admin2024!');
  const adminUser = await db.user.upsert({
    where: { email: 'admin@opetajatagasiside.ee' },
    update: { name: 'Admin', role: Role.SCHOOL_ADMIN, password: hashedAdminPw },
    create: { email: 'admin@opetajatagasiside.ee', password: hashedAdminPw, name: 'Admin', role: Role.SCHOOL_ADMIN },
  });
  await db.adminProfile.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id },
  });
  console.log(`Seeded admin: ${adminUser.email}`);

  // ── 4. Superadmin ───────────────────────────────────────────────────────────
  console.log('Seeding superadmin...');
  const hashedSuperPw = await hashPassword('Superadmin2024!');
  const superAdmin = await db.user.upsert({
    where: { email: 'taavi.tamkivi@gmail.com' },
    update: { role: Role.SUPERADMIN },
    create: { email: 'taavi.tamkivi@gmail.com', password: hashedSuperPw, name: 'Taavi Tamkivi', role: Role.SUPERADMIN },
  });
  await db.adminProfile.upsert({
    where: { userId: superAdmin.id },
    update: {},
    create: { userId: superAdmin.id },
  });
  console.log(`Seeded superadmin: ${superAdmin.email}`);

  // ── 5. Demo teacher ─────────────────────────────────────────────────────────
  console.log('Seeding demo teacher...');
  const hashedTeacherPw = await hashPassword('Opetaja2024!');
  const teacherUser = await db.user.upsert({
    where: { email: 'demo.opetaja@opetajatagasiside.ee' },
    update: { name: 'Demo Õpetaja', role: Role.TEACHER, password: hashedTeacherPw },
    create: {
      email: 'demo.opetaja@opetajatagasiside.ee',
      password: hashedTeacherPw,
      name: 'Demo Õpetaja',
      role: Role.TEACHER,
    },
  });

  const teacherProfile = await db.teacherProfile.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: { userId: teacherUser.id, isActive: true },
  });

  // Link teacher to Demo Kool
  const demoSchool = await db.school.findFirst({ where: { name: 'Demo Kool' } });
  if (!demoSchool) throw new Error('Demo Kool not found — seed schools first');

  // TeacherSchool (composite PK — use raw upsert pattern)
  const existingTS = await db.teacherSchool.findUnique({
    where: { teacherId_schoolId: { teacherId: teacherProfile.id, schoolId: demoSchool.id } },
  });
  if (!existingTS) {
    await db.teacherSchool.create({
      data: { teacherId: teacherProfile.id, schoolId: demoSchool.id },
    });
  }

  // Link teacher to Füüsika subject
  const fyysika = await db.subject.findFirst({ where: { name: 'Füüsika' } });
  if (!fyysika) throw new Error('Füüsika subject not found — seed subjects first');

  const existingTSub = await db.teacherSubject.findUnique({
    where: { teacherId_subjectId: { teacherId: teacherProfile.id, subjectId: fyysika.id } },
  });
  if (!existingTSub) {
    await db.teacherSubject.create({
      data: { teacherId: teacherProfile.id, subjectId: fyysika.id },
    });
  }
  console.log(`Seeded teacher: ${teacherUser.email}`);

  // ── 6. Academic year ────────────────────────────────────────────────────────
  console.log('Seeding academic year...');
  // Find or create by label + school
  let academicYear = await db.academicYear.findFirst({
    where: { schoolId: demoSchool.id, label: '2025/2026' },
  });
  if (!academicYear) {
    academicYear = await db.academicYear.create({
      data: {
        schoolId: demoSchool.id,
        label: '2025/2026',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-06-15'),
        isActive: true,
      },
    });
  } else {
    await db.academicYear.update({
      where: { id: academicYear.id },
      data: { isActive: true },
    });
  }
  console.log(`Seeded academic year: ${academicYear.label}`);

  // ── 7. School class 9.B ────────────────────────────────────────────────────
  console.log('Seeding class 9.B...');
  let schoolClass = await db.schoolClass.findFirst({
    where: { schoolId: demoSchool.id, academicYearId: academicYear.id, name: '9.B' },
  });
  if (!schoolClass) {
    schoolClass = await db.schoolClass.create({
      data: {
        schoolId: demoSchool.id,
        academicYearId: academicYear.id,
        name: '9.B',
        gradeLevel: 9,
        homroomTeacherId: teacherProfile.id,
      },
    });
  } else {
    await db.schoolClass.update({
      where: { id: schoolClass.id },
      data: { homroomTeacherId: teacherProfile.id },
    });
  }
  console.log(`Seeded class: ${schoolClass.name}`);

  // ── 8. 38 students + parents + consent ──────────────────────────────────────
  console.log('Seeding 38 students with parents and consent...');
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  let consentCount = 0;
  let noConsentCount = 0;

  for (let i = 0; i < demoStudents.length; i++) {
    const { first, last } = demoStudents[i];
    const fullName = `${first} ${last}`;
    const studentEmail = toEmail(first, last, 'demo.opetajatagasiside.ee');
    const hasConsent = i < CONSENT_CUTOFF;

    // Student user
    const studentUser = await db.user.upsert({
      where: { email: studentEmail },
      update: { name: fullName, role: Role.STUDENT },
      create: { email: studentEmail, name: fullName, role: Role.STUDENT },
    });

    // Student profile
    const studentProfile = await db.studentProfile.upsert({
      where: { userId: studentUser.id },
      update: { schoolId: demoSchool.id, classId: schoolClass.id, isEligible: true },
      create: {
        userId: studentUser.id,
        schoolId: demoSchool.id,
        classId: schoolClass.id,
        isEligible: true,
      },
    });

    // Parent profile (unregistered — no user account, just email + name)
    const parentEmail = toEmail('ema', last, 'demo.opetajatagasiside.ee');
    const parentName = `Ema ${last}`;

    // Find existing parent by email or create new
    let parentProfile = await db.parentProfile.findFirst({ where: { email: parentEmail } });
    if (!parentProfile) {
      parentProfile = await db.parentProfile.create({
        data: { email: parentEmail, name: parentName },
      });
    }

    // Link parent to student (skip if already linked)
    const existingLink = await db.parentStudentLink.findUnique({
      where: { parentId_studentId: { parentId: parentProfile.id, studentId: studentProfile.id } },
    });
    if (!existingLink) {
      await db.parentStudentLink.create({
        data: { parentId: parentProfile.id, studentId: studentProfile.id },
      });
    }

    // Consent (only for first 30 students)
    if (hasConsent) {
      // Check if consent request already exists for this student + parent
      const existingRequest = await db.consentRequest.findFirst({
        where: {
          studentId: studentProfile.id,
          parentEmail: parentEmail,
          status: 'APPROVED',
        },
      });

      if (!existingRequest) {
        const consentRequest = await db.consentRequest.create({
          data: {
            requestedById: teacherProfile.id,
            studentId: studentProfile.id,
            parentProfileId: parentProfile.id,
            parentEmail: parentEmail,
            parentName: parentName,
            inviteToken: randomUUID(),
            status: 'APPROVED',
            expiresAt: oneYearFromNow,
            respondedAt: new Date(),
          },
        });

        await db.consentGrant.create({
          data: {
            requestId: consentRequest.id,
            studentId: studentProfile.id,
            parentId: parentProfile.id,
            subjectId: fyysika.id,
            academicYearId: academicYear.id,
            scope: 'SPECIFIC_SUBJECT',
            duration: 'DATED',
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date('2026-06-15'),
          },
        });
      }
      consentCount++;
    } else {
      noConsentCount++;
    }
  }
  console.log(`Seeded ${demoStudents.length} students (${consentCount} with consent, ${noConsentCount} without).`);

  // ── 9. Sample test ──────────────────────────────────────────────────────────
  console.log('Seeding sample test...');
  const existingTest = await db.test.findFirst({
    where: { teacherId: teacherProfile.id, title: 'Mehaanika kontrolltöö', deletedAt: null },
  });
  if (!existingTest) {
    await db.test.create({
      data: {
        teacherId: teacherProfile.id,
        ownerId: teacherProfile.id,
        subjectId: fyysika.id,
        schoolId: demoSchool.id,
        classId: schoolClass.id,
        academicYearId: academicYear.id,
        title: 'Mehaanika kontrolltöö',
        topic: 'Newtoni seadused, jõud, liikumine',
        grade: '9',
        status: 'READY',
        rubric: 'Hinda õpilase arusaamist Newtoni seadustest, jõudude tasakaalust ja liikumise kirjeldamisest. Maksimaalselt 40 punkti.',
      },
    });
  }
  console.log('Seeded sample test: Mehaanika kontrolltöö');

  console.log('Done seeding.');
}

main().catch(console.error).finally(() => process.exit());
