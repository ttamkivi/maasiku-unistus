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

// --- Rich, student-specific AI feedback ---
// Pre-written feedback per student for each test, matching what a real AI analysis would produce

interface RichFeedback {
  test_info: { title: string; topic: string; class: string; score: string; student: string };
  opieesmark: string;
  mis_laks_hasti: { title: string; text: string }[];
  mida_parandada: { title: string; text: string }[];
  uldine_muster: string;
  soovitused: { title: string; text: string }[];
  pilk_ettepoole: string;
  markmed_opetajale: string;
  tasks: {
    number: number; question_summary: string; student_answer: string;
    is_correct: boolean | null; what_went_right: string | null;
    what_went_wrong: string | null; advice: string | null;
    points_earned: string; points_possible: string;
  }[];
}

// ─── Aastalõpu koondkontrolltöö feedback per student ───
const AASTA_FEEDBACK: Record<string, RichFeedback> = {
  'Mari Kask': {
    test_info: { title: '9. klassi füüsika — aastalõpu koondkontrolltöö', topic: '9. klassi füüsika', class: '9c', score: '37/40', student: 'Mari Kask' },
    opieesmark: 'Hinnata 9. klassi füüsika põhiteemade (mehaanika, soojusõpetus, elektriõpetus, optika) omandamist aasta lõpus',
    mis_laks_hasti: [
      { title: 'Valemite rakendamine', text: 'Mari rakendab füüsikavalemeid enesekindlalt ja korrektselt. Newtoni II seadus, raskusjõu, töö ja võimsuse arvutused on kõik veatult lahendatud.' },
      { title: 'Soojusõpetuse terviklik mõistmine', text: 'Soojushulga arvutus on korrektne ja soojusülekande kolm viisi (soojusjuhtivus, konvektsioon, kiirgus) on kõik selgelt selgitatud.' },
      { title: 'Elektriõpetuse tugevus', text: 'Ohmi seaduse rakendamine on veatu, jadamis- ja rinnakutilülituse valemid on õigesti esitatud ja rakendatud.' },
    ],
    mida_parandada: [
      { title: 'Optika murdumisseadus', text: 'Murdumisseaduse (Snelli seadus) selgitus jäi poolikuks — puudub matemaatiline seos n₁sin θ₁ = n₂sin θ₂. Selgitus on kirjeldav, mitte kvantitatiivne.' },
    ],
    uldine_muster: 'Suurepärane tulemus (93%). Mari valdab 9. klassi füüsikat väga heal tasemel. Mehaanika, soojusõpetus ja elektriõpetus on täielikult omandatud. Ainuke nõrkus on optika murdumisseaduse matemaatiline käsitlus.',
    soovitused: [
      { title: 'Optika süvendamine', text: 'Harjuta Snelli seaduse arvutusülesandeid — eriti olukordi, kus valgus liigub ühest keskkonnast teise (nt õhk→klaas, vesi→õhk).' },
      { title: 'Olümpiaadi tase', text: 'Kaaluge füüsikaolümpiaadil osalemist — mehaanika ja elektriõpetuse tase on piisavalt tugev.' },
    ],
    pilk_ettepoole: 'Jätka samas tempos! Gümnaasiumis süveneb iga teema — tugev 9. klassi baas annab suure eelise.',
    markmed_opetajale: '',
    tasks: [
      { number: 1, question_summary: 'Mehaanika: jõud, raskusjõud, töö, võimsus', student_answer: 'F=ma=15N ✓, Fg=mg=588N ✓, A=Fs=150J ✓, P=A/t=30W ✓', is_correct: true, what_went_right: 'Kõik neli arvutust on korrektsed, ühikud õiged. Kasutab g=9.8, mis näitab täpsust.', what_went_wrong: null, advice: null, points_earned: '10', points_possible: '10' },
      { number: 2, question_summary: 'Soojusõpetus: soojushulk, soojusülekanne', student_answer: 'Q=cmΔt=420000J ✓, kolm soojusülekande viisi selgitatud', is_correct: true, what_went_right: 'Arvutus veatu, soojusülekande viisid on selgelt eristatud koos näidetega igapäevaelust.', what_went_wrong: null, advice: null, points_earned: '10', points_possible: '10' },
      { number: 3, question_summary: 'Elektriõpetus: Ohmi seadus, lülitused', student_answer: 'U=IR=10V ✓, jadamis R=R1+R2 ✓, rinnakuti 1/R=1/R1+1/R2 ✓', is_correct: true, what_went_right: 'Ohmi seadus ja mõlemad lülitustüübid on korrektselt käsitletud.', what_went_wrong: null, advice: null, points_earned: '10', points_possible: '10' },
      { number: 4, question_summary: 'Optika: murdumisseadus, läätsed, peegeldus', student_answer: 'Murdumisseadus kirjeldav. Läätsed joonistatud. Peegeldusülesanne lahendatud.', is_correct: null, what_went_right: 'Läätsede joonised on korrektsed ja peegeldustülesanne õigesti lahendatud.', what_went_wrong: 'Murdumisseaduse matemaatiline seos puudub — on ainult sõnaline kirjeldus.', advice: 'Õpi pähe Snelli seadus: n₁·sin(θ₁) = n₂·sin(θ₂). Harjuta ülesandeid, kus arvutad murdumisnurka.', points_earned: '7', points_possible: '10' },
    ],
  },
  'Liis Kuusk': {
    test_info: { title: '9. klassi füüsika — aastalõpu koondkontrolltöö', topic: '9. klassi füüsika', class: '9c', score: '29/40', student: 'Liis Kuusk' },
    opieesmark: 'Hinnata 9. klassi füüsika põhiteemade (mehaanika, soojusõpetus, elektriõpetus, optika) omandamist aasta lõpus',
    mis_laks_hasti: [
      { title: 'Valemite tundmine', text: 'Liis teab enamikku põhivalemeid (F=ma, Q=cmΔt, U=IR) ja oskab neid ülesannetes rakendada.' },
      { title: 'Süstemaatiline lähenemine', text: 'Ülesannete lahenduskäik on loogiline — alustab valemist, asendab väärtused, arvutab. See on hea harjumus.' },
    ],
    mida_parandada: [
      { title: 'Arvutusvigade kontrollimine', text: 'Mitmes kohas on valem õige, aga arvutuses tekib viga (töö arvutus, rinnakuti valem, murdumisseadus). Kontrollarvutuse tegemine aitaks.' },
      { title: 'Soojusülekande viisid', text: 'Soojuskiirgus jäi mainimata — nimetatud ainult soojusjuhtivus ja konvektsioon.' },
      { title: 'Optika tervikpilt', text: 'Murdumisseadus puudub täielikult. Optika osa vajab kordamist.' },
    ],
    uldine_muster: 'Hea tulemus (73%). Liis valdab põhimõisteid ja valemeid, aga arvutusvigade osakaal on kõrge. Mehaanika ja soojusõpetuse baas on tugev, elektriõpetuses ja optikas on lüngad.',
    soovitused: [
      { title: 'Kontrolli arvutusi', text: 'Harjuta „tagurpidi kontrollimist" — kui said vastuseks R=4Ω, asenda tagasi valemisse ja kontrolli, kas U=IR annab algse pinge.' },
      { title: 'Korda optikat', text: 'Loe optika peatükk uuesti läbi, eriti murdumisseadus ja täiskiirgus.' },
      { title: 'Rinnakutilülituse harjutamine', text: 'Lahenda 5 lisaülesannet rinnakutilülituse kohta — viga on tüüpiline ja parandatav.' },
    ],
    pilk_ettepoole: 'Põhialused on olemas! Kui väldid arvutusvigu ja tugevdad optikat, on 80%+ järgmisel korral realistlik.',
    markmed_opetajale: '',
    tasks: [
      { number: 1, question_summary: 'Mehaanika: jõud, raskusjõud, töö, võimsus', student_answer: 'F=ma=15N ✓, Fg≈600N (ligikaudne) ✓, töö arvutuses viga, P=A/t ✓', is_correct: null, what_went_right: 'Valemid on õiged, g=10 kasutamine on lubatud.', what_went_wrong: 'Töö arvutuses asendas vale jõu väärtuse — ilmselt kopeerimise viga.', advice: 'Kirjuta iga ülesande alguses selgelt välja "antud" ja "leida" — see vähendab kopeerimisvigu.', points_earned: '8', points_possible: '10' },
      { number: 2, question_summary: 'Soojusõpetus: soojushulk, soojusülekanne', student_answer: 'Q=cmΔt korrektne, soojusjuhtivus ja konvektsioon nimetatud, kiirgus puudu', is_correct: null, what_went_right: 'Soojushulga arvutus on veatu ja hästi üles ehitatud.', what_went_wrong: 'Soojuskiirgust ei mainitud — see on kolmas soojusülekande viis (nt Päike soojendab Maad).', advice: 'Meelespea: soojusülekande kolm viisi — juhtivus (kokkupuude), konvektsioon (voolamine), kiirgus (elektromagnetlained).', points_earned: '8', points_possible: '10' },
      { number: 3, question_summary: 'Elektriõpetus: Ohmi seadus, lülitused', student_answer: 'U=IR korrektne, jadamis korrektne, rinnakuti valemis rakendamise viga', is_correct: null, what_went_right: 'Jadamislülituse käsitlus on korrektne ja Ohmi seaduse rakendamine veatu.', what_went_wrong: 'Rinnakutilülituse valemis (1/R = 1/R1 + 1/R2) tehti viga lõpptulemuse arvutamisel — sai R, mitte 1/R.', advice: 'Harjuta: arvuta esmalt 1/R, siis pööra ümber. Tüüpiline viga on unustada viimast sammu.', points_earned: '7', points_possible: '10' },
      { number: 4, question_summary: 'Optika: murdumisseadus, läätsed, peegeldus', student_answer: 'Murdumisseadus puudu, läätsed korrektsed, peegeldusülesanne poolik', is_correct: null, what_went_right: 'Läätsede kirjeldus on hea — eristab koondavat ja hajutavat.', what_went_wrong: 'Murdumisseadus puudub täielikult. Peegeldusülesanne jäi poolikuks — alustatud, aga arvutust pole lõpuni viidud.', advice: 'Optika vajab kõige rohkem kordamist. Alusta lihtsatest murdumisülesannetest ja liigu keerukamale.', points_earned: '6', points_possible: '10' },
    ],
  },
  'Peeter Tamm': {
    test_info: { title: '9. klassi füüsika — aastalõpu koondkontrolltöö', topic: '9. klassi füüsika', class: '9c', score: '20/40', student: 'Peeter Tamm' },
    opieesmark: 'Hinnata 9. klassi füüsika põhiteemade (mehaanika, soojusõpetus, elektriõpetus, optika) omandamist aasta lõpus',
    mis_laks_hasti: [
      { title: 'Valemite mäletamine', text: 'Peeter teab olulisemaid valemeid (F=ma, Q=cmΔt, U=IR, A=Fs) — see näitab, et põhitõed on omandatud.' },
      { title: 'Soojusõpetuse baas', text: 'Soojushulga arvutus ja soojusülekande viisid on korrektselt käsitletud. See on tugev osa.' },
    ],
    mida_parandada: [
      { title: 'Valemite rakendamine', text: 'Valem on teada, aga arvutuses läheb sageli valesti — kas vale arvu asendamine või arvutusviga. See viitab harjutamise puudujäägile.' },
      { title: 'Elektriõpetuse lülitused', text: 'Jadamis- ja rinnakutilülitust aetakse segamini. Peeter peab need kaks süsteemi selgemalt eristama.' },
      { title: 'Optika nõrk', text: 'Optika osa on suuresti lahendamata — ainult läätsed nimetatud, aga ülesanded tegemata.' },
    ],
    uldine_muster: 'Rahuldav tulemus (50%). Peeter teab põhivalemeid, aga nende rakendamine ülesannetes vajab märkimisväärset harjutamist. Soojusõpetus on tugevaim, optika nõrgim valdkond.',
    soovitused: [
      { title: 'Lahenda näidisülesandeid samm-sammult', text: 'Võta iga teema kohta 3 näidisülesannet ja lahenda need koos lahenduskäiguga. Keskendu „antud → valem → asendus → vastus" struktuurile.' },
      { title: 'Jadamis vs rinnakuti', text: 'Joonista mõlema lülitustüübi skeem ja kirjuta kõrvale nende erinevused. Riputage see seinale õppimise ajaks.' },
      { title: 'Optika algusest peale', text: 'Alusta optika peatükist algusest: valguse sirgjooneline levimine → peegeldus → murdumine → läätsed. Iga sammu juures lahenda üks ülesanne.' },
    ],
    pilk_ettepoole: 'Alused on olemas, aga vajavad tugevdamist. Keskenduge eriti elektriõpetusele ja optikale — need kaks teemat annavad kõige rohkem punkte juurde.',
    markmed_opetajale: 'Peeter vajab tõenäoliselt lisaharjutusi valemite rakendamise kohta. Kaaluge konsultatsiooni, kus lahendatakse koos 2-3 ülesannet iga teema kohta.',
    tasks: [
      { number: 1, question_summary: 'Mehaanika: jõud, raskusjõud, töö, võimsus', student_answer: 'F=ma valem õige, arvutus vale. Raskusjõud puudu. Töö korrektne. Võimsus puudulik.', is_correct: null, what_went_right: 'Teab F=ma ja A=Fs valemeid ning suudab töö korrektselt arvutada.', what_went_wrong: 'Jõu arvutuses asendas vale väärtuse. Raskusjõu ülesanne jäi vastamata. Võimsuse valem on poolik.', advice: 'Harjuta: kirjuta ALATI välja kõik antud suurused enne arvutamist. See aitab vältida asendusvigu.', points_earned: '5', points_possible: '10' },
      { number: 2, question_summary: 'Soojusõpetus: soojushulk, soojusülekanne', student_answer: 'Q=cmΔt korrektne, soojusülekande viisid nimetatud', is_correct: null, what_went_right: 'Soojushulga valem ja arvutus on korrektsed! Soojusülekande kolm viisi on nimetatud.', what_went_wrong: 'Soojusülekande viisid on nimetatud, aga selgitused puuduvad.', advice: 'Lisa igale viisile üks näide: juhtivus (kuumad potid), konvektsioon (tuul), kiirgus (lõke).', points_earned: '6', points_possible: '10' },
      { number: 3, question_summary: 'Elektriõpetus: Ohmi seadus, lülitused', student_answer: 'U=IR valem teada, arvutuses viga. Jadamis ja rinnakuti segamini.', is_correct: null, what_went_right: 'Teab Ohmi seadust ja suudab seda sõnastada.', what_went_wrong: 'Jadamis- ja rinnakutilülituse omadused on segamini aetud — kirjutas jadamislülituse juurde rinnakuti reeglid.', advice: 'Meelespea: jadamis = VOOLUTUGEVUS SAMA, rinnakuti = PINGE SAMA. Korda seda lauset enne ülesande lahendamist.', points_earned: '5', points_possible: '10' },
      { number: 4, question_summary: 'Optika: murdumisseadus, läätsed, peegeldus', student_answer: 'Läätsed nimetatud (koondav, hajutav). Ülesanded lahendamata.', is_correct: false, what_went_right: 'Teab koondava ja hajutava läätse erinevust.', what_went_wrong: 'Murdumis- ja peegeldustülesanded on täielikult lahendamata. Ainult läätsede nimetused kirjutatud.', advice: 'Alusta peegeldusseadusest (langemisnurk = peegeldumisnurk) ja lahenda 2-3 lihtsat ülesannet.', points_earned: '4', points_possible: '10' },
    ],
  },
  'Juhan Mets': {
    test_info: { title: '9. klassi füüsika — aastalõpu koondkontrolltöö', topic: '9. klassi füüsika', class: '9c', score: '11/40', student: 'Juhan Mets' },
    opieesmark: 'Hinnata 9. klassi füüsika põhiteemade (mehaanika, soojusõpetus, elektriõpetus, optika) omandamist aasta lõpus',
    mis_laks_hasti: [
      { title: 'Mõistete tundmine', text: 'Juhan tunneb füüsika põhimõisteid — ta teab, et jõud, töö, voolutugevus ja pinge on olulised suurused.' },
      { title: 'Proovimise julgus', text: 'Juhan proovis iga teema juures midagi vastata, isegi kui polnud kindel. See on parem kui tühjaks jätmine.' },
    ],
    mida_parandada: [
      { title: 'Valemite õppimine', text: 'Mitmed valemid on kas puudu või valed (nt F = mass × kiirus F=ma asemel). Valemilehe koostamine ja regulaarne kordamine on hädavajalik.' },
      { title: 'Ülesannete lahendamise oskus', text: 'Paljud ülesanded on jäetud lahendamata. Juhan peab harjutama ülesannete lahendamise samm-sammulist meetodit.' },
      { title: 'Optika ja elektriõpetus', text: 'Need kaks valdkonda on peaaegu täielikult omandamata. Vajab süstemaatilist kordamist algusest peale.' },
    ],
    uldine_muster: 'Nõrk tulemus (28%). Juhan tunneb mõisteid, aga valemite ja arvutusoskuste tase ei vasta nõuetele. Kõik neli teemat vajavad kordamist, eriti optika ja elektriõpetus.',
    soovitused: [
      { title: 'Koosta valemileht', text: 'Kirjuta ühele paberile kõik valemid: F=ma, A=Fs, P=A/t, Q=cmΔt, U=IR. Korda neid iga päev 5 minutit.' },
      { title: 'Lahenda lihtsamaid ülesandeid', text: 'Ära alusta keerulisest — võta õpiku iga peatüki algusest 2-3 kõige lihtsamat ülesannet ja lahenda need.' },
      { title: 'Küsi abi', text: 'Kasuta konsultatsiooniaega — õpetaja saab aidata samm-sammult lahenduskäiku selgeks teha.' },
    ],
    pilk_ettepoole: 'Ärge heituge! Füüsika valemite õppimine on nagu keeleõpe — regulaarne harjutamine annab tulemuse. Alustage väikeste sammudega.',
    markmed_opetajale: 'Juhan vajab individuaalset tuge. Soovitan: 1) valemilehe koostamine koos õpilasega, 2) 2-3 konsultatsiooni, kus lahendame koos lihtsaid ülesandeid, 3) võimalusel tugiõpe paaristööna tugevama õpilasega.',
    tasks: [
      { number: 1, question_summary: 'Mehaanika: jõud, raskusjõud, töö, võimsus', student_answer: 'F = mass × kiirus (vale valem), raskusjõud tühi, A=Fs õige idee, võimsus tühi', is_correct: null, what_went_right: 'Teab, et töö on seotud jõu ja teepikkusega (A=Fs).', what_went_wrong: 'Põhivalem F=ma on valesti meeles (kirjutas F=mv). Raskusjõud ja võimsus on jäetud vastamata.', advice: 'Mäletamise nipp: F=ma — „Füüsika = mass korda a" (mitte kiirus!). Kirjuta see paberile ja korda.', points_earned: '3', points_possible: '10' },
      { number: 2, question_summary: 'Soojusõpetus: soojushulk, soojusülekanne', student_answer: 'Soojushulga valem puudu. Nimetab soojusjuhtivust.', is_correct: null, what_went_right: 'Teab soojusjuhtivuse mõistet.', what_went_wrong: 'Soojushulga valemit (Q=cmΔt) ei tea. Soojusülekandest teab ainult ühte viisi.', advice: 'Õpi: Q = c·m·Δt. c = erisoojus (vee oma on 4200), m = mass, Δt = temperatuuri muutus.', points_earned: '3', points_possible: '10' },
      { number: 3, question_summary: 'Elektriõpetus: Ohmi seadus, lülitused', student_answer: 'U=IR valem teada, ülesanne lahendamata', is_correct: null, what_went_right: 'Teab Ohmi seadust (U=IR) — see on kõige olulisem elektriõpetuse valem.', what_went_wrong: 'Valemit ei suuda ülesandes rakendada — puudub oskus antud andmeid valemisse asendada.', advice: 'Harjuta: kui U=12V ja R=4Ω, siis I=U/R=12/4=3A. Lahenda 5 sellist ülesannet.', points_earned: '3', points_possible: '10' },
      { number: 4, question_summary: 'Optika: murdumisseadus, läätsed, peegeldus', student_answer: 'Mainib peegli ja läätse mõistet. Ülesanded tühjad.', is_correct: false, what_went_right: 'Teab, et peegel ja lääts on optika põhimõisted.', what_went_wrong: 'Ühtegi optika ülesannet pole lahendatud. Teadmised piirduvad mõistetega, puudub arusaamine.', advice: 'Alusta kõige lihtsamast: peegeldusseadus ütleb, et langemisnurk = peegeldumisnurk. Joonista see.', points_earned: '2', points_possible: '10' },
    ],
  },
};

