/**
 * Seed script: Populates learning materials for 9th grade physics.
 *
 * Run via: npx tsx scripts/seed-learning-materials.ts
 *
 * Idempotent — skips existing resources (matched by url + curriculumCode).
 */

import { db } from '../lib/db';

interface SeedMaterial {
  curriculumCode: string;
  title: string;
  url: string;
  type: 'video' | 'exercise' | 'reading' | 'course';
  language: 'et' | 'en' | 'et_sub';
  isFree: boolean;
  provider: string;
  description: string;
  topic: string;
  quality: number;
}

const MATERIALS: SeedMaterial[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // SOOJUSÕPETUS — F9.1.x
  // ═══════════════════════════════════════════════════════════════════════

  // F9.1.1 — Aine ehituse mudel ja agregaatolekud
  {
    curriculumCode: 'F9.1.1',
    title: 'Füüsika 9. klassile — digitaalne õpik',
    url: 'https://opik.fyysika.ee/index.php/book/view/70',
    type: 'reading',
    language: 'et',
    isFree: true,
    provider: 'Füüsika.ee',
    description: 'Tasuta e-õpik kogu 9. klassi füüsika kursuse jaoks, sh aine ehitus ja agregaatolekud.',
    topic: 'Aine ehituse mudel ja agregaatolekud',
    quality: 4,
  },
  {
    curriculumCode: 'F9.1.1',
    title: 'Thermal Energy, Temperature, and Heat',
    url: 'https://www.khanacademy.org/science/hs-physics/x215e29cb31244fa1:modeling-energy/x215e29cb31244fa1:thermodynamics/v/thermal-energy-temperature-and-heat',
    type: 'video',
    language: 'en',
    isFree: true,
    provider: 'Khan Academy',
    description: 'Selgitab temperatuuri, soojusenergia ja soojuse mõisteid. Inglise keeles, selge visuaalidega.',
    topic: 'Aine ehituse mudel ja agregaatolekud',
    quality: 4,
  },
  {
    curriculumCode: 'F9.1.1',
    title: 'States of Matter',
    url: 'https://phet.colorado.edu/en/simulations/states-of-matter',
    type: 'exercise',
    language: 'en',
    isFree: true,
    provider: 'PhET',
    description: 'Interaktiivne simulatsioon: vaata kuidas osakesed liiguvad eri agregaatolekutes ja temperatuuridel.',
    topic: 'Aine ehituse mudel ja agregaatolekud',
    quality: 5,
  },

  // F9.1.2 — Aineosakeste liikumine ja temperatuur
  {
    curriculumCode: 'F9.1.2',
    title: 'What Does Heat Do?',
    url: 'https://www.physicsclassroom.com/class/thermalP/Lesson-2/What-Does-Heat-Do',
    type: 'reading',
    language: 'en',
    isFree: true,
    provider: 'Physics Classroom',
    description: 'Temperatuuri ja osakeste liikumise seos, siseenergia muutused.',
    topic: 'Aineosakeste liikumine ja temperatuur',
    quality: 4,
  },

  // F9.1.3 — Soojuspaisumine ja difusioon
  {
    curriculumCode: 'F9.1.3',
    title: 'Diffusion',
    url: 'https://phet.colorado.edu/en/simulations/diffusion',
    type: 'exercise',
    language: 'en',
    isFree: true,
    provider: 'PhET',
    description: 'Interaktiivne simulatsioon: uuri difusiooni kahe gaasi vahel, muuda temperatuuri ja massi.',
    topic: 'Soojuspaisumine ja difusioon',
    quality: 5,
  },

  // F9.1.4 — Soojushulk ja erisoojus Q = cm∆t
  {
    curriculumCode: 'F9.1.4',
    title: 'Specific Heat Capacity',
    url: 'https://www.khanacademy.org/science/hs-physics/x215e29cb31244fa1:modeling-energy/x215e29cb31244fa1:thermodynamics/v/specific-heat-capacity',
    type: 'video',
    language: 'en',
    isFree: true,
    provider: 'Khan Academy',
    description: 'Erisoojuse mõiste, Q = cm∆t valemi tuletamine ja kasutamine näidete kaudu.',
    topic: 'Soojushulk ja erisoojus (Q = cm∆t)',
    quality: 5,
  },
  {
    curriculumCode: 'F9.1.4',
    title: 'Füüsika 9. klass — Opiq',
    url: 'https://www.opiq.ee/Kit/Details/93',
    type: 'course',
    language: 'et',
    isFree: false,
    provider: 'Opiq',
    description: 'Täielik digitaalne õpik 9. klassi füüsikale, sh interaktiivsed ülesanded soojushulga teemadel.',
    topic: 'Soojushulk ja erisoojus (Q = cm∆t)',
    quality: 5,
  },

  // F9.1.5 — Soojusülekande liigid igapäevaelus
  {
    curriculumCode: 'F9.1.5',
    title: 'Methods of Heat Transfer',
    url: 'https://www.physicsclassroom.com/class/thermalP/Lesson-1/Methods-of-Heat-Transfer',
    type: 'reading',
    language: 'en',
    isFree: true,
    provider: 'Physics Classroom',
    description: 'Soojusjuhtivus, konvektsioon ja soojuskiirgus — selgitused ja igapäevaelu näited.',
    topic: 'Soojusülekande liigid igapäevaelus',
    quality: 4,
  },

  // F9.1.6 — Soojusjuhtivus, konvektsioon, soojuskiirgus
  {
    curriculumCode: 'F9.1.6',
    title: 'Thermal Conduction, Convection, and Radiation',
    url: 'https://www.khanacademy.org/science/hs-physics/x215e29cb31244fa1:modeling-energy/x215e29cb31244fa1:thermodynamics/v/thermal-conduction-convection-and-radiation',
    type: 'video',
    language: 'en',
    isFree: true,
    provider: 'Khan Academy',
    description: 'Kolm soojusülekande viisi — selged animatsioonid ja näited.',
    topic: 'Soojusjuhtivus, konvektsioon, soojuskiirgus',
    quality: 4,
  },
  {
    curriculumCode: 'F9.1.6',
    title: 'Energy Forms and Changes',
    url: 'https://phet.colorado.edu/en/simulations/energy-forms-and-changes',
    type: 'exercise',
    language: 'en',
    isFree: true,
    provider: 'PhET',
    description: 'Interaktiivne: jälgi energia liikumist ja muundumist soojendamisel, soojusjuhtivuse näited.',
    topic: 'Soojusjuhtivus, konvektsioon, soojuskiirgus',
    quality: 5,
  },

  // F9.1.7/F9.1.8 — Siseenergia ja soojushulk / arvutamine
  {
    curriculumCode: 'F9.1.8',
    title: 'Rates of Heat Transfer',
    url: 'https://www.physicsclassroom.com/class/thermalP/Lesson-1/Rates-of-Heat-Transfer',
    type: 'reading',
    language: 'en',
    isFree: true,
    provider: 'Physics Classroom',
    description: 'Soojuse ülekande kiirus eri tingimustes, Q = cm∆t arvutused.',
    topic: 'Soojushulga arvutamine Q = cm∆t',
    quality: 4,
  },

  // F9.1.10 — Sulamine ja tahkumine
  {
    curriculumCode: 'F9.1.10',
    title: 'Soojusõpetus. Tuumaenergia — Opiq',
    url: 'https://www.opiq.ee/Kit/Details/138',
    type: 'course',
    language: 'et',
    isFree: false,
    provider: 'Opiq',
    description: 'Eestikeelne kursus: sulamine, tahkumine, aurumine, keemissoojus, tuumaenergia.',
    topic: 'Sulamine ja tahkumine, sulamissoojus Q = λm',
    quality: 5,
  },

  // F9.1.12 — Aine oleku muutuste graafik
  {
    curriculumCode: 'F9.1.12',
    title: 'Füüsika põhivara — 9. klass',
    url: 'https://opik.kirsman.ee/pohikool/9klass/',
    type: 'reading',
    language: 'et',
    isFree: true,
    provider: 'Kirsman',
    description: 'Eestikeelne kokkuvõte: aine olekute graafikud, soojusõpetuse valemid ja näited.',
    topic: 'Aine oleku muutuste graafik',
    quality: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ELEKTRIÕPETUS — F9.2.x
  // ═══════════════════════════════════════════════════════════════════════

  // F9.2.1 — Elektrilaeng ja elektriväli
  {
    curriculumCode: 'F9.2.1',
    title: 'Electric Field and the Movement of Charge',
    url: 'https://www.physicsclassroom.com/class/circuits/Lesson-1/Electric-Field-and-the-Movement-of-Charge',
    type: 'reading',
    language: 'en',
    isFree: true,
    provider: 'Physics Classroom',
    description: 'Elektrivälja mõiste, laengud ja elektriline vastastikmõju — selge ingliskeelne selgitus.',
    topic: 'Elektrilaeng ja elektriväli',
    quality: 4,
  },
  {
    curriculumCode: 'F9.2.1',
    title: 'Charges and Fields',
    url: 'https://phet.colorado.edu/en/simulations/charges-and-fields',
    type: 'exercise',
    language: 'en',
    isFree: true,
    provider: 'PhET',
    description: 'Interaktiivne simulatsioon: paiguta laenguid ja uuri elektrivälja, potentsiaali ja jõujooni.',
    topic: 'Elektrilaeng ja elektriväli',
    quality: 5,
  },

  // F9.2.2 — Elektrivool metallides ja vooluringi osad
  {
    curriculumCode: 'F9.2.2',
    title: 'Elektriõpetus — Opiq',
    url: 'https://www.opiq.ee/Kit/Details/105',
    type: 'course',
    language: 'et',
    isFree: false,
    provider: 'Opiq',
    description: 'Eestikeelne digitaalne kursus: elektrivool, vooluring, Ohmi seadus, jada- ja rööpühendus.',
    topic: 'Elektrivool metallides ja vooluringi osad',
    quality: 5,
  },

  // F9.2.3 — Ohmi seadus I = U/R
  {
    curriculumCode: 'F9.2.3',
    title: "Ohm's Law and the V-I-R Relationship",
    url: 'https://www.physicsclassroom.com/class/circuits/Lesson-3/Ohm-s-Law',
    type: 'reading',
    language: 'en',
    isFree: true,
    provider: 'Physics Classroom',
    description: 'Ohmi seaduse selgitus: I = U/R, V-I-R kolmnurk, arvutusülesanded.',
    topic: 'Ohmi seadus I = U/R',
    quality: 5,
  },
  {
    curriculumCode: 'F9.2.3',
    title: "Ohm's Law Equation Video Tutorial",
    url: 'https://www.physicsclassroom.com/Physics-Video-Tutorial/Electric-Circuits/Ohms-Law',
    type: 'video',
    language: 'en',
    isFree: true,
    provider: 'Physics Classroom',
    description: 'Video-õpetus Ohmi seadusest — valemid, näited, arvutusnipid.',
    topic: 'Ohmi seadus I = U/R',
    quality: 4,
  },
  {
    curriculumCode: 'F9.2.3',
    title: 'Circuit Construction Kit: DC',
    url: 'https://phet.colorado.edu/en/simulations/circuit-construction-kit-dc',
    type: 'exercise',
    language: 'en',
    isFree: true,
    provider: 'PhET',
    description: 'Ehita virtuaalseid vooluringide, mõõda pinget ja voolutugevust, kontrolli Ohmi seadust.',
    topic: 'Ohmi seadus I = U/R',
    quality: 5,
  },

  // F9.2.6 — Jadaühenduse omadused
  {
    curriculumCode: 'F9.2.6',
    title: 'Series Circuits',
    url: 'https://www.physicsclassroom.com/class/circuits/lesson-4/series-circuits',
    type: 'reading',
    language: 'en',
    isFree: true,
    provider: 'Physics Classroom',
    description: 'Jadaühenduse reeglid: voolutugevus, pinge, kogutakistus — selgitused ja ülesanded.',
    topic: 'Jadaühenduse omadused',
    quality: 4,
  },

  // F9.2.7 — Rööpühenduse omadused
  {
    curriculumCode: 'F9.2.7',
    title: 'Parallel Circuits',
    url: 'https://www.physicsclassroom.com/class/circuits/lesson-4/parallel-circuits',
    type: 'reading',
    language: 'en',
    isFree: true,
    provider: 'Physics Classroom',
    description: 'Rööpühenduse reeglid: pinge, voolutugevuse jaotumine, kogutakistus.',
    topic: 'Rööpühenduse omadused',
    quality: 4,
  },

  // F9.2.8 — Elektrivoolu töö ja võimsus
  {
    curriculumCode: 'F9.2.8',
    title: 'Electric Circuits — Khan Academy',
    url: 'https://www.khanacademy.org/science/ap-physics-2/x0e2f5a2c:electric-circuits',
    type: 'course',
    language: 'en',
    isFree: true,
    provider: 'Khan Academy',
    description: 'Täielik kursus: vooluringid, Ohmi seadus, võimsus, energia — videod ja harjutused.',
    topic: 'Elektrivoolu töö A = IUt ja võimsus N = IU',
    quality: 4,
  },
  {
    curriculumCode: 'F9.2.8',
    title: 'Electric Power',
    url: 'https://www.khanacademy.org/science/ap-physics-2/x0e2f5a2c:ap-2-circuits/x0e2f5a2c:ap-2-circuits-with-resistors/v/electric-power',
    type: 'video',
    language: 'en',
    isFree: true,
    provider: 'Khan Academy',
    description: 'Elektrivõimsuse N = IU mõiste, arvutused ja praktilised näited.',
    topic: 'Elektrivoolu töö A = IUt ja võimsus N = IU',
    quality: 4,
  },

  // F9.2.10 — Koguvõimsus, kaitse, energiamaksumus
  {
    curriculumCode: 'F9.2.10',
    title: 'Combination Circuits',
    url: 'https://www.physicsclassroom.com/class/circuits/Lesson-4/Combination-Circuits',
    type: 'reading',
    language: 'en',
    isFree: true,
    provider: 'Physics Classroom',
    description: 'Jada- ja rööpühenduse kombinatsioonid, kogutakistus, koguvõimsus.',
    topic: 'Koguvõimsus, kaitse, energiamaksumus',
    quality: 4,
  },

  // General portals
  {
    curriculumCode: 'F9.1.1',
    title: 'TaskuTark — Füüsika 9. klass',
    url: 'https://www.taskutark.ee/m/aine/9-klass/fuusika-9-klass/',
    type: 'exercise',
    language: 'et',
    isFree: true,
    provider: 'TaskuTark',
    description: 'Eestikeelne harjutusportaal: testid, viktoriinid ja ülesanded 9. klassi füüsikale.',
    topic: 'Aine ehituse mudel ja agregaatolekud',
    quality: 3,
  },
];

async function seedMaterials() {
  console.log('📚 Seeding learning materials for 9th grade physics...\n');

  let created = 0;
  let skipped = 0;

  for (const m of MATERIALS) {
    // Check if already exists (by URL + code)
    const existing = await db.learningResource.findFirst({
      where: { url: m.url, curriculumCode: m.curriculumCode },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await db.learningResource.create({
      data: {
        curriculumCode: m.curriculumCode,
        title: m.title,
        url: m.url,
        type: m.type,
        language: m.language,
        isFree: m.isFree,
        provider: m.provider,
        description: m.description,
        gradeRange: '9',
        topic: m.topic,
        quality: m.quality,
        addedBy: null, // system seed
        verified: true,
        verifiedAt: new Date(),
      },
    });
    created++;
    console.log(`  ✅ ${m.curriculumCode} · ${m.title}`);
  }

  console.log(`\n✨ Done! Created: ${created}, Skipped (existing): ${skipped}`);
}

seedMaterials()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });
