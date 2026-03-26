/**
 * Seed script: Creates 5 example 9th-grade physics tests in the public library.
 *
 * Run via: npx tsx scripts/seed-library-tests.ts
 *
 * Prerequisites:
 *   - Main seed already run (subjects, demo teacher exist)
 *   - Database accessible via TURSO_DATABASE_URL / TURSO_AUTH_TOKEN
 */

import { db } from '../lib/db';

interface LibraryTest {
  title: string;
  topic: string;
  grade: string;
  rubric: string;
  answerKey: string;
  blankTestNotes: string;
  curriculumLinks: {
    curriculumCode: string;
    topicLabel: string;
    gradeRange: string;
    weightPercent: number;
  }[];
}

const LIBRARY_TESTS: LibraryTest[] = [
  // ─── Test 1: Soojusõpetus — Aine ehitus ja temperatuur ─────────────────
  {
    title: 'Aine ehitus ja temperatuur',
    topic: 'Soojusõpetus',
    grade: '9',
    rubric: `Hindamisjuhend (kokku 20 punkti):

1. Aine ehituse mudel (4p)
   - Kirjeldab aineosakeste liikumist eri agregaatolekutes (2p)
   - Selgitab difusiooni ja soojuspaisumise seost aineosakeste liikumisega (2p)

2. Temperatuur ja termomeetrid (4p)
   - Selgitab temperatuuri seost aineosakeste liikumise kiirusega (2p)
   - Kirjeldab termomeetri tööpõhimõtet ja temperatuuriskaalasid (Celsius, Kelvin) (2p)

3. Agregaatolekud (4p)
   - Eristab tahke aine, vedeliku ja gaasi omadusi (2p)
   - Selgitab üleminekuid agregaatolekute vahel (2p)

4. Arvutusülesanne (4p)
   - Valem õigesti kirjutatud (1p)
   - Ühikud korrektsed (1p)
   - Arvutuskäik näidatud (1p)
   - Õige vastus (1p)

5. Rakendusülesanne (4p)
   - Füüsikaline selgitus (2p)
   - Igapäevaelu seos (2p)

Hindamine: 18-20p = "5", 14-17p = "4", 10-13p = "3", 5-9p = "2", 0-4p = "1"`,
    answerKey: `Õiged vastused:

1a) Tahkes aines on osakesed tihedalt koos ja võnguvad oma tasakaaluasendi ümber. Vedelikus liiguvad osakesed vabamalt, kuid on omavahel seotud. Gaasis liiguvad osakesed kaootiliselt ja suure kiirusega.

1b) Difusioon toimub, kuna aineosakesed liiguvad pidevalt ja segunevad iseeneslikult. Soojuspaisumine toimub, kuna temperatuuri tõustes suureneb osakeste liikumise kiirus ja keskmine kaugus osakeste vahel suureneb.

2a) Temperatuur on seotud aineosakeste keskmise kineetilise energiaga — mida kõrgem temperatuur, seda kiiremini osakesed liiguvad.

2b) Termomeeter kasutab vedeliku soojuspaisumist — temperatuuri tõustes vedelik paisub ja tõuseb kapillaaris kõrgemale. Celsius: 0°C = jää sulamistemperatuur, 100°C = vee keemistemperatuur. Kelvin: 0 K = absoluutne null (-273,15°C).

3a) Tahke aine: kindel kuju ja ruumala. Vedelik: kindel ruumala, võtab anuma kuju. Gaas: täidab kogu ruumala, on kokkusurutav.

3b) Sulamine (tahke → vedelik), tahkumine (vedelik → tahke), aurumine (vedelik → gaas), kondenseerumine (gaas → vedelik), sublimatsioon (tahke → gaas), härmatumine (gaas → tahke).

4) Näide: Kui palju soojust on vaja 2 kg vee soojendamiseks 20°C-lt 80°C-ni?
Q = cm(t₂ – t₁) = 4200 · 2 · (80 – 20) = 4200 · 2 · 60 = 504 000 J = 504 kJ

5) Miks metallkäepide tundub külmem kui puitkäepide?
Metall juhib soojust paremini (suurem soojusjuhtivus) — soojus liigub käest metallist kiiremini ära kui puidust, mistõttu metall tundub külmem, kuigi mõlemad on tegelikult ühel temperatuuril.`,
    blankTestNotes: 'Tööaeg 40 minutit. Kalkulaator lubatud. Valemileht antakse eraldi.',
    curriculumLinks: [
      { curriculumCode: 'F9.1.1', topicLabel: 'Aine ehituse mudel ja agregaatolekud', gradeRange: '9', weightPercent: 20 },
      { curriculumCode: 'F9.1.2', topicLabel: 'Aineosakeste liikumine ja temperatuur', gradeRange: '9', weightPercent: 20 },
      { curriculumCode: 'F9.1.3', topicLabel: 'Soojuspaisumine ja difusioon', gradeRange: '9', weightPercent: 20 },
      { curriculumCode: 'F9.1.4', topicLabel: 'Soojushulk ja erisoojus (Q = cm∆t)', gradeRange: '9', weightPercent: 20 },
      { curriculumCode: 'F9.1.5', topicLabel: 'Soojusülekande liigid igapäevaelus', gradeRange: '9', weightPercent: 20 },
    ],
  },

  // ─── Test 2: Soojusõpetus — Soojusülekanne ────────────────────────────
  {
    title: 'Soojusülekanne ja energia',
    topic: 'Soojusõpetus',
    grade: '9',
    rubric: `Hindamisjuhend (kokku 25 punkti):

1. Soojusülekande liigid (6p)
   - Kirjeldab soojusjuhtivust ja toob näite (2p)
   - Kirjeldab konvektsiooni ja toob näite (2p)
   - Kirjeldab soojuskiirgust ja toob näite (2p)

2. Siseenergia mõiste (4p)
   - Defineerib siseenergia (2p)
   - Nimetab siseenergia muutmise viise (töö tegemine, soojusülekanne) (2p)

3. Soojushulga arvutused (9p)
   - Ülesanne 1: Q = cm(t₂ – t₁) — valem (1p), lahenduskäik (1p), vastus (1p)
   - Ülesanne 2: soojuslik tasakaal — valem (1p), võrrandi koostamine (2p), lahendus (1p), vastus (1p), ühikud (1p)

4. Energia jäävuse seadus soojusprotsessides (3p)
   - Sõnastab seaduse (1p)
   - Rakendab kalorimeetria ülesandes (2p)

5. Rakendused looduses ja tehnikas (3p)
   - Selgitab kliimaga seotud soojusülekannet (nt merebriis, soojussaar) (3p)

Hindamine: 22-25p = "5", 17-21p = "4", 12-16p = "3", 6-11p = "2", 0-5p = "1"`,
    answerKey: `Õiged vastused:

1) Soojusjuhtivus: soojus kandub aine osakeselt osakesele ilma aine ülekandeta. Näide: metalllusikas kuumas tees soojeneb.
Konvektsioon: soojus kandub vedeliku/gaasi vooludega. Näide: toa kütmine radiaatoriga — soe õhk tõuseb, külm langeb.
Soojuskiirgus: soojus kandub elektromagnetlainete kaudu, ei vaja ainet. Näide: Päike soojendab Maad.

2) Siseenergia on keha kõigi osakeste kineetilise ja potentsiaalse energia summa. Muutub: a) soojusülekandel (nt kütmine), b) töö tegemisel (nt hõõrdumine).

3) Ülesanne 1: 0,5 kg alumiiniumi soojendamine 20°C-lt 120°C-ni.
Q = cm(t₂ – t₁) = 880 · 0,5 · 100 = 44 000 J = 44 kJ

Ülesanne 2: 0,3 kg raud (200°C) pannakse 1 kg vette (20°C). Leia tasakaalutemperatuur.
c_raud · m_raud · (t_raud – t) = c_vesi · m_vesi · (t – t_vesi)
460 · 0,3 · (200 – t) = 4200 · 1 · (t – 20)
138(200 – t) = 4200(t – 20)
27600 – 138t = 4200t – 84000
111600 = 4338t
t ≈ 25,7°C

4) Energia jäävuse seadus: isoleeritud süsteemis on kehade poolt ära antud soojushulk võrdne teiste kehade poolt saadud soojushulgaga. Q_ära = Q_saadud.

5) Merebriis: päeval soojeneb maismaa kiiremini kui meri → soe õhk tõuseb maismaa kohal → jahe mereõhk liigub maismaale. Öösel vastupidi. Põhjus: vee ja maismaa erinev erisoojus.`,
    blankTestNotes: 'Tööaeg 45 minutit. Kalkulaator lubatud. Erisoojused antakse valemilehel: c(vesi) = 4200 J/(kg·°C), c(raud) = 460 J/(kg·°C), c(alumiinium) = 880 J/(kg·°C).',
    curriculumLinks: [
      { curriculumCode: 'F9.1.6', topicLabel: 'Soojusjuhtivus, konvektsioon, soojuskiirgus', gradeRange: '9', weightPercent: 25 },
      { curriculumCode: 'F9.1.7', topicLabel: 'Siseenergia ja soojushulk', gradeRange: '9', weightPercent: 25 },
      { curriculumCode: 'F9.1.8', topicLabel: 'Soojushulga arvutamine Q = cm∆t', gradeRange: '9', weightPercent: 35 },
      { curriculumCode: 'F9.1.9', topicLabel: 'Energia jäävuse seadus soojusprotsessides', gradeRange: '9', weightPercent: 15 },
    ],
  },

  // ─── Test 3: Soojusõpetus — Aine oleku muutused ───────────────────────
  {
    title: 'Aine oleku muutused',
    topic: 'Soojusõpetus',
    grade: '9',
    rubric: `Hindamisjuhend (kokku 20 punkti):

1. Sulamine ja tahkumine (4p)
   - Kirjeldab protsessi osakeste tasemel (2p)
   - Sulamissoojuse mõiste ja valem Q = λm (2p)

2. Aurumine ja kondenseerumine (4p)
   - Eristab aurumist ja keemist (2p)
   - Keemissoojuse mõiste ja valem Q = Lm (2p)

3. Graafiku analüüs (4p)
   - Loeb temperatuuri-aja graafikult aine oleku muutusi (2p)
   - Määrab sulamistemperatuuri ja keemistemperatuuri (2p)

4. Arvutusülesanded (6p)
   - Ülesanne 1: sulamissoojuse arvutamine (3p)
   - Ülesanne 2: keemissoojuse arvutamine (3p)

5. Looduse nähtused (2p)
   - Selgitab härmituse, udu või kaste teket (2p)

Hindamine: 18-20p = "5", 14-17p = "4", 10-13p = "3", 5-9p = "2", 0-4p = "1"`,
    answerKey: `Õiged vastused:

1) Sulamisel saab tahke aine energiat juurde → osakesed hakkavad liikuma vabamalt → korrapärane struktuur laguneb. Temperatuur sulamise ajal ei muutu (kogu energia kulub oleku muutmiseks).
Q = λm, kus λ on sulamissoojus (J/kg), m on mass.

2) Aurumine toimub vedeliku pinnalt igal temperatuuril — kiiremad osakesed lahkuvad pinnalt. Keemine toimub kindlal temperatuuril kogu vedeliku mahus — moodustuvad aurumuullid.
Q = Lm, kus L on keemissoojus (J/kg), m on mass.

3) Graafiku vastused sõltuvad konkreetsest graafikust. Horisontaalsed lõigud näitavad oleku muutusi (temperatuur ei muutu, kuigi soojust antakse).

4) Ülesanne 1: Kui palju soojust vajab 0,5 kg jää sulamiseks? λ(jää) = 330 000 J/kg
Q = λm = 330 000 · 0,5 = 165 000 J = 165 kJ

Ülesanne 2: Kui palju soojust vajab 0,2 kg vee aurustamiseks? L(vesi) = 2 260 000 J/kg
Q = Lm = 2 260 000 · 0,2 = 452 000 J = 452 kJ

5) Härmatis tekib, kui õhus olev veeaur sublimeerub (läheb otse gaasist tahkesse olekusse) külmal pinnal. See toimub, kui pinna temperatuur on alla 0°C ja õhuniiskus piisavalt kõrge.
Kaste tekib kondenseerumisel — jahe pind jahutab lähiõhu alla kastepunkti.`,
    blankTestNotes: 'Tööaeg 40 minutit. Kalkulaator lubatud. Valemileht: λ(jää) = 330 000 J/kg, L(vesi) = 2 260 000 J/kg.',
    curriculumLinks: [
      { curriculumCode: 'F9.1.10', topicLabel: 'Sulamine ja tahkumine, sulamissoojus Q = λm', gradeRange: '9', weightPercent: 25 },
      { curriculumCode: 'F9.1.11', topicLabel: 'Aurumine, keemine, keemissoojus Q = Lm', gradeRange: '9', weightPercent: 25 },
      { curriculumCode: 'F9.1.12', topicLabel: 'Aine oleku muutuste graafik', gradeRange: '9', weightPercent: 25 },
      { curriculumCode: 'F9.1.13', topicLabel: 'Sublimatsioon ja härmatumine looduses', gradeRange: '9', weightPercent: 25 },
    ],
  },

  // ─── Test 4: Elektriõpetus — Elektrivool ja vooluring ─────────────────
  {
    title: 'Elektrivool ja vooluring',
    topic: 'Elektriõpetus',
    grade: '9',
    rubric: `Hindamisjuhend (kokku 25 punkti):

1. Elektrilaeng ja elektriväli (4p)
   - Selgitab kehade elektriseerimist (2p)
   - Kirjeldab elektrivälja ja elektrijõudu (2p)

2. Elektrivool ja vooluringi osad (4p)
   - Defineerib elektrivoolu metallides (1p)
   - Nimetab vooluringi põhiosad ja nende otstarbe (3p)

3. Ohmi seadus (6p)
   - Sõnastab Ohmi seaduse (1p)
   - Valem I = U/R (1p)
   - Ülesanne 1: arvutab voolutugevuse (2p)
   - Ülesanne 2: arvutab takistuse (2p)

4. Elektriskeemi lugemine ja koostamine (5p)
   - Loeb elektriskeemi ja nimetab elemendid (2p)
   - Koostab lihtsa vooluringi skeemi (3p)

5. Mõõtmine (3p)
   - Ampermeetri ühendamine (jada) (1,5p)
   - Voltmeetri ühendamine (rööp) (1,5p)

6. Elektriohutus (3p)
   - Selgitab lühise mõistet ja ohtu (1,5p)
   - Kaitsme otstarve (1,5p)

Hindamine: 22-25p = "5", 17-21p = "4", 12-16p = "3", 6-11p = "2", 0-5p = "1"`,
    answerKey: `Õiged vastused:

1) Elektriseerimine hõõrdumisel: üks keha kaotab elektrone ja muutub positiivselt laetuks, teine saab elektrone juurde ja muutub negatiivselt laetuks. Elektriväli on laetud keha ümbritsev ruum, kus teistele laetud kehadele mõjub elektrijõud.

2) Elektrivool metallides on elektronide suunatud liikumine. Vooluringi osad: vooluallikas (annab energiat), juhtmed (ühendavad), tarbija (muundab elektrienergia), lüliti (avab/sulgeb vooluringi).

3) Ohmi seadus: voolutugevus on võrdeline pingega ja pöördvõrdeline takistusega. I = U/R.
Ülesanne 1: U = 12 V, R = 4 Ω → I = 12/4 = 3 A
Ülesanne 2: I = 0,5 A, U = 6 V → R = U/I = 6/0,5 = 12 Ω

4) Skeemil: tuvastab vooluallikas, lambid, takisti, lüliti sümbolid. Koostab skeemi: vooluallikas + lüliti + lamp jadaühenduses.

5) Ampermeeter ühendatakse järjestikku (jada) vooluringiga — mõõdab läbivat voolutugevust. Voltmeeter ühendatakse rööbiti (paralleelselt) tarbijaga — mõõdab pinget tarbija klemmidel.

6) Lühis: väga väikse takistusega ühendus, mis tekitab suure voolutugevuse → juhtmed kuumenevad → tuleoht. Kaitse (sulavkaitse/automaatkaitselüliti) katkestab vooluringi, kui voolutugevus ületab lubatud piiri.`,
    blankTestNotes: 'Tööaeg 45 minutit. Kalkulaator lubatud. Elektriskeemi sümbolid antakse eraldi lehel.',
    curriculumLinks: [
      { curriculumCode: 'F9.2.1', topicLabel: 'Elektrilaeng ja elektriväli', gradeRange: '9', weightPercent: 15 },
      { curriculumCode: 'F9.2.2', topicLabel: 'Elektrivool metallides ja vooluringi osad', gradeRange: '9', weightPercent: 15 },
      { curriculumCode: 'F9.2.3', topicLabel: 'Ohmi seadus I = U/R', gradeRange: '9', weightPercent: 30 },
      { curriculumCode: 'F9.2.4', topicLabel: 'Elektriskeemid ja mõõtmine', gradeRange: '9', weightPercent: 25 },
      { curriculumCode: 'F9.2.5', topicLabel: 'Elektriohutus, lühis, kaitse', gradeRange: '9', weightPercent: 15 },
    ],
  },

  // ─── Test 5: Elektriõpetus — Jada- ja rööpühendus ────────────────────
  {
    title: 'Jada- ja rööpühendus. Elektrivoolu töö ja võimsus',
    topic: 'Elektriõpetus',
    grade: '9',
    rubric: `Hindamisjuhend (kokku 25 punkti):

1. Jadaühenduse omadused (5p)
   - Voolutugevus on kõikjal sama: I = I₁ = I₂ (1p)
   - Pinge jaotub: U = U₁ + U₂ (1p)
   - Kogutakistus: R = R₁ + R₂ (1p)
   - Arvutusülesanne jadaühendusega (2p)

2. Rööpühenduse omadused (5p)
   - Pinge on kõikjal sama: U = U₁ = U₂ (1p)
   - Voolutugevus jaotub: I = I₁ + I₂ (1p)
   - Kogutakistus: 1/R = 1/R₁ + 1/R₂ (1p)
   - Arvutusülesanne rööpühendusega (2p)

3. Elektrivoolu töö ja võimsus (6p)
   - Valem A = IUt ja N = IU (2p)
   - Ülesanne: arvutab tarbitud energiat ja maksumust (4p)

4. Joule'i-Lenzi seadus (4p)
   - Valem Q = I²Rt (1p)
   - Selgitab soojuse eraldumist juhtmes (1p)
   - Arvutusülesanne (2p)

5. Praktiline ülesanne (5p)
   - Arvutab kodu elektritarvitite koguvõimsuse (2p)
   - Hindab kaitselüliti sobivust (1,5p)
   - Arvutab igakuise energiakulu ja maksumuse (1,5p)

Hindamine: 22-25p = "5", 17-21p = "4", 12-16p = "3", 6-11p = "2", 0-5p = "1"`,
    answerKey: `Õiged vastused:

1) Jadaühendus: R₁ = 6 Ω, R₂ = 4 Ω, U = 20 V.
R = R₁ + R₂ = 6 + 4 = 10 Ω
I = U/R = 20/10 = 2 A (sama kõikjal)
U₁ = IR₁ = 2 · 6 = 12 V, U₂ = IR₂ = 2 · 4 = 8 V
Kontroll: 12 + 8 = 20 V ✓

2) Rööpühendus: R₁ = 6 Ω, R₂ = 3 Ω, U = 12 V.
1/R = 1/6 + 1/3 = 1/6 + 2/6 = 3/6 = 1/2 → R = 2 Ω
I = U/R = 12/2 = 6 A
I₁ = U/R₁ = 12/6 = 2 A, I₂ = U/R₂ = 12/3 = 4 A
Kontroll: 2 + 4 = 6 A ✓

3) Elektripliit N = 2000 W = 2 kW, töötab 1,5 h päevas, 30 päeva kuus.
A = Nt = 2000 · 1,5 · 3600 = 10 800 000 J = 10 800 kJ
Või: A = 2 kW · 1,5 h · 30 = 90 kWh
Maksumus: 90 · 0,15 = 13,50 € (hinnaga 0,15 €/kWh)

4) Joule'i-Lenzi seadus: Q = I²Rt
Juhtmes (R = 0,5 Ω) voolab 10 A 1 minuti jooksul:
Q = 10² · 0,5 · 60 = 100 · 0,5 · 60 = 3000 J = 3 kJ
See soojus eraldub juhtme kuumenemisel — seepärast ei tohi juhtmeid üle koormata.

5) Kodu tarvitid: pliit 2000 W + veekeetja 2200 W + mikrolaineahi 800 W = 5000 W = 5 kW.
Voolutugevus: I = N/U = 5000/230 ≈ 21,7 A
16 A kaitse ei piisa — vaja vähemalt 25 A kaitset. Ei tohi kõiki korraga kasutada 16 A kaitsega!
Energiakulu: oleneb kasutusajast.`,
    blankTestNotes: 'Tööaeg 45 minutit. Kalkulaator lubatud. Elektrienergia hind: 0,15 €/kWh. Valemid antakse lehel.',
    curriculumLinks: [
      { curriculumCode: 'F9.2.6', topicLabel: 'Jadaühenduse omadused', gradeRange: '9', weightPercent: 20 },
      { curriculumCode: 'F9.2.7', topicLabel: 'Rööpühenduse omadused', gradeRange: '9', weightPercent: 20 },
      { curriculumCode: 'F9.2.8', topicLabel: 'Elektrivoolu töö A = IUt ja võimsus N = IU', gradeRange: '9', weightPercent: 25 },
      { curriculumCode: 'F9.2.9', topicLabel: 'Joule-Lenzi seadus Q = I²Rt', gradeRange: '9', weightPercent: 15 },
      { curriculumCode: 'F9.2.10', topicLabel: 'Koguvõimsus, kaitse, energiamaksumus', gradeRange: '9', weightPercent: 20 },
    ],
  },
];

