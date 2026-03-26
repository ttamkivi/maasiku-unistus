/**
 * Seed script: Creates 4 demo test results each for two more tests:
 *   - "9. klassi füüsika — aastalõpu koondkontrolltöö"
 *   - "Elektriõpetus — koondkontrolltöö"
 *
 * Run via: npx tsx scripts/seed-more-results.ts
 * Idempotent — skips if results already exist for a test + student pair.
 */

import { db } from '../lib/db';

interface StudentAnswer {
  name: string;
  score: number;
  maxScore: number;
  answers: string;
}

// --- Aastalõpu koondkontrolltöö answers (max 40p) ---
const AASTA_ANSWERS: StudentAnswer[] = [
  {
    name: 'Mari Kask',
    score: 37,
    maxScore: 40,
    answers: `1. Mehaanika (10/10p)
a) F = ma = 5 × 3 = 15 N ✓
b) Raskusjõud = mg = 60 × 9.8 = 588 N ✓
c) Töö = Fs = 15 × 10 = 150 J ✓
d) Võimsus = A/t = 150/5 = 30 W ✓

2. Soojusõpetus (10/10p)
Q = cm∆t = 4200 × 2 × 50 = 420 000 J ✓
Soojusjuhtivus, konvektsioon, kiirgus — kõik selgitatud ✓

3. Elektriõpetus (10/10p)
U = IR = 2 × 5 = 10 V ✓
Jadamis: R = R1+R2, Rinnakuti: 1/R = 1/R1 + 1/R2 ✓

4. Optika (7/10p)
Murdumisseadus selgitatud osaliselt.
Läätsed: koondav ja hajutav — joonised korrektsed.
Peegeldumise ülesanne lahendatud.`,
  },
  {
    name: 'Liis Kuusk',
    score: 29,
    maxScore: 40,
    answers: `1. Mehaanika (8/10p)
a) F = ma = 5 × 3 = 15 N ✓
b) Raskusjõud = mg = 60 × 10 = 600 N (ligikaudne) ✓
c) Töö = Fs, aga arvutuses viga
d) Võimsus = A/t ✓

2. Soojusõpetus (8/10p)
Q = cm∆t arvutus korrektne
Soojusülekande viisid nimetatud, aga kiirgus puudu

3. Elektriõpetus (7/10p)
U = IR korrektne
Jadamis korrektne, rinnakuti valemis viga

4. Optika (6/10p)
Murdumisseadus puudu
Läätsed korrektsed
Peegeldumise ülesanne poolik`,
  },
  {
    name: 'Peeter Tamm',
    score: 20,
    maxScore: 40,
    answers: `1. Mehaanika (5/10p)
a) F = ma — õige valem, vale arvutus
b) Raskusjõud puudu
c) Töö = Fs korrektne
d) Võimsus puudulik

2. Soojusõpetus (6/10p)
Q = cm∆t korrektne
Soojusülekande viisid nimetatud

3. Elektriõpetus (5/10p)
U = IR — valem teab, arvutuses viga
Jadamis/rinnakuti segamini

4. Optika (4/10p)
Läätsed nimetatud
Ülesanded lahendamata`,
  },
  {
    name: 'Juhan Mets',
    score: 11,
    maxScore: 40,
    answers: `1. Mehaanika (3/10p)
a) Jõud = mass × kiirus (vale valem)
b) Tühi
c) Töö = jõud × tee — õige idee
d) Tühi

2. Soojusõpetus (3/10p)
Soojushulga valem puudu
Nimetab "soojusjuhtivust"

3. Elektriõpetus (3/10p)
U = IR — valem teab
Ülesanne lahendamata

4. Optika (2/10p)
Mainib "peegli" ja "läätse"
Ülesanded tühjad`,
  },
];