// ─── Elektriõpetus feedback per student ───
const ELEKTRI_FEEDBACK: Record<string, RichFeedback> = {
  'Mari Kask': {
    test_info: { title: 'Elektriõpetus — koondkontrolltöö', topic: 'Elektriõpetus', class: '9c', score: '24/25', student: 'Mari Kask' },
    opieesmark: 'Kontrollida elektriõpetuse põhiteemade omandamist: voolutugevus, pinge, takistus, Ohmi seadus, lülitused, energia ja võimsus',
    mis_laks_hasti: [
      { title: 'Ohmi seaduse meisterlik valdamine', text: 'Mari rakendab U=IR ja sellest tulenevaid valemeid (I=U/R, R=U/I) veatult igas kontekstis.' },
      { title: 'Lülitustüüpide eristamine', text: 'Jadamis- ja rinnakutilülituse omadused on selgelt eristatud. Valemid on korrektsed ja arvutused veatut.' },
      { title: 'Praktiline oskus', text: 'Skeemi joonistus on professionaalne — korrektse sümbolikaga ja loogilise paigutusega. Mõõtmised on korrektsed.' },
    ],
    mida_parandada: [
      { title: 'Praktilise ülesande järeldus', text: 'Katse järeldus jäi napisõnaliseks — Mari kirjutas mida mõõtis, aga ei selgitanud miks tulemused seda näitavad.' },
    ],
    uldine_muster: 'Suurepärane tulemus (96%). Mari valdab elektriõpetust peaaegu täiuslikult. Ainus puudujääk on praktilise ülesande järelduse sõnastamine — teadmised on olemas, aga järelduste formuleerimine vajab veidi harjutamist.',
    soovitused: [
      { title: 'Järelduste kirjutamine', text: 'Harjuta „järelduse kolmikut": 1) mida uurisin, 2) mida mõõtsin, 3) mida see näitab (seos suuruste vahel).' },
      { title: 'Edasijõudnud teemad', text: 'Proovi keerukamaid vooluringi ülesandeid — segalülitusi (jadamis + rinnakuti koos) ja Kirchhoffi seadusi.' },
    ],
    pilk_ettepoole: 'Elektriõpetus on suurepäraselt omandatud! Gümnaasiumis tuleb juurde magnetism ja elektromagnetism — tugev alus annab eelise.',
    markmed_opetajale: '',
    tasks: [
      { number: 1, question_summary: 'Voolutugevus ja pinge: I=Q/t, U=IR', student_answer: 'I=Q/t=10/5=2A ✓, U=IR=2×3=6V ✓', is_correct: true, what_went_right: 'Mõlemad arvutused on veatult lahendatud, ühikud korrektsed.', what_went_wrong: null, advice: null, points_earned: '5', points_possible: '5' },
      { number: 2, question_summary: 'Takistus ja Ohmi seadus: R=U/I, graafik', student_answer: 'R=U/I=12/3=4Ω ✓, graafikult lugemine korrektne ✓', is_correct: true, what_went_right: 'Valemit rakendab enesekindlalt. Graafikust U-I sõltuvuse lugemine on korrektne.', what_went_wrong: null, advice: null, points_earned: '5', points_possible: '5' },
      { number: 3, question_summary: 'Jadamis- ja rinnakutilülitus', student_answer: 'Jadamis: I=const, U=U1+U2, R=R1+R2 ✓. Rinnakuti: U=const, I=I1+I2, 1/R=1/R1+1/R2 ✓', is_correct: true, what_went_right: 'Mõlemad lülitustüübid on täielikult ja korrektselt käsitletud.', what_went_wrong: null, advice: null, points_earned: '5', points_possible: '5' },
      { number: 4, question_summary: 'Elektrienergia ja võimsus: P=UI, E=Pt', student_answer: 'P=UI=220×0.5=110W ✓, E=Pt=110×3600=396000J ✓', is_correct: true, what_went_right: 'Arvutused korrektsed, ühikute teisendamine (tunnid → sekundid) veatu.', what_went_wrong: null, advice: null, points_earned: '5', points_possible: '5' },
      { number: 5, question_summary: 'Praktiline ülesanne: vooluringi koostamine', student_answer: 'Skeem korrektne, mõõtmised õiged, järeldus puudulik', is_correct: null, what_went_right: 'Skeemi joonistus ja mõõtmised on korrektsed ja selged.', what_went_wrong: 'Järeldus kirjeldab ainult mõõtmistulemusi, aga ei seosta neid teooriaga (nt „see kinnitab Ohmi seadust, sest...").', advice: 'Kirjuta järeldus kolmes lauses: 1) mida uurisin, 2) mida sain tulemuseks, 3) kuidas see seostub teooriaga.', points_earned: '4', points_possible: '5' },
    ],
  },
  'Liis Kuusk': {
    test_info: { title: 'Elektriõpetus — koondkontrolltöö', topic: 'Elektriõpetus', class: '9c', score: '19/25', student: 'Liis Kuusk' },
    opieesmark: 'Kontrollida elektriõpetuse põhiteemade omandamist: voolutugevus, pinge, takistus, Ohmi seadus, lülitused, energia ja võimsus',
    mis_laks_hasti: [
      { title: 'Ohmi seadus ja takistus', text: 'Takistuse arvutus R=U/I on veatu ja graafikult lugemine on korrektne. See näitab head arusaamist U-I sõltuvusest.' },
      { title: 'Jadamislülitus', text: 'Jadamislülituse omadused on korrektselt käsitletud — voolutugevus on sama, pinge jaotub.' },
    ],
    mida_parandada: [
      { title: 'Arvutusvigade kontrollimine', text: 'U=IR arvutuses tekkis väike viga — tõenäoliselt korrutamisviga. Sarnane muster nagu aastalõpu töös.' },
      { title: 'Rinnakutilülituse valem', text: 'Rinnakutilülituse kogutakistuse arvutamisel tehti viga — 1/R tulemust ei pööratud ümber.' },
      { title: 'Energia ühikute teisendamine', text: 'E=Pt arvutuses ei teisendatud aega sobivatesse ühikutesse (tunnid jäid sekunditeks teisendamata).' },
    ],
    uldine_muster: 'Hea tulemus (76%). Liis mõistab elektriõpetuse põhimõisteid ja suudab lihtsamaid ülesandeid lahendada. Nõrkus on arvutusvigades ja ühikute teisendamises — need on tehnilised vead, mida harjutamine parandab.',
    soovitused: [
      { title: 'Ühikute teisendamine', text: 'Harjuta süstemaatiliselt: 1h = 3600s, 1kW = 1000W, 1kWh = 3 600 000J. Kirjuta need enne ülesande lahendamist välja.' },
      { title: 'Rinnakuti kontrollarvutus', text: 'Pärast 1/R arvutamist tee ALATI kontrollarvutus: korrutades R ja 1/R peab tulema 1.' },
      { title: 'Praktiline harjutamine', text: 'Koosta kodus lihtne vooluahel (patarei + LED + takisti) ja mõõda multimeetriga. See aitab teooriat praktikaga siduda.' },
    ],
    pilk_ettepoole: 'Elektriõpetuse põhiosa on omandatud! Rinnakutilülituse ja ühikute teisendamise harjutamine tõstab tulemust märgatavalt.',
    markmed_opetajale: '',
    tasks: [
      { number: 1, question_summary: 'Voolutugevus ja pinge: I=Q/t, U=IR', student_answer: 'I=Q/t korrektne, U=IR väike arvutusviga', is_correct: null, what_went_right: 'Voolutugevuse arvutus on veatu.', what_went_wrong: 'Pinge arvutuses korrutamisviga — sai 7V, peaks olema 6V.', advice: 'Kontrolli: kui I=2A ja R=3Ω, siis U=2×3=6V. Lihtne korrutamine — vaata üle.', points_earned: '4', points_possible: '5' },
      { number: 2, question_summary: 'Takistus ja Ohmi seadus: R=U/I, graafik', student_answer: 'R=U/I korrektne ✓, graafikult lugemine korrektne ✓', is_correct: true, what_went_right: 'Mõlemad ülesanded on veatult lahendatud — hea töö!', what_went_wrong: null, advice: null, points_earned: '5', points_possible: '5' },
      { number: 3, question_summary: 'Jadamis- ja rinnakutilülitus', student_answer: 'Jadamis korrektne. Rinnakuti valemis rakendamise viga.', is_correct: null, what_went_right: 'Jadamislülitus on korrektselt lahendatud.', what_went_wrong: 'Rinnakutilülituse 1/R = 1/R1 + 1/R2 arvutuse viimane samm puudu — ei arvutanud R väärtust.', advice: 'Retsept: 1) arvuta 1/R, 2) pööra ümber: R = 1/(1/R). Ära unusta viimast sammu!', points_earned: '4', points_possible: '5' },
      { number: 4, question_summary: 'Elektrienergia ja võimsus: P=UI, E=Pt', student_answer: 'P=UI korrektne, E=Pt — ühikute teisendamise viga', is_correct: null, what_went_right: 'Võimsuse valem ja arvutus on korrektne.', what_went_wrong: 'Energia arvutuses ei teisendanud tunde sekunditeks: kasutab E=110×2 (tundi), peaks olema E=110×7200 (sekundit).', advice: 'Energia SI ühik on džaul (J). Kui aeg on tundides, teisenda: 2h = 2 × 3600s = 7200s.', points_earned: '3', points_possible: '5' },
      { number: 5, question_summary: 'Praktiline ülesanne: vooluringi koostamine', student_answer: 'Skeem osaliselt korrektne, mõõtmised tehtud', is_correct: null, what_went_right: 'Mõõtmised on tehtud ja tulemused üles märgitud.', what_went_wrong: 'Skeemis on ampermeeter valesti ühendatud (rinnakuti asemel jadamisse) — see on tüüpiline viga, aga oluline.', advice: 'Meelespea: ampermeeter = jadamisse (mõõdab voolutugevust), voltmeeter = rinnakuti (mõõdab pinget).', points_earned: '3', points_possible: '5' },
    ],
  },
  'Peeter Tamm': {
    test_info: { title: 'Elektriõpetus — koondkontrolltöö', topic: 'Elektriõpetus', class: '9c', score: '13/25', student: 'Peeter Tamm' },
    opieesmark: 'Kontrollida elektriõpetuse põhiteemade omandamist: voolutugevus, pinge, takistus, Ohmi seadus, lülitused, energia ja võimsus',
    mis_laks_hasti: [
      { title: 'Põhivalemite tundmine', text: 'Peeter teab Ohmi seadust (U=IR) ja võimsuse valemit (P=UI) — need on elektriõpetuse kaks kõige olulisemat valemit.' },
      { title: 'Jadamislülituse mõistmine', text: 'Jadamislülituse alused on selged — teab, et voolutugevus on sama ja takistused liidetakse.' },
    ],
    mida_parandada: [
      { title: 'Arvutuste lõpuleviimine', text: 'Mitu ülesannet on alustatud (valem kirja pandud), aga arvutust pole lõpuni viidud. Peeter peab harjutama terve lahenduskäigu läbitegemist.' },
      { title: 'Rinnakutilülitus', text: 'Rinnakutilülituse ülesanne on tühi — see teema vajab kordamist nullist.' },
      { title: 'Praktiline oskus', text: 'Skeemi joonistamine ja mõõteriistade kasutamine vajab harjutamist — skeem on puudulik.' },
    ],
    uldine_muster: 'Rahuldav tulemus (52%). Peeter teab põhivalemeid, aga ülesannete lõpuni lahendamine ja keerukamad teemad (rinnakutilülitus, praktiline töö) vajavad märgatavat lisatööd.',
    soovitused: [
      { title: 'Ülesannete lõpuleviimine', text: 'Harjuta: iga ülesanne peab lõppema arvulise vastusega JA ühikuga. Enne edasi liikumist kontrolli, kas vastus on realistlik.' },
      { title: 'Rinnakutilülitus eraldi', text: 'Lahenda 5 rinnakutilülituse ülesannet samm-sammult: 1) joonista skeem, 2) kirjuta valemid, 3) arvuta.' },
      { title: 'Skeemide joonistamine', text: 'Harjuta vooluahela skeemide joonistamist — kasuta õigeid sümboleid (patarei, takisti, lamp, lüliti).' },
    ],
    pilk_ettepoole: 'Põhialused on paigas! Keskenduge rinnakutilülitusele ja ülesannete lõpuni lahendamisele — need kaks asja annavad kõige rohkem punkte juurde.',
    markmed_opetajale: 'Peeter alustab ülesandeid, aga jätab pooleli. Kaaluge ajastrateegia harjutamist — ülesande kohta kindel aeg ja siis edasi.',
    tasks: [
      { number: 1, question_summary: 'Voolutugevus ja pinge: I=Q/t, U=IR', student_answer: 'I=Q/t valem teada, U=IR arvutusviga', is_correct: null, what_went_right: 'Mõlemad valemid on teada.', what_went_wrong: 'Voolutugevuse arvutus on õige, aga pinge arvutuses asendas vale väärtuse.', advice: 'Kirjuta selgelt välja: I=2A, R=3Ω, siis U=I×R=2×3=6V. Kontrolli igat asendust.', points_earned: '3', points_possible: '5' },
      { number: 2, question_summary: 'Takistus ja Ohmi seadus: R=U/I, graafik', student_answer: 'R=U/I teab valemit, graafikult lugemine vale', is_correct: null, what_went_right: 'Teab R=U/I valemit ja suudab seda sõnastada.', what_went_wrong: 'Graafikust luges vale väärtuse — tõenäoliselt ajas x- ja y-telje segi.', advice: 'Graafiku lugemisel: kontrolli ALATI, mis suurus on millisel teljel. U on tavaliselt y-teljel.', points_earned: '3', points_possible: '5' },
      { number: 3, question_summary: 'Jadamis- ja rinnakutilülitus', student_answer: 'Jadamis poolik, rinnakuti tühi', is_correct: null, what_went_right: 'Jadamislülituse alused on teada.', what_went_wrong: 'Jadamislülituse ülesanne jäi pooleli ja rinnakutilülitust pole üldse proovitud.', advice: 'Õpi meelde: rinnakutis on PINGE SAMA kõigil harudel, 1/R = 1/R1 + 1/R2. Harjuta 5 ülesannet.', points_earned: '2', points_possible: '5' },
      { number: 4, question_summary: 'Elektrienergia ja võimsus: P=UI, E=Pt', student_answer: 'P=UI korrektne, E arvutamata', is_correct: null, what_went_right: 'Võimsuse arvutus on korrektne — hea!', what_went_wrong: 'Energia arvutust ei ole üldse proovitud.', advice: 'Energia valem on lihtne: E = P × t. Kui P=110W ja t=3600s, siis E=396000J. Proovi!', points_earned: '3', points_possible: '5' },
      { number: 5, question_summary: 'Praktiline ülesanne: vooluringi koostamine', student_answer: 'Skeem puudulik, ülesanne poolik', is_correct: null, what_went_right: 'Proovib skeemi joonistada — patarei ja takisti on olemas.', what_went_wrong: 'Puuduvad mõõteriistad (ampermeeter, voltmeeter) ja vooluahel pole kinnine.', advice: 'Vooluahel PEAB olema kinnine ring: patarei → juhe → takisti → juhe → tagasi patareisse.', points_earned: '2', points_possible: '5' },
    ],
  },
  'Juhan Mets': {
    test_info: { title: 'Elektriõpetus — koondkontrolltöö', topic: 'Elektriõpetus', class: '9c', score: '7/25', student: 'Juhan Mets' },
    opieesmark: 'Kontrollida elektriõpetuse põhiteemade omandamist: voolutugevus, pinge, takistus, Ohmi seadus, lülitused, energia ja võimsus',
    mis_laks_hasti: [
      { title: 'Mõistete tundmine', text: 'Juhan teab mõisteid „voolutugevus" ja „pinge" ning tunneb Ohmi seaduse valemit U=IR.' },
      { title: 'Jadamislülituse põhimõte', text: 'Teab, et jadamislülituses on voolutugevus sama — see on õige ja oluline arusaam.' },
    ],
    mida_parandada: [
      { title: 'Valemite rakendamine', text: 'Juhan teab U=IR valemit, aga ei suuda seda ülesandes rakendada. Puudub oskus antud andmeid valemisse asendada.' },
      { title: 'Ülesannete lahendamine üldiselt', text: 'Enamik ülesandeid on jäetud tühjaks. Isegi kui pole kindel, on oluline proovida — osalise lahenduse eest saab punkte.' },
      { title: 'Võimsuse ja energia mõisted', text: 'Ei tea võimsuse valemit (P=UI) ega energia valemit (E=Pt). Need on kontrolltöö neljanda osa põhivaadmised.' },
    ],
    uldine_muster: 'Nõrk tulemus (28%). Juhan tunneb mõisteid ja teab Ohmi seadust, aga ei suuda teadmisi ülesannetes rakendada. Kõik teemad peale Ohmi seaduse vajavad süstemaatilist kordamist.',
    soovitused: [
      { title: 'Alusta Ohmi seaduse harjutamisest', text: 'Kuna teab U=IR, siis harjuta: 1) Arvuta U, kui I=3A, R=2Ω. 2) Arvuta I, kui U=12V, R=4Ω. 3) Arvuta R, kui U=6V, I=2A.' },
      { title: 'Üks valem korraga', text: 'Ära proovi kõike korraga — õpi sel nädalal ainult P=UI ja lahenda 5 ülesannet. Järgmisel nädalal E=Pt.' },
      { title: 'Küsi abi klassis', text: 'Paluge õpetajalt või klassikaaslaselt abi — koos lahendamine on tõhusam kui üksi.' },
    ],
    pilk_ettepoole: 'Ohmi seaduse tundmine on hea alus! Sellest valemist on võimalik tuletada palju — alustage sellest ja ehitage teadmised samm-sammult üles.',
    markmed_opetajale: 'Juhan vajab individuaalset tuge elektriõpetuses. Soovitan: 1) valemileht lihtsustatud kujul, 2) konsultatsioon, kus lahendame koos 3-4 Ohmi seaduse ülesannet, 3) paaris- või rühmatöö tugevama õpilasega praktikatunnis.',
    tasks: [
      { number: 1, question_summary: 'Voolutugevus ja pinge: I=Q/t, U=IR', student_answer: 'Mainib mõisteid, valemid puudu', is_correct: null, what_went_right: 'Teab, et voolutugevus ja pinge on olulised suurused.', what_went_wrong: 'Valemeid ei ole kirjutatud ega ülesandeid lahendatud.', advice: 'Õpi: I = Q/t (voolutugevus = laeng / aeg). Proovi: kui Q=10C ja t=5s, siis I=10/5=2A.', points_earned: '2', points_possible: '5' },
      { number: 2, question_summary: 'Takistus ja Ohmi seadus: R=U/I, graafik', student_answer: 'R=U/I valem teada, ülesannet ei lahenda', is_correct: null, what_went_right: 'Teab valemit R=U/I — see on oluline.', what_went_wrong: 'Ei rakenda valemit ülesandes. Graafikut ei loe.', advice: 'Proovi: kui U=12V ja I=3A, siis R=12/3=4Ω. Kirjuta see välja ja kontrolli.', points_earned: '2', points_possible: '5' },
      { number: 3, question_summary: 'Jadamis- ja rinnakutilülitus', student_answer: 'Jadamis: „voolutugevus on sama". Muu tühi.', is_correct: null, what_went_right: 'Teab jadamislülituse põhiomadust — voolutugevus on sama.', what_went_wrong: 'Jadamislülituse teised omadused puudu. Rinnakutilülitus täielikult puudu.', advice: 'Jadamis: I sama, U=U1+U2, R=R1+R2. Rinnakuti: U sama, I=I1+I2, 1/R=1/R1+1/R2. Kirjuta need välja ja korda.', points_earned: '1', points_possible: '5' },
      { number: 4, question_summary: 'Elektrienergia ja võimsus: P=UI, E=Pt', student_answer: 'P=... (ei tea valemit)', is_correct: false, what_went_right: null, what_went_wrong: 'Võimsuse valemit ei tea. Energia ülesanne on tühi.', advice: 'Õpi kaks valemit: P = U × I (võimsus = pinge × voolutugevus), E = P × t (energia = võimsus × aeg).', points_earned: '1', points_possible: '5' },
      { number: 5, question_summary: 'Praktiline ülesanne: vooluringi koostamine', student_answer: 'Skeem puudu, kirjutab „mõõtsin takistust"', is_correct: null, what_went_right: 'Teab, et praktiline ülesanne on seotud mõõtmistega.', what_went_wrong: 'Skeemi pole joonistatud, mõõtmistulemusi pole esitatud.', advice: 'Harjuta skeemide joonistamist — patarei (+/-), takisti (siksakk), lamp (ring ristiga). See on praktikatunni põhioskus.', points_earned: '1', points_possible: '5' },
    ],
  },
};

