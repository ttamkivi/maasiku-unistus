/**
 * Seed script: Demo Kool — 9. klass with 38 students
 *
 * Creates:
 *   - "Demo Kool" school
 *   - Links all existing TEACHERs to it
 *   - A SchoolClass "9.A" for the current academic year
 *   - 38 student users (StudentProfile, classId → SchoolClass)
 *   - 38 parent users (ParentProfile), each linked to their child
 *   - ConsentRequest + ConsentGrant for 75% of students
 *
 * Run: npx tsx scripts/seed-demo.ts
 */

import { PrismaClient } from '../lib/generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcryptjs';
import path from 'path';

const adapter = new PrismaLibSql({
  url: `file:${path.resolve(__dirname, '../dev.db')}`,
});
const prisma = new PrismaClient({ adapter } as never);

// ── Estonian student names (38 total) ──────────────────────────────────────
const STUDENTS: { name: string; email: string; parentName: string; parentEmail: string }[] = [
  // Girls (19)
  { name: 'Liisa Tamm',       email: 'liisa.tamm@demo.ee',       parentName: 'Tiina Tamm',      parentEmail: 'tiina.tamm@demo.ee' },
  { name: 'Mari Kask',        email: 'mari.kask@demo.ee',        parentName: 'Aive Kask',       parentEmail: 'aive.kask@demo.ee' },
  { name: 'Anna Mägi',        email: 'anna.magi@demo.ee',        parentName: 'Piret Mägi',      parentEmail: 'piret.magi@demo.ee' },
  { name: 'Kati Leppik',      email: 'kati.leppik@demo.ee',      parentName: 'Moonika Leppik',  parentEmail: 'moonika.leppik@demo.ee' },
  { name: 'Laura Saar',       email: 'laura.saar@demo.ee',       parentName: 'Anu Saar',        parentEmail: 'anu.saar@demo.ee' },
  { name: 'Piret Kaljurand',  email: 'piret.kaljurand@demo.ee',  parentName: 'Kaie Kaljurand',  parentEmail: 'kaie.kaljurand@demo.ee' },
  { name: 'Kadri Pärn',       email: 'kadri.parn@demo.ee',       parentName: 'Sirje Pärn',      parentEmail: 'sirje.parn@demo.ee' },
  { name: 'Triin Rebane',     email: 'triin.rebane@demo.ee',     parentName: 'Kaire Rebane',    parentEmail: 'kaire.rebane@demo.ee' },
  { name: 'Eliis Kukk',       email: 'eliis.kukk@demo.ee',       parentName: 'Helgi Kukk',      parentEmail: 'helgi.kukk@demo.ee' },
  { name: 'Sandra Lepp',      email: 'sandra.lepp@demo.ee',      parentName: 'Riina Lepp',      parentEmail: 'riina.lepp@demo.ee' },
  { name: 'Maris Rand',       email: 'maris.rand@demo.ee',       parentName: 'Liina Rand',      parentEmail: 'liina.rand@demo.ee' },
  { name: 'Kertu Mets',       email: 'kertu.mets@demo.ee',       parentName: 'Valve Mets',      parentEmail: 'valve.mets@demo.ee' },
  { name: 'Birgit Oja',       email: 'birgit.oja@demo.ee',       parentName: 'Maire Oja',       parentEmail: 'maire.oja@demo.ee' },
  { name: 'Grete Rätsep',     email: 'grete.ratsep@demo.ee',     parentName: 'Eha Rätsep',      parentEmail: 'eha.ratsep@demo.ee' },
  { name: 'Helen Laas',       email: 'helen.laas@demo.ee',       parentName: 'Merike Laas',     parentEmail: 'merike.laas@demo.ee' },
  { name: 'Moonika Vahi',     email: 'moonika.vahi@demo.ee',     parentName: 'Kalle Vahi',      parentEmail: 'kalle.vahi@demo.ee' },
  { name: 'Tiina Koger',      email: 'tiina.koger@demo.ee',      parentName: 'Arvo Koger',      parentEmail: 'arvo.koger@demo.ee' },
  { name: 'Anneli Niit',      email: 'anneli.niit@demo.ee',      parentName: 'Tõnu Niit',       parentEmail: 'tonu.niit@demo.ee' },
  { name: 'Katre Luik',       email: 'katre.luik@demo.ee',       parentName: 'Mati Luik',       parentEmail: 'mati.luik@demo.ee' },
  // Boys (19)
  { name: 'Jaan Tamm',        email: 'jaan.tamm@demo.ee',        parentName: 'Peeter Tamm',     parentEmail: 'peeter.tamm@demo.ee' },
  { name: 'Mart Kask',        email: 'mart.kask@demo.ee',        parentName: 'Raivo Kask',      parentEmail: 'raivo.kask@demo.ee' },
  { name: 'Tõnu Mägi',        email: 'tonu.magi@demo.ee',        parentName: 'Toomas Mägi',     parentEmail: 'toomas.magi@demo.ee' },
  { name: 'Rait Leppik',      email: 'rait.leppik@demo.ee',      parentName: 'Urmas Leppik',    parentEmail: 'urmas.leppik@demo.ee' },
  { name: 'Karl Saar',        email: 'karl.saar@demo.ee',        parentName: 'Tarmo Saar',      parentEmail: 'tarmo.saar@demo.ee' },
  { name: 'Marko Kaljurand',  email: 'marko.kaljurand@demo.ee',  parentName: 'Aivar Kaljurand', parentEmail: 'aivar.kaljurand@demo.ee' },
  { name: 'Siim Pärn',        email: 'siim.parn@demo.ee',        parentName: 'Ants Pärn',       parentEmail: 'ants.parn@demo.ee' },
  { name: 'Rene Rebane',      email: 'rene.rebane@demo.ee',      parentName: 'Kalev Rebane',    parentEmail: 'kalev.rebane@demo.ee' },
  { name: 'Henrik Kukk',      email: 'henrik.kukk@demo.ee',      parentName: 'Madis Kukk',      parentEmail: 'madis.kukk@demo.ee' },
  { name: 'Marten Lepp',      email: 'marten.lepp@demo.ee',      parentName: 'Jüri Lepp',       parentEmail: 'jyri.lepp@demo.ee' },
  { name: 'Erik Rand',        email: 'erik.rand@demo.ee',        parentName: 'Priit Rand',      parentEmail: 'priit.rand@demo.ee' },
  { name: 'Sander Mets',      email: 'sander.mets@demo.ee',      parentName: 'Rein Mets',       parentEmail: 'rein.mets@demo.ee' },
  { name: 'Robin Oja',        email: 'robin.oja@demo.ee',        parentName: 'Andrus Oja',      parentEmail: 'andrus.oja@demo.ee' },
  { name: 'Mihkel Rätsep',    email: 'mihkel.ratsep@demo.ee',    parentName: 'Märt Rätsep',     parentEmail: 'mart.ratsep@demo.ee' },
  { name: 'Oliver Laas',      email: 'oliver.laas@demo.ee',      parentName: 'Veiko Laas',      parentEmail: 'veiko.laas@demo.ee' },
  { name: 'Matis Vahi',       email: 'matis.vahi@demo.ee',       parentName: 'Silver Vahi',     parentEmail: 'silver.vahi@demo.ee' },
  { name: 'Kristofer Koger',  email: 'kristofer.koger@demo.ee',  parentName: 'Erko Koger',      parentEmail: 'erko.koger@demo.ee' },
  { name: 'Janno Niit',       email: 'janno.niit@demo.ee',       parentName: 'Kaido Niit',      parentEmail: 'kaido.niit@demo.ee' },
  { name: 'Rasmus Luik',      email: 'rasmus.luik@demo.ee',      parentName: 'Ülo Luik',        parentEmail: 'ylo.luik@demo.ee' },
];

