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

// --- Rich, student-specific AI feedback for Soojusõpetus ---

const SOOJUS_FEEDBACK: Record<string, object> = {
  'Mari Kask': {
    test_info: { title: 'Soojusõpetus — koondkontrolltöö', topic: 'Soojusõpetus', class: '9c', score: '28/30', student: 'Mari Kask' },
    opieesmark: 'Hinnata soojusõpetuse põhiteemade omandamist: aine ehitus, soojusülekanne, soojushulk, olekute muutused',
    mis_laks_hasti: [
      { title: 'Aine ehituse sügav mõistmine', text: 'Mari kirjeldab osakeste liikumist eri olekutes täpselt — kasutab termineid „võnkumine", „kaootiliselt". See näitab, et ta mõistab mikroskooplist pilti, mitte ainult makroskoopilisi omadusi.' },
      { title: 'Soojusülekande kolm viisi', text: 'Kõik kolm soojusülekande viisi on nimetatud koos igapäevaste näidetega. Eriti hea on vaakumkolvi selgitus, mis seob kõik kolm viisi ühte praktilisse rakendusse.' },
      { title: 'Arvutusoskus', text: 'Soojushulga arvutus on veatu — valem, asendus ja arvutus on selgelt üles ehitatud ja ühikud korrektsed (J → kJ teisendus).' },
    ],
    mida_parandada: [
      { title: 'Optika faasigraafiku täpsus', text: 'Olekute muutuste graafik on korrektne, aga tahkise-vedel ülemineku platoo voiks olla selgemalt märgistatud (temperatuur püsib konstantsena sulamisel).' },
    ],
    uldine_muster: 'Suurepärane tulemus (93%). Mari valdab soojusõpetust väga heal tasemel. Eriti tugev on aine ehituse mikroskoopiline käsitlus ja soojusülekande praktiline mõistmine. Minimaalne kaotus on olekumuutuste graafiku detailsuses.',
    soovitused: [
      { title: 'Graafiku detailsus', text: 'Olekumuutuste graafikule lisa alati: 1) temperatuuri väärtused platoodele, 2) nooled olekute nimede juurde, 3) aja- või soojushulga telg. See annab täistulemuse.' },
      { title: 'Süvendamine', text: 'Proovi arvutusülesandeid, kus on mitu olekumuutust järjest (nt jää -10°C → vesi 100°C → aur). Need nõuavad mitut Q arvutust.' },
    ],
    pilk_ettepoole: 'Suurepärane baas! Järgmine teema (elektriõpetus) kasutab sarnast loogikat — valemite rakendamine ja graafikute lugemine.',
    markmed_opetajale: '',
    tasks: [
      { number: 1, question_summary: 'Aine ehitus ja temperatuur: osakeste liikumine eri olekutes, temperatuuri mõju', student_answer: 'Tahkes: osakesed tihedalt koos, võnguvad. Vedel: liiguvad vabamalt. Gaas: lendavad kaootiliselt. Kõrgem temp = kiirem liikumine.', is_correct: true, what_went_right: 'Kasutab korrektseid teaduslikke termineid ja kirjeldab kõiki kolme olekut mikroskoopiliselt.', what_went_wrong: null, advice: null, points_earned: '4', points_possible: '4' },
      { number: 2, question_summary: 'Soojusülekanne: kolm viisi ja nende rakendused', student_answer: 'Soojusjuhtivus (lusikas tees), konvektsioon (radiaator), kiirgus (päike). Vaakumkolvid kasutavad kõiki kolme.', is_correct: true, what_went_right: 'Kõik kolm viisi korrektselt nimetatud koos tabavate näidetega. Vaakumkolvi selgitus on üldarukas.', what_went_wrong: null, advice: null, points_earned: '3', points_possible: '3' },
      { number: 3, question_summary: 'Soojushulga arvutamine: Q = cmΔt', student_answer: 'Q = 4200 × 0.5 × 60 = 126 000 J = 126 kJ', is_correct: true, what_went_right: 'Valem, asendus ja arvutus on kõik korrektsed. Ühikute teisendus J → kJ on kena lisandus.', what_went_wrong: null, advice: null, points_earned: '4', points_possible: '4' },
      { number: 4, question_summary: 'Aine olekute muutused: sulamine, aurumine, graafik', student_answer: 'Sulamine: tahke→vedel (0°C). Aurumine: vedel→gaas (100°C). Graafik joonistatud.', is_correct: null, what_went_right: 'Olekumuutused on korrektselt defineeritud koos temperatuuridega.', what_went_wrong: 'Graafikul puudub selge platoo märgistus sulamise ja aurumise ajal.', advice: 'Lisa graafikule horisontaalsed lõigud sulamis- ja keemistemperatuuril ning märgi nende kõrvale "sulamine" ja "aurumine".', points_earned: '3', points_possible: '3' },
    ],
  },
  'Liis Kuusk': {
    test_info: { title: 'Soojusõpetus — koondkontrolltöö', topic: 'Soojusõpetus', class: '9c', score: '22/30', student: 'Liis Kuusk' },
    opieesmark: 'Hinnata soojusõpetuse põhiteemade omandamist: aine ehitus, soojusülekanne, soojushulk, olekute muutused',
    mis_laks_hasti: [
      { title: 'Soojushulga arvutus', text: 'Q = cmΔt arvutus on täiesti korrektne — valem, asendamine ja tulemus on veatult esitatud. See on kontrolltöö kõige keerukam arvutus ja Liis lahendas selle suurepäraselt.' },
      { title: 'Soojusülekande üldine mõistmine', text: 'Kolm soojusülekande viisi on nimetatud koos näidetega, kuigi näited on lihtsad — aga põhimõte on selge.' },
    ],
    mida_parandada: [
      { title: 'Aine ehituse mikroskoopiline käsitlus', text: 'Liis kirjutas "tahkes aines osakesed ei liigu" — tegelikult osakesed VÕNGUVAD oma tasakaaluasendite ümber. See on oluline erinevus, sest see selgitab soojuspaisumist.' },
      { title: 'Vaakumkolvi selgitus', text: 'Soojusülekande 2. osa (vaakumkolvi näide) jäi vastamata — see oleks andnud lisapunkti.' },
      { title: 'Olekumuutuste graafik', text: 'Graafikul puudub platoo — see horisontaalne osa, kus temperatuur ei muutu oleku muutumise ajal. See on oluline kontseptsioon.' },
    ],
    uldine_muster: 'Hea tulemus (73%). Liis mõistab soojusõpetuse põhimõisteid ja suudab soojushulga arvutust korrektselt teha. Peamised puudujäägid on aine ehituse mikroskoopilises käsitluses ja olekumuutuste graafiku täpsuses.',
    soovitused: [
      { title: 'Osakeste liikumine', text: 'Jäta meelde: tahkes aines osakesed VÕNGUVAD (mitte „ei liigu"). Hea mäluvihje: isegi jää on sisemusest „värinal" — seda saab mõõta soojusmõõtjaga.' },
      { title: 'Olekumuutuste graafik', text: 'Joonista uuesti: x-teljel aeg (või lisatud soojus), y-teljel temperatuur. Lisa platood 0°C (sulamine) ja 100°C (keemimine) juures.' },
      { title: 'Vaakumkolv', text: 'Uuri, kuidas vaakumkolb töötab — see seob kõik kolm soojusülekande viisi ühte praktilisse rakendusse.' },
    ],
    pilk_ettepoole: 'Arvutusoskus on tugev! Kui parandad aine ehituse mõistmist ja graafiku täpsust, on 85%+ järgmisel korral realistlik.',
    markmed_opetajale: '',
    tasks: [
      { number: 1, question_summary: 'Aine ehitus ja temperatuur', student_answer: 'Tahkes: osakesed ei liigu. Vedel: liiguvad natuke. Gaas: liiguvad palju. Temp mõjutab kiirust.', is_correct: null, what_went_right: 'Teab, et erinevates olekutes on osakeste liikumine erinev ja et temperatuur mõjutab kiirust.', what_went_wrong: 'Väide "tahkes aines osakesed ei liigu" on vale — osakesed võnguvad. Gaasi puhul on „liiguvad palju" liiga ebatäpne.', advice: 'Meelespea: tahke = osakesed VÕNGUVAD, vedel = liiguvad VABAMALT, gaas = liiguvad KAOOTILISELT suurte kiirustega.', points_earned: '3', points_possible: '4' },
      { number: 2, question_summary: 'Soojusülekanne: kolm viisi ja rakendused', student_answer: 'Soojusjuhtivus (metall), konvektsioon (soe õhk), kiirgus (päike). Vaakumkolv vastamata.', is_correct: null, what_went_right: 'Kolm soojusülekande viisi on korrektselt nimetatud.', what_went_wrong: 'Vaakumkolvi selgitus puudub — see oleks näidanud kõigi kolme viisi praktilist rakendamist.', advice: 'Vaakumkolvi töö: peegeldav pind (vs kiirgus) + vaakum (vs juhtivus ja konvektsioon) + tihe kork (vs juhtivus).', points_earned: '2', points_possible: '3' },
      { number: 3, question_summary: 'Soojushulga arvutamine: Q = cmΔt', student_answer: 'Q = cmΔt = 4200 × 0.5 × 60 = 126 000 J', is_correct: true, what_went_right: 'Täiuslik lahendus! Valem, asendus ja tulemus on kõik korrektsed.', what_went_wrong: null, advice: null, points_earned: '4', points_possible: '4' },
      { number: 4, question_summary: 'Aine olekute muutused ja graafik', student_answer: 'Sulamine ja aurumine nimetatud. Sulamine 0°C. Graafik osaliselt õige, platoo puudub.', is_correct: null, what_went_right: 'Teab sulamist ja aurumist ning sulamise temperatuuri.', what_went_wrong: 'Graafikul puudub platoo — horisontaalne osa, kus temperatuur ei muutu oleku muutumise ajal.', advice: 'Platoo tähendab: lisatud soojus kulub oleku muutmiseks, mitte temperatuuri tõstmiseks. Joonista see uuesti!', points_earned: '2', points_possible: '3' },
    ],
  },
  'Peeter Tamm': {
    test_info: { title: 'Soojusõpetus — koondkontrolltöö', topic: 'Soojusõpetus', class: '9c', score: '15/30', student: 'Peeter Tamm' },
    opieesmark: 'Hinnata soojusõpetuse põhiteemade omandamist: aine ehitus, soojusülekanne, soojushulk, olekute muutused',
    mis_laks_hasti: [
      { title: 'Soojushulga valemi tundmine', text: 'Peeter teab valemit Q = cmΔt ja suutis seda osaliselt rakendada. Valem on kirjutatud ja Δt arvutatud õigesti.' },
      { title: 'Soojuse liikumise suund', text: 'Peeter teab, et soojus liigub kuumast kehast külmasse — see on termodünaamika üks põhilisi seadusi.' },
    ],
    mida_parandada: [
      { title: 'Mikro- vs makroskoopiline kirjeldus', text: 'Aine ehituse ülesandes kirjeldas Peeter ainult makroskoopilisi omadusi (kõva, voolab, kerge) osakeste liikumise asemel. Füüsikas on oluline mõista, miks aine nii käitub — vastus peitub osakestes.' },
      { title: 'Soojusülekande viisid', text: 'Kolm soojusülekande viisi (juhtivus, konvektsioon, kiirgus) jäid nimetamata. Kirjeldas ainult üldist soojuse liikumist.' },
      { title: 'Soojushulga arvutusviga', text: 'Valemis Q = cmΔt unustati mass (m) — arvutas Q = cΔt, mis andis vale tulemuse. See on tüüpiline viga, mis on kergesti parandatav.' },
    ],
    uldine_muster: 'Rahuldav tulemus (50%). Peeter teab põhivalemeid ja -mõisteid, aga nende täpne kasutamine vajab harjutamist. Tugevaim on soojushulga valemi tundmine, nõrgim aine ehituse mikroskoopiline käsitlus.',
    soovitused: [
      { title: 'Osakeste kirjeldus', text: 'Harjuta: küsimusele "mis toimub aines" vastata ALATI osakeste tasandil. Tahke = võnguvad paigal, vedel = liiguvad vabamalt, gaas = lendavad kaootiliselt.' },
      { title: 'Soojusülekande kolmik', text: 'Õpi meelde kolmik: JU-KON-KII (juhtivus-konvektsioon-kiirgus). Igale lisa üks näide igapäevaelust.' },
      { title: 'Arvutuste kontroll', text: 'Enne arvutamist kirjuta välja: Q = c × m × Δt. Kontrolli, kas kõik kolm suurust on asendatud. Mass on sageli „unustatud" suurus!' },
    ],
    pilk_ettepoole: 'Põhivalemid on teada — nüüd on vaja neid täpsemalt rakendama õppida. 3-4 lisaülesannet soojushulga kohta tõstaksid tulemust märgatavalt.',
    markmed_opetajale: 'Peeter segab makro- ja mikroskoopilise kirjelduse — vajab selgitust, miks füüsikas kasutatakse osakeste mudelit. Kaaluge 1-2 konsultatsiooni.',
    tasks: [
      { number: 1, question_summary: 'Aine ehitus ja temperatuur', student_answer: 'Tahke kõva, vedel voolab, gaas kerge. Kui kuumem, paisub.', is_correct: null, what_went_right: 'Teab, et temperatuuri tõus põhjustab paisumist.', what_went_wrong: 'Kirjeldab ainult makroskoopilisi omadusi, mitte osakeste käitumist. "Gaas on kergem" pole korrektne.', advice: 'Füüsikas aine ehituse küsimusele vastates räägi ALATI osakestest, mitte ainest tervikuna.', points_earned: '2', points_possible: '4' },
      { number: 2, question_summary: 'Soojusülekanne', student_answer: 'Soojus liigub kuumast kehast külmasse. Termos hoiab sooja.', is_correct: null, what_went_right: 'Teab soojuse liikumise suunda — see on termodünaamika II seaduse alus.', what_went_wrong: 'Kolm soojusülekande viisi jäid nimetamata.', advice: 'Meelespea: JU-KON-KII. Juhtivus = kokkupuude, konvektsioon = voolamine, kiirgus = lained.', points_earned: '1', points_possible: '3' },
      { number: 3, question_summary: 'Soojushulga arvutamine: Q = cmΔt', student_answer: 'Q = cmΔt, Q = 4200 × 60 = 252000 J (mass unustatud)', is_correct: null, what_went_right: 'Teab valemit ja Δt on õigesti arvutatud (80-20=60).', what_went_wrong: 'Asenduses puudub mass (m = 0.5 kg). Seetõttu on vastus vale: peaks olema 126000 J.', advice: 'Enne arvutamist kirjuta välja: c = 4200, m = 0.5, Δt = 60. Siis asenda: Q = 4200 × 0.5 × 60.', points_earned: '2', points_possible: '4' },
      { number: 4, question_summary: 'Aine olekute muutused ja graafik', student_answer: 'Jää sulamine, vesi aurub. Graafik puudub.', is_correct: null, what_went_right: 'Nimetab kaks olulist olekumuutust.', what_went_wrong: 'Puudub detailsem selgitus ja graafik on joonistamata.', advice: 'Proovi graafikut joonistada: x=aeg, y=temperatuur. Lisa 0°C ja 100°C platood.', points_earned: '1', points_possible: '3' },
    ],
  },
  'Juhan Mets': {
    test_info: { title: 'Soojusõpetus — koondkontrolltöö', topic: 'Soojusõpetus', class: '9c', score: '8/30', student: 'Juhan Mets' },
    opieesmark: 'Hinnata soojusõpetuse põhiteemade omandamist: aine ehitus, soojusülekanne, soojushulk, olekute muutused',
    mis_laks_hasti: [
      { title: 'Põhimõistete tundmine', text: 'Juhan teab, et aine esineb kolmes olekus (tahke, vedel, gaas) ja et soojus liigub ühest kohast teise. Need on soojusõpetuse alused.' },
      { title: 'Olekumuutuse äratundmine', text: 'Juhan teab, et jää sulamine on olekumuutus — see näitab, et kontseptsiooni alus on olemas.' },
    ],
    mida_parandada: [
      { title: 'Aine olekute kirjeldamine', text: 'Kirjeldus "aine on kõva vedel ja gaas" on liiga lihtsustatud. Iga oleku kohta tuleb kirjeldada osakeste käitumist: asukoht, liikumisviis, kaugus.' },
      { title: 'Soojushulga arvutamine', text: 'Soojushulga valem on kirjutatud, aga arvutust pole tehtud. See tähendab, et valemis olevate suuruste asendamine vajab harjutamist.' },
      { title: 'Ülesannete lõpetamine', text: 'Mitu vastust on pooleli jäetud või tühjad. Ka osalisel lahendamisel saab punkte — proovi alati midagi kirjutada.' },
    ],
    uldine_muster: 'Nõrk tulemus (27%). Juhan teab mõisteid, aga ei suuda neid ülesannetes rakendada. Valemeid teab, aga arvutamist ei oska. Kõik neli teemat vajavad süstemaatilist kordamist.',
    soovitused: [
      { title: 'Alusta mõistetest', text: 'Koosta kaart: TAHKE (osakesed võnguvad paigal) → VEDEL (osakesed liiguvad vabamalt) → GAAS (osakesed lendavad kiiresti). Lisa igale pilt.' },
      { title: 'Soojushulga harjutamine', text: 'Proovi: Q = c × m × Δt. Kui c=4200, m=2kg, Δt=10°C: Q = 4200 × 2 × 10 = 84000 J. Lahenda 3 sellist ülesannet.' },
      { title: 'Küsi abi', text: 'Kasuta konsultatsiooniaega. Koos õpetajaga lahendamine aitab mõista, kuidas valemeid rakendada.' },
    ],
    pilk_ettepoole: 'Ärge heituge! Soojusõpetuse põhimõisted on teada — nüüd on vaja harjutada nende kasutamist ülesannetes. Väikeste sammudega edasi!',
    markmed_opetajale: 'Juhan vajab individuaalset lisatuge. Soovitan: 1) koostada temaga koos lihtsustatud valemileht, 2) 2-3 konsultatsiooni, kus lahendame koos lihtsamaid ülesandeid, 3) kaaluda paaristööd tugevama õpilasega.',
    tasks: [
      { number: 1, question_summary: 'Aine ehitus ja temperatuur', student_answer: 'Aine on kõva vedel ja gaas. Ülejäänud tühi.', is_correct: null, what_went_right: 'Teab, et aine esineb kolmes olekus.', what_went_wrong: 'Kirjeldus on liiga lihtsustatud — puudub osakeste käitumise kirjeldus ja temperatuuri mõju.', advice: 'Iga oleku kohta vasta: 1) kus osakesed asuvad, 2) kuidas liiguvad, 3) kui kaugel teineteisest on.', points_earned: '1', points_possible: '4' },
      { number: 2, question_summary: 'Soojusülekanne', student_answer: 'Soojus läheb ühest kohast teise. Ülejäänud tühi.', is_correct: null, what_went_right: 'Põhitõde on õige — soojus kandub kuumemalt kehalt jahedamale.', what_went_wrong: 'Kolm soojusülekande viisi (juhtivus, konvektsioon, kiirgus) jäid nimetamata.', advice: 'Õpi kolm sõna: JUHTIVUS (kokkupuude), KONVEKTSIOON (voolamine), KIIRGUS (lained). Lisa igale üks näide.', points_earned: '1', points_possible: '3' },
      { number: 3, question_summary: 'Soojushulga arvutamine: Q = cmΔt', student_answer: 'Ainult valem kirjutatud, arvutust pole.', is_correct: false, what_went_right: null, what_went_wrong: 'Valem on kirjutatud, aga arvutust pole — ilmselt pole selge, milliseid arve valemisse asendada.', advice: 'Harjuta asendamist: c = 4200 (vesi), m = 0.5 (kilogrammi), Δt = 80-20 = 60. Siis Q = 4200 × 0.5 × 60.', points_earned: '0', points_possible: '4' },
      { number: 4, question_summary: 'Aine olekute muutused ja graafik', student_answer: 'Jää sulamine on oleku muutus. Ülejäänud tühi.', is_correct: null, what_went_right: 'Teab, et jää sulamine on olekumuutus — see on õige!', what_went_wrong: 'Ainult üks olekumuutus nimetatud. Graafik ja aurumine puuduvad.', advice: 'Olekumuutused: sulamine (tahke→vedel), aurumine (vedel→gaas), tahkumine (vedel→tahke), kondenseerumine (gaas→vedel).', points_earned: '1', points_possible: '3' },
    ],
  },
};

function generateFeedback(_testTitle: string, sa: StudentAnswer): string {
  if (SOOJUS_FEEDBACK[sa.name]) {
    return JSON.stringify(SOOJUS_FEEDBACK[sa.name]);
  }
  // Fallback
  return JSON.stringify({
    test_info: { title: _testTitle, topic: 'Soojusõpetus', class: '9c', score: `${sa.score}/${sa.maxScore}`, student: sa.name },
    opieesmark: 'Kontrollida õpilase teadmisi soojusõpetuse teemadel',
    mis_laks_hasti: [{ title: 'Osalemine', text: 'Õpilane proovis ülesandeid lahendada.' }],
    mida_parandada: [{ title: 'Kordamine', text: 'Materjal vajab kordamist.' }],
    uldine_muster: `Tulemus: ${sa.score}/${sa.maxScore}.`,
    soovitused: [{ title: 'Harjutamine', text: 'Lahenda lisaülesandeid.' }],
    pilk_ettepoole: 'Jätkake harjutamist!',
    markmed_opetajale: '',
    tasks: [],
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