function generateFeedback(testTitle: string, sa: StudentAnswer): string {
  // Use pre-written rich feedback if available
  if (testTitle.includes('aastalõpu') && AASTA_FEEDBACK[sa.name]) {
    return JSON.stringify(AASTA_FEEDBACK[sa.name]);
  }
  if (testTitle.includes('Elektriõpetus') && ELEKTRI_FEEDBACK[sa.name]) {
    return JSON.stringify(ELEKTRI_FEEDBACK[sa.name]);
  }
  // Fallback (shouldn't happen with our seed data)
  return JSON.stringify({
    test_info: { title: testTitle, topic: testTitle.split('—')[0]?.trim() || testTitle, class: '9c', score: `${sa.score}/${sa.maxScore}`, student: sa.name },
    opieesmark: `Kontrollida õpilase teadmisi teemal "${testTitle.split('—')[0]?.trim()}"`,
    mis_laks_hasti: [{ title: 'Osalemine', text: 'Õpilane proovis ülesandeid lahendada.' }],
    mida_parandada: [{ title: 'Kordamine', text: 'Materjal vajab kordamist.' }],
    uldine_muster: `Tulemus: ${sa.score}/${sa.maxScore} (${Math.round((sa.score / sa.maxScore) * 100)}%).`,
    soovitused: [{ title: 'Harjutamine', text: 'Lahenda lisaülesandeid õpikust.' }],
    pilk_ettepoole: 'Jätkake harjutamist!',
    markmed_opetajale: '',
    tasks: [],
  });
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