const DEFAULT_PASSWORD = 'DemoKool2026!';

async function main() {
  console.log('Seeding Demo Kool...\n');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // ── 1. Create "Demo Kool" school (idempotent) ──────────────────────────────
  let school = await prisma.school.findFirst({ where: { name: 'Demo Kool' } });
  if (!school) {
    school = await prisma.school.create({
      data: { name: 'Demo Kool', type: 'põhikool', city: 'Tallinn' },
    });
    console.log(`School created: ${school.name} (${school.id})`);
  } else {
    console.log(`School already exists: ${school.name}`);
  }

  // ── 2. Link all existing TEACHERs to the school ───────────────────────────
  const teachers = await prisma.teacherProfile.findMany({ include: { user: true } });
  let teacherLinked = 0;
  for (const tp of teachers) {
    const existing = await prisma.teacherSchool.findUnique({
      where: { teacherId_schoolId: { teacherId: tp.id, schoolId: school.id } },
    });
    if (!existing) {
      await prisma.teacherSchool.create({ data: { teacherId: tp.id, schoolId: school.id } });
      teacherLinked++;
    }
  }
  console.log(`Linked ${teacherLinked} teacher(s) to Demo Kool (${teachers.length - teacherLinked} already linked)`);

  // ── 3. Ensure an AcademicYear and SchoolClass "9.A" exist ─────────────────
  let academicYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, label: '2025/2026' },
  });
  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        schoolId: school.id,
        label: '2025/2026',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-06-15'),
        isActive: true,
      },
    });
    console.log(`AcademicYear created: ${academicYear.label}`);
  }

  let schoolClass = await prisma.schoolClass.findFirst({
    where: { schoolId: school.id, academicYearId: academicYear.id, name: '9.A' },
  });
  if (!schoolClass) {
    schoolClass = await prisma.schoolClass.create({
      data: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        name: '9.A',
        gradeLevel: 9,
      },
    });
    console.log(`SchoolClass created: ${schoolClass.name}`);
  } else {
    console.log(`SchoolClass already exists: ${schoolClass.name}`);
  }

  // ── 4. Ensure a teacher profile exists to use as consentRequest.requestedById ─
  const firstTeacher = teachers[0] ?? null;

  // ── 5. Create 38 students + parents ───────────────────────────────────────
  console.log(`\nCreating ${STUDENTS.length} students + parents...`);
  let studentsCreated = 0;
  let parentsCreated = 0;

  for (const s of STUDENTS) {
    // Student user
    let studentUser = await prisma.user.findUnique({ where: { email: s.email } });
    let studentProfile;

    if (!studentUser) {
      studentUser = await prisma.user.create({
        data: {
          name: s.name,
          email: s.email,
          password: hashedPassword,
          role: 'STUDENT',
        },
      });
      studentProfile = await prisma.studentProfile.create({
        data: {
          userId: studentUser.id,
          schoolId: school.id,
          classId: schoolClass.id,
        },
      });
      studentsCreated++;
    } else {
      studentProfile = await prisma.studentProfile.findUnique({ where: { userId: studentUser.id } });
      if (studentProfile && !studentProfile.schoolId) {
        await prisma.studentProfile.update({
          where: { id: studentProfile.id },
          data: { schoolId: school.id, classId: schoolClass.id },
        });
      }
    }

    if (!studentProfile) continue;

    // Parent user
    let parentUser = await prisma.user.findUnique({ where: { email: s.parentEmail } });
    let parentProfile;

    if (!parentUser) {
      parentUser = await prisma.user.create({
        data: {
          name: s.parentName,
          email: s.parentEmail,
          password: hashedPassword,
          role: 'PARENT',
        },
      });
      parentProfile = await prisma.parentProfile.create({
        data: { userId: parentUser.id },
      });
      parentsCreated++;
    } else {
      parentProfile = await prisma.parentProfile.findUnique({ where: { userId: parentUser.id } });
    }

    if (parentProfile) {
      // Link parent ↔ student
      const linkExists = await prisma.parentStudentLink.findUnique({
        where: { parentId_studentId: { parentId: parentProfile.id, studentId: studentProfile.id } },
      });
      if (!linkExists) {
        await prisma.parentStudentLink.create({
          data: { parentId: parentProfile.id, studentId: studentProfile.id },
        });
      }
    }
  }

  console.log(`Students created: ${studentsCreated} (${STUDENTS.length - studentsCreated} already existed)`);
  console.log(`Parents created:  ${parentsCreated}`);

  // ── 6. AI analysis consent for 75% of students ────────────────────────────
  console.log(`\nSeeding AI analysis consent for 75% of students...`);

  const CONSENT_COUNT = Math.round(STUDENTS.length * 0.75); // 29
  const consentStudentEmails = new Set(STUDENTS.slice(0, CONSENT_COUNT).map((s) => s.email));

  const now = new Date();
  const FOUR_MONTHS_MS = 4 * 30 * 24 * 60 * 60 * 1000;

  let consentsCreated = 0;
  let eligibilitiesCreated = 0;

  for (let i = 0; i < STUDENTS.length; i++) {
    const s = STUDENTS[i];
    if (!consentStudentEmails.has(s.email)) continue;

    const studentUser = await prisma.user.findUnique({ where: { email: s.email } });
    const parentUser = await prisma.user.findUnique({ where: { email: s.parentEmail } });
    if (!studentUser || !parentUser) continue;

    const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: studentUser.id } });
    const parentProfile = await prisma.parentProfile.findUnique({ where: { userId: parentUser.id } });
    if (!studentProfile || !parentProfile) continue;

    const fraction = i / STUDENTS.length;
    const consentDate = new Date(now.getTime() - FOUR_MONTHS_MS + fraction * FOUR_MONTHS_MS);

    // Check if active consent grant already exists
    const existingGrant = await prisma.consentGrant.findFirst({
      where: { parentId: parentProfile.id, studentId: studentProfile.id, status: 'ACTIVE' },
    });

    if (!existingGrant && firstTeacher) {
      // Create or find a ConsentRequest first
      let consentRequest = await prisma.consentRequest.findFirst({
        where: { studentId: studentProfile.id, requestedById: firstTeacher.id },
      });
      if (!consentRequest) {
        consentRequest = await prisma.consentRequest.create({
          data: {
            requestedById: firstTeacher.id,
            studentId: studentProfile.id,
            parentProfileId: parentProfile.id,
            parentEmail: parentUser.email,
            parentName: parentUser.name,
            inviteToken: `demo-${studentProfile.id}-${parentProfile.id}`,
            status: 'APPROVED',
            expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
            respondedAt: consentDate,
          },
        });
      }

      await prisma.consentGrant.create({
        data: {
          requestId: consentRequest.id,
          parentId: parentProfile.id,
          studentId: studentProfile.id,
          subjectId: null,
          scope: 'ALL_SUBJECTS',
          status: 'ACTIVE',
          duration: 'INFINITE',
          startDate: consentDate,
          note: 'Seeded via demo seed script',
        },
      });
      consentsCreated++;
    }

    // Set isEligible = true on StudentProfile
    if (!studentProfile.isEligible) {
      await prisma.studentProfile.update({
        where: { id: studentProfile.id },
        data: { isEligible: true },
      });
      eligibilitiesCreated++;
    }
  }

  console.log(`Parent consents created:  ${consentsCreated} (${CONSENT_COUNT - consentsCreated} already existed)`);
  console.log(`Eligibilities set:        ${eligibilitiesCreated}`);

  console.log(`
Demo Kool seeded!

School:    Demo Kool (9.A, 38 students)
Password:  ${DEFAULT_PASSWORD}  (all demo users)

AI analysis consent: ${CONSENT_COUNT}/38 students (75%)
`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