async function seedLibraryTests() {
  console.log('🔧 Seeding 5 public library tests for 9th grade physics...\n');

  // Find the Füüsika subject
  const fyysika = await db.subject.findFirst({ where: { name: 'Füüsika' } });
  if (!fyysika) {
    console.error('❌ Füüsika subject not found. Run main seed first.');
    process.exit(1);
  }

  // Find or create a "library" teacher profile
  // We use the existing demo teacher if available
  const demoTeacher = await db.user.findFirst({
    where: { email: 'demo.opetaja@maasikuunistus.ee' },
    include: { teacherProfile: true },
  });

  if (!demoTeacher?.teacherProfile) {
    console.error('❌ Demo teacher not found. Run main seed first.');
    process.exit(1);
  }

  const teacherId = demoTeacher.teacherProfile.id;

  for (const test of LIBRARY_TESTS) {
    // Check if already seeded (by title + grade + teacherId)
    const existing = await db.test.findFirst({
      where: {
        title: test.title,
        grade: test.grade,
        teacherId,
        visibility: 'PUBLIC',
        deletedAt: null,
      },
    });

    if (existing) {
      console.log(`  ⏭  "${test.title}" — already exists, skipping`);
      continue;
    }

    const created = await db.test.create({
      data: {
        teacherId,
        ownerId: teacherId,
        subjectId: fyysika.id,
        title: test.title,
        topic: test.topic,
        grade: test.grade,
        rubric: test.rubric,
        answerKey: test.answerKey,
        blankTestNotes: test.blankTestNotes,
        notes: 'Raamatukogu näidistest — 9. klass füüsika',
        status: 'READY',
        visibility: 'PUBLIC',
        versionNumber: 1,
        versionNote: 'Raamatukogu algtekst',
        curriculumLinks: {
          create: test.curriculumLinks.map(cl => ({
            curriculumCode: cl.curriculumCode,
            topicLabel: cl.topicLabel,
            gradeRange: cl.gradeRange,
            weightPercent: cl.weightPercent,
          })),
        },
      },
    });

    console.log(`  ✅ "${created.title}" — created (id: ${created.id})`);
  }

  console.log('\n✨ Library seeding complete!');
}

seedLibraryTests()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });
