/**
 * Seed script: Creates 4 demo test results with simulated handwritten test photos.
 * Picks "Soojusõpetus — koondkontrolltöö" from library, assigns to 4 existing students
 * with different success levels. Photos are simple SVG-based images rendered as base64.
 *
 * Run via: npx tsx scripts/seed-demo-results.ts
 * Idempotent — skips if results already exist for this test + these students.
 */

import { db } from '../lib/db';

// --- Simulated student answers at different skill levels ---

interface StudentAnswer {
  name: string;           // will be matched to DB student
  successLevel: string;   // label
  score: number;          // out of 30
  maxScore: number;
  answers: string;        // text shown on "photo"
}

const STUDENT_ANSWERS: StudentAnswer[] = [
  {
    name: 'Mari Kask',
    successLevel: 'Suurepärane (28/30)',
    score: 28,
    maxScore: 30,
    answers: `1. Aine ehitus ja temperatuur (4/4p)
a) Tahkes aines on osakesed tihedalt koos ja võnguvad
   paigal. Vedelikus liiguvad vabamalt, gaasis lendavad
   kaootiliselt.
b) Kõrgem temperatuur = kiirem liikumine = rohkem
   difusiooni ja suurem soojuspaisumine.

2. Soojusülekanne (3/3p)
a) Soojusjuhtivus - osakeselt osakesele (lusikas tees)
   Konvektsioon - sooja aine liikumine (radiaator)
   Soojuskiirgus - elektromagn. lained (päike)
b) Vaakumkolvid kasutavad kõiki kolme takistust.

3. Soojushulk Q = cm∆t (4/4p)
   Q = 4200 × 0.5 × (80-20)
   Q = 4200 × 0.5 × 60
   Q = 126 000 J = 126 kJ ✓

4. Aine olekute muutused (3/3p)
   Sulamine: tahke → vedel (jää sulamine 0°C)
   Aurumine: vedel → gaas (vee keemimine 100°C)
   Graafiku joonistus korrektne ✓`,
  },
  {
    name: 'Liis Kuusk',
    successLevel: 'Hea (22/30)',
    score: 22,
    maxScore: 30,
    answers: `1. Aine ehitus ja temperatuur (3/4p)
a) Tahkes aines osakesed ei liigu. Vedelikus liiguvad
   natuke. Gaasis liiguvad palju.
   (-1p: tahkes aines osakesed VÕNGUVAD, mitte "ei liigu")
b) Temperatuur mõjutab osakeste kiirust.

2. Soojusülekanne (2/3p)
a) Soojusjuhtivus - metall läheb kuumaks
   Konvektsioon - soe õhk tõuseb
   Soojuskiirgus - päike soojendab
b) (vastamata)

3. Soojushulk Q = cm∆t (4/4p)
   Q = cm∆t
   Q = 4200 × 0.5 × 60
   Q = 126 000 J ✓

4. Aine olekute muutused (2/3p)
   Sulamine ja aurumine on oleku muutused.
   Sulamine 0 kraadi juures.
   (graafik osaliselt õige, puudub platoo)`,
  },
  {
    name: 'Peeter Tamm',
    successLevel: 'Rahuldav (15/30)',
    score: 15,
    maxScore: 30,
    answers: `1. Aine ehitus ja temperatuur (2/4p)
a) Tahke aine on kõva. Vedel voolab. Gaas on kergem.
   (-2p: kirjeldas makroskoopilisi omadusi, mitte osakesi)
b) Kui kuumem on siis paisub

2. Soojusülekanne (1/3p)
a) Soojus liigub kuumast kehast külmasse
   (nimetamata kolm liiki)
b) Termos hoiab sooja

3. Soojushulk Q = cm∆t (2/4p)
   Q = cm∆t
   Q = 4200 × 60
   (unustatud mass, vastus vale)
   Q = 252 000 J

4. Aine olekute muutused (1/3p)
   Jää sulamine, vesi aurub
   (graafik puudub)`,
  },
  {
    name: 'Juhan Mets',
    successLevel: 'Nõrk (8/30)',
    score: 8,
    maxScore: 30,
    answers: `1. Aine ehitus ja temperatuur (1/4p)
a) aine on kõva vedel ja gaas
b) (tühi)

2. Soojusülekanne (1/3p)
a) soojus läheb ühest kohast teise
b) (tühi)

3. Soojushulk Q = cm∆t (0/4p)
   (ainult valem kirjutatud, arvutust pole)

4. Aine olekute muutused (1/3p)
   jää sulamine on oleku muutus
   (ülejäänud tühi)`,
  },
];

