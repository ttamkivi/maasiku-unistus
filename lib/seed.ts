import { db } from './db';
import { hashPassword } from './auth';
import { Role } from './generated/prisma/client';

const schools = [
  { name: 'Tallinna Reaalkool', type: 'gümnaasium', district: 'Kesklinn' },
  { name: 'Tallinna Tõnismäe Reaalkool', type: 'gümnaasium', district: 'Kesklinn' },
  { name: 'Gustav Adolfi Gümnaasium', type: 'gümnaasium', district: 'Kesklinn' },
  { name: 'Tallinna 21. Kool', type: 'gümnaasium', district: 'Kesklinn' },
  { name: 'Tallinna Inglise Kolledž', type: 'gümnaasium', district: 'Kesklinn' },
  { name: 'Kadrioru Saksa Gümnaasium', type: 'gümnaasium', district: 'Pirita' },
  { name: 'Tallinna Kunstigümnaasium', type: 'gümnaasium', district: 'Põhja-Tallinn' },
  { name: 'Tallinna Humanitaargümnaasium', type: 'gümnaasium', district: 'Kesklinn' },
  { name: 'Ehte Humanitaargümnaasium', type: 'gümnaasium', district: 'Põhja-Tallinn' },
  { name: 'Tallinna Laagna Gümnaasium', type: 'gümnaasium', district: 'Lasnamäe' },
  { name: 'Lasnamäe Gümnaasium', type: 'gümnaasium', district: 'Lasnamäe' },
  { name: 'Tallinna Õismäe Gümnaasium', type: 'gümnaasium', district: 'Haabersti' },
  { name: 'Tallinna Mustjõe Gümnaasium', type: 'gümnaasium', district: 'Mustamäe' },
  { name: 'Tallinna Kristiine Gümnaasium', type: 'gümnaasium', district: 'Kristiine' },
  { name: 'Tallinna Lilleküla Gümnaasium', type: 'gümnaasium', district: 'Kristiine' },
  { name: 'Tallinna Nõmme Gümnaasium', type: 'gümnaasium', district: 'Nõmme' },
  { name: 'Tallinna Tehnikagümnaasium', type: 'gümnaasium', district: 'Kesklinn' },
  { name: 'Tallinna Arte Gümnaasium', type: 'gümnaasium', district: 'Kesklinn' },
  { name: 'Tallinna Kadaka Põhikool', type: 'põhikool', district: 'Mustamäe' },
  { name: 'Tallinna Nõmme Põhikool', type: 'põhikool', district: 'Nõmme' },
  { name: 'Kalamaja Põhikool', type: 'põhikool', district: 'Põhja-Tallinn' },
  { name: 'Tallinna 32. Keskkool', type: 'keskkool', district: 'Kesklinn' },
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

export async function main() {
  console.log('Seeding database...');

  // Seed schools
  console.log('Seeding schools...');
  for (const school of schools) {
    const existing = await db.school.findFirst({ where: { name: school.name } });
    if (existing) {
      await db.school.update({
        where: { id: existing.id },
        data: {
          type: school.type,
          district: school.district,
          city: 'Tallinn',
        },
      });
    } else {
      await db.school.create({
        data: {
          name: school.name,
          type: school.type,
          district: school.district,
          city: 'Tallinn',
        },
      });
    }
  }
  console.log(`Seeded ${schools.length} schools.`);

  // Seed subjects
  console.log('Seeding subjects...');
  for (const subject of subjects) {
    const existing = await db.subject.findFirst({ where: { name: subject.name } });
    if (existing) {
      await db.subject.update({
        where: { id: existing.id },
        data: {
          category: subject.category,
          gradeLevels: subject.gradeLevels,
        },
      });
    } else {
      await db.subject.create({
        data: {
          name: subject.name,
          category: subject.category,
          gradeLevels: subject.gradeLevels,
        },
      });
    }
  }
  console.log(`Seeded ${subjects.length} subjects.`);

  // Seed admin user
  console.log('Seeding admin user...');
  const hashedPassword = await hashPassword('Admin2024!');

  const adminUser = await db.user.upsert({
    where: { email: 'admin@maasikuunistus.ee' },
    update: {
      name: 'Admin',
      role: Role.ADMIN,
      password: hashedPassword,
    },
    create: {
      email: 'admin@maasikuunistus.ee',
      password: hashedPassword,
      name: 'Admin',
      role: Role.ADMIN,
    },
  });

  await db.adminProfile.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
    },
  });

  console.log(`Seeded admin user: ${adminUser.email}`);

  // Seed superadmin (taavi.tamkivi@gmail.com)
  console.log('Seeding superadmin...');
  const superPassword = await hashPassword('Superadmin2024!');
  const superAdmin = await db.user.upsert({
    where: { email: 'taavi.tamkivi@gmail.com' },
    update: { isSuperAdmin: true, role: Role.SUPERADMIN },
    create: {
      email: 'taavi.tamkivi@gmail.com',
      password: superPassword,
      name: 'Taavi Tamkivi',
      role: Role.SUPERADMIN,
      isSuperAdmin: true,
    },
  });
  await db.adminProfile.upsert({
    where: { userId: superAdmin.id },
    update: {},
    create: { userId: superAdmin.id },
  });
  console.log(`Seeded superadmin: ${superAdmin.email}`);
  console.log('Done seeding.');
}

main().catch(console.error).finally(() => process.exit());