// --- Elektriõpetus answers (max 25p) ---
const ELEKTRI_ANSWERS: StudentAnswer[] = [
  {
    name: 'Mari Kask',
    score: 24,
    maxScore: 25,
    answers: `1. Voolutugevus ja pinge (5/5p)
I = Q/t = 10/5 = 2 A ✓
U = IR = 2 × 3 = 6 V ✓

2. Takistus ja Ohmi seadus (5/5p)
R = U/I = 12/3 = 4 Ω ✓
Graafikult lugemine korrektne ✓

3. Järjestik- ja rinnakutilülitus (5/5p)
Jadamis: I = const, U = U1+U2, R = R1+R2 ✓
Rinnakuti: U = const, I = I1+I2, 1/R = 1/R1 + 1/R2 ✓

4. Elektrienergia ja võimsus (5/5p)
P = UI = 220 × 0.5 = 110 W ✓
E = Pt = 110 × 3600 = 396 000 J ✓

5. Praktiline ülesanne (4/5p)
Skeemi joonistus korrektne
Mõõtmised ja arvutused õiged
Järeldus puudulik`,
  },
  {
    name: 'Liis Kuusk',
    score: 19,
    maxScore: 25,
    answers: `1. Voolutugevus ja pinge (4/5p)
I = Q/t korrektne
U = IR — väike arvutusviga

2. Takistus ja Ohmi seadus (5/5p)
R = U/I korrektne ✓
Graafikult lugemine korrektne ✓

3. Järjestik- ja rinnakutilülitus (4/5p)
Jadamis korrektne
Rinnakuti — valemi rakendamisel viga

4. Elektrienergia ja võimsus (3/5p)
P = UI korrektne
E = Pt — ühikute teisendamise viga

5. Praktiline ülesanne (3/5p)
Skeem osaliselt korrektne
Mõõtmised tehtud`,
  },
  {
    name: 'Peeter Tamm',
    score: 13,
    maxScore: 25,
    answers: `1. Voolutugevus ja pinge (3/5p)
I = Q/t — teab valemit
U = IR — arvutusviga

2. Takistus ja Ohmi seadus (3/5p)
R = U/I teab
Graafikult lugemine vale

3. Järjestik- ja rinnakutilülitus (2/5p)
Jadamis poolik
Rinnakuti tühi

4. Elektrienergia ja võimsus (3/5p)
P = UI korrektne
E arvutamata

5. Praktiline ülesanne (2/5p)
Skeem puudulik
Ülesanne poolik`,
  },
  {
    name: 'Juhan Mets',
    score: 7,
    maxScore: 25,
    answers: `1. Voolutugevus ja pinge (2/5p)
Mainib "voolutugevus" ja "pinge"
Valemid puudu

2. Takistus ja Ohmi seadus (2/5p)
R = U/I — teab valemit
Ei lahenda ülesannet

3. Järjestik- ja rinnakutilülitus (1/5p)
Jadamis — "voolutugevus on sama"
Muu tühi

4. Elektrienergia ja võimsus (1/5p)
P = ... (ei tea valemit)

5. Praktiline ülesanne (1/5p)
Skeem puudu
Kirjutab "mõõtsin takistust"`,
  },
];

// --- AI feedback generator ---
function generateFeedback(testTitle: string, sa: StudentAnswer): string {
  const pct = Math.round((sa.score / sa.maxScore) * 100);
  const grade = pct >= 90 ? 'suurepärane' : pct >= 70 ? 'hea' : pct >= 50 ? 'rahuldav' : 'nõrk';

  // Parse task blocks from answers text
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

  const feedback = {
    test_info: {
      title: testTitle,
      topic: testTitle.split('—')[0]?.trim() || testTitle,
      class: '9. klass',
      score: `${sa.score}/${sa.maxScore}`,
      student: sa.name,
    },
    opieesmark: `Kontrollida õpilase teadmisi teemal "${testTitle.split('—')[0]?.trim()}"`,
    mis_laks_hasti: pct >= 50
      ? [{ title: 'Põhimõisted', text: 'Õpilane tunneb aine põhimõisteid ja valemeid.' }]
      : [{ title: 'Osalemine', text: 'Õpilane proovis ülesandeid lahendada.' }],
    mida_parandada: pct < 90
      ? [{ title: 'Ülesannete lahendamine', text: 'Mõned arvutused vajavad täiendavat harjutamist.' }]
      : [],
    uldine_muster: `Tulemus on ${grade} (${pct}%). ${pct >= 70 ? 'Õpilane on materjali hästi omandanud.' : pct >= 50 ? 'Põhitõed on selged, kuid mõned teemad vajavad kordamist.' : 'Õpilane vajab lisatuge ja individuaalset lähenemist.'}`,
    soovitused: pct < 90
      ? [{ title: 'Harjuta', text: 'Lahenda lisaülesandeid õpiku peatükist.' }]
      : [{ title: 'Süvene', text: 'Proovi olümpiaadi tasemel ülesandeid.' }],
    pilk_ettepoole: pct >= 70
      ? 'Jätka samas tempos! Järgmine teema ehitab sellele materjalile.'
      : 'Keskenduge nõrkadele teemadele enne järgmist kontrolltööd.',
    markmed_opetajale: pct < 50
      ? 'Õpilane vajab individuaalset lisatuge. Kaaluda konsultatsiooni.'
      : '',
    tasks,
  };

  return JSON.stringify(feedback);
}