/**
 * Generate a simple SVG "handwritten test page" as a base64 data URL.
 */
function generateTestPhoto(studentName: string, testTitle: string, answers: string, score: number, maxScore: number): string {
  const lines = answers.split('\n');
  const lineHeight = 18;
  const startY = 120;
  const svgHeight = startY + lines.length * lineHeight + 60;

  const escapeSvg = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const textLines = lines.map((line, i) => {
    const y = startY + i * lineHeight;
    const color = line.includes('(-') || line.includes('vale') || line.includes('puudub') || line.includes('tühi')
      ? '#dc2626' : '#1a1a2e';
    return `<text x="40" y="${y}" fill="${color}" font-size="13" font-family="Georgia, serif">${escapeSvg(line)}</text>`;
  }).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="${svgHeight}" viewBox="0 0 600 ${svgHeight}">
  <rect width="600" height="${svgHeight}" fill="#fefce8" rx="0"/>
  <!-- Ruled lines -->
  ${Array.from({ length: Math.ceil(svgHeight / 24) }, (_, i) =>
    `<line x1="30" y1="${60 + i * 24}" x2="570" y2="${60 + i * 24}" stroke="#e5e7eb" stroke-width="0.5"/>`
  ).join('\n  ')}
  <!-- Left margin -->
  <line x1="35" y1="0" x2="35" y2="${svgHeight}" stroke="#fca5a5" stroke-width="1"/>
  <!-- Header -->
  <text x="40" y="30" font-size="16" font-weight="bold" fill="#1C2832" font-family="sans-serif">${escapeSvg(testTitle)}</text>
  <text x="40" y="52" font-size="13" fill="#374151" font-family="sans-serif">Nimi: ${escapeSvg(studentName)}</text>
  <text x="400" y="52" font-size="13" fill="#374151" font-family="sans-serif">Kuupäev: 25.03.2026</text>
  <text x="40" y="72" font-size="13" fill="#6b7280" font-family="sans-serif">Tulemus: ${score}/${maxScore} punkti</text>
  <line x1="30" y1="85" x2="570" y2="85" stroke="#DAD0A1" stroke-width="2"/>
  <!-- Student answers -->
  ${textLines}
</svg>`;

  // Convert to base64 data URL
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

function generateFeedback(testTitle: string, sa: StudentAnswer): string {
  const pct = Math.round((sa.score / sa.maxScore) * 100);
  const grade = pct >= 90 ? 'suurepärane' : pct >= 70 ? 'hea' : pct >= 50 ? 'rahuldav' : 'nõrk';
  const taskBlocks = sa.answers.split(/\n(?=\d+\.)/).filter(b => b.trim());
  const tasks = taskBlocks.map((block, i) => {
    const lines = block.trim().split('\n');
    const header = lines[0] || '';
    const pointsMatch = header.match(/\((\d+)\/(\d+)p?\)/);
    const earned = pointsMatch ? pointsMatch[1] : null;
    const possible = pointsMatch ? pointsMatch[2] : null;
    const earnedNum = earned ? parseInt(earned) : 0;
    const possibleNum = possible ? parseInt(possible) : 1;
    const isCorrect = earnedNum >= possibleNum ? true : earnedNum === 0 ? false : null;
    const body = lines.slice(1).join(' ').trim();
    return {
      number: i + 1,
      question_summary: header.replace(/\(\d+\/\d+p?\)/, '').replace(/^\d+\.\s*/, '').trim(),
      student_answer: body.substring(0, 200),
      is_correct: isCorrect,
      what_went_right: earnedNum > 0 ? 'Õpilane näitas teema mõistmist.' : null,
      what_went_wrong: earnedNum < possibleNum ? 'Mõned vastused vajavad täiendamist.' : null,
      advice: earnedNum < possibleNum ? 'Korda seda teemat õpikust.' : null,
      points_earned: earned,
      points_possible: possible,
    };
  });
  return JSON.stringify({
    test_info: { title: testTitle, topic: 'Soojusõpetus', class: '9. klass', score: `${sa.score}/${sa.maxScore}`, student: sa.name },
    opieesmark: 'Kontrollida õpilase teadmisi soojusõpetuse teemadel',
    mis_laks_hasti: pct >= 50
      ? [{ title: 'Põhimõisted', text: 'Õpilane tunneb soojusõpetuse põhimõisteid ja valemeid.' }]
      : [{ title: 'Osalemine', text: 'Õpilane proovis ülesandeid lahendada.' }],
    mida_parandada: pct < 90
      ? [{ title: 'Ülesannete lahendamine', text: 'Mõned arvutused vajavad täiendavat harjutamist.' }]
      : [],
    uldine_muster: `Tulemus on ${grade} (${pct}%). ${pct >= 70 ? 'Õpilane on materjali hästi omandanud.' : pct >= 50 ? 'Põhitõed on selged, kuid mõned teemad vajavad kordamist.' : 'Õpilane vajab lisatuge ja individuaalset lähenemist.'}`,
    soovitused: pct < 90
      ? [{ title: 'Harjuta', text: 'Lahenda lisaülesandeid soojusõpetuse peatükist.' }]
      : [{ title: 'Süvene', text: 'Proovi olümpiaadi tasemel ülesandeid.' }],
    pilk_ettepoole: pct >= 70 ? 'Jätka samas tempos!' : 'Keskenduge nõrkadele teemadele.',
    markmed_opetajale: pct < 50 ? 'Õpilane vajab individuaalset lisatuge.' : '',
    tasks,
  });
}

async function main() {
  console.log('\n=== Seeding demo test results ===\n');

  // 1. Find the test: "Soojusõpetus — koondkontrolltöö"
  const test = await db.test.findFirst({
    where: { title: 'Soojusõpetus — koondkontrolltöö' },
  });
  if (!test) {
    console.error('❌ Test "Soojusõpetus — koondkontrolltöö" not found');
    process.exit(1);
  }
  console.log(`✓ Found test: "${test.title}" (${test.id})`);

  // 2. Find the teacher profile (Demo Õpetaja)
  const teacher = await db.teacherProfile.findFirst({
    include: { user: true },
  });
  if (!teacher) {
    console.error('❌ No teacher profile found');
    process.exit(1);
  }
  console.log(`✓ Found teacher: ${teacher.user.name} (${teacher.id})`);

  // 3. Create a ScanBatch for the upload
  const batch = await db.scanBatch.create({
    data: {
      primaryTestId: test.id,
      uploadedBy: teacher.id,
      filename: 'soojusopetus_9c_25-03-2026.pdf',
      pageCount: 4,
      status: 'COMPLETE',
    },
  });
  console.log(`✓ Created scan batch: ${batch.id}`);

  // 4. For each student, create a TestResult + WorkPhoto
  for (const sa of STUDENT_ANSWERS) {
    // Find the student profile by name
    const student = await db.studentProfile.findFirst({
      where: {
        user: { name: sa.name },
      },
      include: { user: true },
    });

    if (!student) {
      console.log(`⚠ Student not found: "${sa.name}" — creating without studentId`);
    }

    // Check if result already exists
    const existing = await db.testResult.findFirst({
      where: {
        testId: test.id,
        studentName: sa.name,
      },
    });
    if (existing) {
      console.log(`⏭ Result already exists for ${sa.name} — skipping`);
      continue;
    }

    // Create TestResult in DRAFT status (AI has graded, teacher needs to review)
    const feedbackJson = generateFeedback(test.title, sa);
    const result = await db.testResult.create({
      data: {
        testId: test.id,
        scanBatchId: batch.id,
        studentId: student?.id ?? null,
        studentName: sa.name,
        status: 'DRAFT',
        score: sa.score,
        maxScore: sa.maxScore,
        rawFeedback: feedbackJson,
        storageMode: 'local_only',
        uploadedAt: new Date(Date.now() - 3600000),
        analyzedAt: new Date(),
      },
    });

    // Generate the "photo" of the student's test
    const photoBase64 = generateTestPhoto(sa.name, test.title, sa.answers, sa.score, sa.maxScore);

    await db.workPhoto.create({
      data: {
        testResultId: result.id,
        base64Data: photoBase64,
        storageMode: 'local_only',
      },
    });

    console.log(`✅ Created result + photo: ${sa.name} — ${sa.successLevel}`);
  }

  console.log('\n=== Done! 4 test results created in DRAFT status with AI feedback ===');
  console.log('Navigate to the test in the app to review them.\n');
}

main().catch(console.error);