// --- SVG test photo generator ---
function escapeSvg(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateTestPhoto(
  testTitle: string,
  studentName: string,
  score: number,
  maxScore: number,
  answers: string,
  date: string,
): string {
  const lines = answers.split('\n');
  const lineHeight = 18;
  const svgHeight = 120 + lines.length * lineHeight;
  let textLines = '';
  lines.forEach((line, i) => {
    const y = 110 + i * lineHeight;
    const fill = line.match(/^\d+\./) ? '#1C2832' : '#374151';
    const weight = line.match(/^\d+\./) ? 'bold' : 'normal';
    const size = line.match(/^\d+\./) ? 14 : 13;
    textLines += `  <text x="40" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" font-family="serif">${escapeSvg(line)}</text>\n`;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="${svgHeight}" viewBox="0 0 600 ${svgHeight}">
  <rect width="600" height="${svgHeight}" fill="#fffef5"/>
  ${Array.from({ length: Math.ceil(svgHeight / 24) }, (_, i) =>
    `<line x1="30" y1="${24 * (i + 1)}" x2="570" y2="${24 * (i + 1)}" stroke="#dbeafe" stroke-width="0.5"/>`
  ).join('\n  ')}
  <line x1="35" y1="0" x2="35" y2="${svgHeight}" stroke="#fca5a5" stroke-width="1"/>
  <text x="40" y="30" font-size="16" font-weight="bold" fill="#1C2832" font-family="sans-serif">${escapeSvg(testTitle)}</text>
  <text x="40" y="52" font-size="13" fill="#374151" font-family="sans-serif">Nimi: ${escapeSvg(studentName)}</text>
  <text x="400" y="52" font-size="13" fill="#374151" font-family="sans-serif">Kuupäev: ${date}</text>
  <text x="40" y="72" font-size="13" fill="#6b7280" font-family="sans-serif">Tulemus: ${score}/${maxScore} punkti</text>
  <line x1="30" y1="85" x2="570" y2="85" stroke="#DAD0A1" stroke-width="2"/>
  ${textLines}
</svg>`;

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// --- Seed one test ---
async function seedTest(
  testTitle: string,
  studentAnswers: StudentAnswer[],
  filename: string,
  date: string,
) {
  const test = await db.test.findFirst({ where: { title: testTitle } });
  if (!test) {
    console.error(`❌ Test "${testTitle}" not found — skipping`);
    return;
  }
  console.log(`\n✓ Found test: "${test.title}" (${test.id})`);

  const teacher = await db.teacherProfile.findFirst({ include: { user: true } });
  if (!teacher) {
    console.error('❌ No teacher profile found');
    return;
  }

  const batch = await db.scanBatch.create({
    data: {
      primaryTestId: test.id,
      uploadedBy: teacher.id,
      filename,
      pageCount: studentAnswers.length,
      status: 'COMPLETE',
    },
  });
  console.log(`✓ Created scan batch: ${batch.id}`);

  for (const sa of studentAnswers) {
    const student = await db.studentProfile.findFirst({
      where: { user: { name: sa.name } },
      include: { user: true },
    });

    const existing = await db.testResult.findFirst({
      where: { testId: test.id, studentName: sa.name },
    });
    if (existing) {
      console.log(`⏭ Result already exists for ${sa.name} — skipping`);
      continue;
    }

    const feedbackJson = generateFeedback(testTitle, sa);
    const result = await db.testResult.create({
      data: {
        testId: test.id,
        studentId: student?.id ?? null,
        studentName: sa.name,
        scanBatchId: batch.id,
        status: 'DRAFT',
        score: sa.score,
        maxScore: sa.maxScore,
        rawFeedback: feedbackJson,
        analyzedAt: new Date(),
        uploadedAt: new Date(Date.now() - 3600000), // 1h before analysis
      },
    });

    const photoData = generateTestPhoto(testTitle, sa.name, sa.score, sa.maxScore, sa.answers, date);
    await db.workPhoto.create({
      data: {
        testResultId: result.id,
        base64Data: photoData,
        storageMode: 'local_only',
      },
    });

    console.log(`  ✓ ${sa.name}: ${sa.score}/${sa.maxScore} (${result.id})`);
  }

  // Update test status — results are analyzed, ready for teacher review
  await db.test.update({
    where: { id: test.id },
    data: { status: 'PROCESSING' },
  });
  console.log(`✓ Updated test status to PROCESSING (results in DRAFT)`);
}

async function main() {
  console.log('\n=== Seeding demo results for 2 more tests ===\n');

  await seedTest(
    '9. klassi füüsika — aastalõpu koondkontrolltöö',
    AASTA_ANSWERS,
    'aasta_koond_9c_20-03-2026.pdf',
    '20.03.2026',
  );

  await seedTest(
    'Elektriõpetus — koondkontrolltöö',
    ELEKTRI_ANSWERS,
    'elektriopetus_9c_18-03-2026.pdf',
    '18.03.2026',
  );

  console.log('\n✅ Done!\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
