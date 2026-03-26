/**
 * Seed script — Batch 2: Additional 9th-grade physics tests for the public library.
 *
 * Covers topics NOT in batch 1:
 *   6. Tuumaenergia
 *   7. Eritakistus (R = ρl/S)
 *   8. Magnetnähtused
 *   9. Soojusõpetus — koondkontrolltöö
 *  10. Elektriõpetus — koondkontrolltöö
 *  11. Aastalõpu koondkontrolltöö (soojus + elekter)
 *
 * Run via: npx tsx scripts/seed-library-tests-batch2.ts
 * Idempotent — skips existing tests.
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
  // ─── Test 6: Tuumaenergia ─────────────────────────────────────────────
  {
    title: 'Tuumaenergia',
    topic: 'Soojusõpetus',
    grade: '9',
    rubric: `Hindamisjuhend (kokku 20 punkti):

1. Aatomi ehitus ja isotoobid (4p)
   - Kirjeldab aatomituuma koostist: prootonid ja neutronid (2p)
   - Selgitab isotoopide mõistet (sama element, erinev neutronite arv) (2p)

2. Radioaktiivsus ja kiirguse liigid (6p)
   - Defineerib radioaktiivsuse (1p)
   - Kirjeldab α-kiirgust: koostis, läbistusvõime (2p)
   - Kirjeldab β-kiirgust: koostis, läbistusvõime (1,5p)
   - Kirjeldab γ-kiirgust: koostis, läbistusvõime (1,5p)

3. Tuumareaktsioonid (4p)
   - Selgitab kergete tuumade ühinemist (termotuumareaktsioon) (2p)
   - Selgitab raskete tuumade lõhustumist ja ahelreaktsiooni (2p)

4. Tuumaenergia rakendused (3p)
   - Tuumareaktori tööpõhimõte (1,5p)
   - Tuumaenergia eelised ja puudused (1,5p)

5. Kiirguskaitse (3p)
   - Nimetab ioniseeriva kiirguse allikad looduses (1p)
   - Selgitab kiirguskaitse põhimõtteid (1p)
   - Dosimeetri otstarve (1p)

Hindamine: 18-20p = "5", 14-17p = "4", 10-13p = "3", 5-9p = "2", 0-4p = "1"`,
    answerKey: `Õiged vastused:

1) Aatomituum koosneb prootonitest (+) ja neutronitest (laenguta). Prootonite arv = elemendi järjenumber. Isotoobid on sama elemendi aatomid, millel on erinev neutronite arv (nt ¹²C ja ¹⁴C — mõlemal 6 prootonit, aga 6 vs 8 neutronit).

2) Radioaktiivsus on aatomituumade iseeneslik lagunemine, mille käigus kiirgub osakesi ja/või elektromagnetlaineid.
- α-kiirgus: heeliumituumad (2p + 2n), suur mass, väike läbistusvõime (peatab paberileht), kõige ohtlikum organismis.
- β-kiirgus: kiired elektronid, keskmine läbistusvõime (peatab mõne mm alumiinium), levib kaugemale kui α.
- γ-kiirgus: elektromagnetlaine (nagu valgus, aga lühem lainepikkus), suurim läbistusvõime (peatab paks plii- või betoonikiht), levib kõige kaugemale.

3) Kergete tuumade ühinemine (fusioon/termotuumareaktsioon): kaks kerget tuuma (nt vesinik) ühinevad raskemaks (nt heelium), vabaneb tohutu energia. Toimub Päikeses ja tähtedes. Vajab väga kõrget temperatuuri.
Raskete tuumade lõhustumine (fission): raske tuum (nt uraan-235) lõheneb neutroniga tabamisel kaheks keskmiseks tuumaks + vabanevad neutronid → need tabavad uusi tuumi → ahelreaktsioon.

4) Tuumareaktor: kontrollitud ahelreaktsioon. Kütus (uraan), moderaator (aeglustab neutroneid), reguleerimisvarraste sisestamine peatab/reguleerib reaktsiooni, jahutusvesi viib soojuse turbiinile → elekter.
Eelised: ei tekita CO₂, väike kütusekogus annab palju energiat.
Puudused: radioaktiivsed jäätmed, avariioht, kallis ehitus ja lammutus.

5) Looduslikud allikad: kosmiline kiirgus, radoon maapõuest, looduslikud radioaktiivsed isotoobid toidus ja kehas (nt K-40).
Kiirguskaitse: aeg (viibida kiirgusallikast eemal nii vähe kui võimalik), kaugus (kiirgus väheneb kauguse ruuduga), varjestus (plii, betoon).
Dosimeeter mõõdab saadud kiirgusdoosi (ühik: siivert, Sv).`,
    blankTestNotes: 'Tööaeg 40 minutit. Kalkulaator pole vajalik. Perioodilisuse tabel antakse eraldi.',
    curriculumLinks: [
      { curriculumCode: 'F9.1.14', topicLabel: 'Aatomi mudelid, aatomituuma koostis, isotoobid', gradeRange: '9', weightPercent: 20 },
      { curriculumCode: 'F9.1.15', topicLabel: 'Radioaktiivsus, α-, β- ja γ-kiirgus', gradeRange: '9', weightPercent: 30 },
      { curriculumCode: 'F9.1.16', topicLabel: 'Tuumade ühinemine ja lõhustumine, ahelreaktsioon', gradeRange: '9', weightPercent: 20 },
      { curriculumCode: 'F9.1.17', topicLabel: 'Tuumareaktor, tuumaenergia, kiirguskaitse', gradeRange: '9', weightPercent: 30 },
    ],
  },

  // ─── Test 7: Eritakistus ja takistuse sõltuvus ───────────────────────
  {
    title: 'Eritakistus ja takistuse sõltuvus',
    topic: 'Elektriõpetus',
    grade: '9',
    rubric: `Hindamisjuhend (kokku 20 punkti):

1. Takistuse mõiste (4p)
   - Defineerib elektritakistuse, ühik oom (Ω) (2p)
   - Selgitab, miks ained takistavad voolu erinevalt (juht vs isolaator) (2p)

2. Takistuse sõltuvus (6p)
   - Sõltuvus juhi pikkusest (pikem → suurem takistus) (2p)
   - Sõltuvus ristlõikepindalast (suurem pindala → väiksem takistus) (2p)
   - Sõltuvus materjalist (eritakistus ρ) (2p)

3. Valem R = ρl/S (6p)
   - Valem õigesti kirjutatud, suurused selgitatud (2p)
   - Ülesanne 1: arvutab takistuse (2p)
   - Ülesanne 2: arvutab vajaliku juhtme pikkuse/läbimõõdu (2p)

4. Praktiline rakendus (4p)
   - Selgitab reostaadi tööpõhimõtet (2p)
   - Selgitab, miks kasutatakse elektrijuhtmetes vaske (madal eritakistus) (2p)

Hindamine: 18-20p = "5", 14-17p = "4", 10-13p = "3", 5-9p = "2", 0-4p = "1"`,
    answerKey: `Õiged vastused:

1) Elektritakistus näitab, kui tugevalt materjal takistab elektrivoolu kulgemist. Ühik: oom (Ω). Juhis on palju vabu elektrone (nt metallid — vask, alumiinium), isolaatoris väga vähe (nt klaas, kumm, plastmass).

2) Pikkus: mida pikem juhe, seda suurem takistus (elektroni tee on pikem, rohkem kokkupõrkeid).
Ristlõikepindala: mida suurem läbimõõt, seda väiksem takistus (rohkem "radu" elektronidele).
Materjal: erinevatel materjalidel on erinev eritakistus ρ (vask: 0,017 · 10⁻⁶ Ω·m, raud: 0,098 · 10⁻⁶ Ω·m — raud takistab ~6x rohkem).

3) R = ρl/S, kus R = takistus (Ω), ρ = eritakistus (Ω·m), l = pikkus (m), S = ristlõikepindala (m²).

Ülesanne 1: Vasest juhtme (ρ = 0,017 · 10⁻⁶ Ω·m) pikkus 100 m, ristlõikepindala 1,5 mm² = 1,5 · 10⁻⁶ m².
R = 0,017 · 10⁻⁶ · 100 / (1,5 · 10⁻⁶) = 1,7 · 10⁻⁶ / 1,5 · 10⁻⁶ = 1,13 Ω

Ülesanne 2: Kütteelemendi takistus peab olema 20 Ω, nikroomi eritakistus ρ = 1,1 · 10⁻⁶ Ω·m, traadi läbimõõt 0,5 mm → S = π(0,25 · 10⁻³)² ≈ 0,196 · 10⁻⁶ m².
l = RS/ρ = 20 · 0,196 · 10⁻⁶ / 1,1 · 10⁻⁶ = 3,92/1,1 ≈ 3,56 m

4) Reostaat: pikk takistustraat keraamilisele kehale keritud. Liugkontakti liigutades muudad kasutatava traadi pikkust → muutub takistus → reguleerib voolutugevust.
Vasest juhtmed: vase eritakistus on üks väiksemaid (0,017 · 10⁻⁶ Ω·m) → minimaalsed energiakaod pikadel juhtmetel. Lisaks on vask painduv ja korrosioonikindel.`,
    blankTestNotes: 'Tööaeg 40 minutit. Kalkulaator lubatud. Eritakistused: ρ(vask) = 0,017 · 10⁻⁶ Ω·m, ρ(raud) = 0,098 · 10⁻⁶ Ω·m, ρ(nikroom) = 1,1 · 10⁻⁶ Ω·m.',
    curriculumLinks: [
      { curriculumCode: 'F9.2.11', topicLabel: 'Elektritakistus, juht ja isolaator', gradeRange: '9', weightPercent: 20 },
      { curriculumCode: 'F9.2.12', topicLabel: 'Takistuse sõltuvus pikkusest, ristlõikest, materjalist', gradeRange: '9', weightPercent: 30 },
      { curriculumCode: 'F9.2.13', topicLabel: 'Eritakistus R = ρl/S', gradeRange: '9', weightPercent: 30 },
      { curriculumCode: 'F9.2.14', topicLabel: 'Reostaat ja takistuse rakendused', gradeRange: '9', weightPercent: 20 },
    ],
  },

  // ─── Test 8: Magnetnähtused ────────────────────────────────────────────
  {
    title: 'Magnetnähtused',
    topic: 'Elektriõpetus',
    grade: '9',
    rubric: `Hindamisjuhend (kokku 25 punkti):

1. Püsimagnet ja magnetväli (5p)
   - Magnetpoolused (N ja S), tõmbumis- ja tõukumisreeglid (2p)
   - Magnetvälja mõiste ja jõujooned (2p)
   - Maa magnetväli ja magnetnõel (1p)

2. Elektromagnet (5p)
   - Vooluga juhtme magnetväli (2p)
   - Elektromagneti ehitus ja tööpõhimõte (2p)
   - Elektromagneti tugevuse sõltuvus voolutugevusest ja keerdude arvust (1p)

3. Elektrimootor ja -generaator (5p)
   - Elektrimootori tööpõhimõte (magnetväli mõjutab vooluga juhet) (2p)
   - Generaatori tööpõhimõte (liikuv juhe magnetväljas tekitab pinget) (2p)
   - Energiamuundamine: elektri- ↔ mehaaniline energia (1p)

4. Vahelduvvool ja transformaator (5p)
   - Eristab alalis- ja vahelduvvoolu (2p)
   - Transformaatori tööpõhimõte (1,5p)
   - Kõrgepingeülekanne: miks kasutatakse kõrgepinget elektri edastamiseks (1,5p)

5. Magnetnähtused looduses ja tehnikas (5p)
   - Nimetab 3+ praktilist magneti rakendust (2p)
   - Selgitab ühte rakendust üksikasjalikult (3p)

Hindamine: 22-25p = "5", 17-21p = "4", 12-16p = "3", 6-11p = "2", 0-5p = "1"`,
    answerKey: `Õiged vastused:

1) Igal magnetil on kaks poolust: põhjapoolus (N) ja lõunapoolus (S). Ühenimelised poolused tõukuvad, erinimelised tõmbuvad. Magnetväli on magneti ümbritsev ruum, kus magnetnõelale mõjub jõud. Jõujooned kulgevad magnetist väljaspool N-poolusest S-poolusesse. Maa magnetväli: Maa käitub kui hiigelsuur magnet. Magnetnõela N-poolus osutab Maa geograafilise põhjapooluse suunas.

2) Vooluga juhtme ümber tekib magnetväli (ringikujulised jõujooned ümber juhtme). Elektromagnet: raudsüdamikule keritud pool (solenoid), mille sees voolab elektrivool. Magnetväli on tugev südamiku sees. Mida suurem voolutugevus ja mida rohkem keerdusid, seda tugevam elektromagnet. Eelis: saab välja-sisse lülitada ja tugevust reguleerida.

3) Elektrimootor: vooluga mähis magnetväljas pöörleb (magnetjõud mõjub vooluga juhtmele). Muundab elektrienergia mehaaniliseks energiaks.
Generaator: pöörlev mähis magnetväljas — magnetvoo muutus tekitab mähises elektrilise pinge (elektromagneetilise induktsiooni seadus). Muundab mehaanilise energia elektrienergians. Mootor ja generaator on sisuliselt sama seade, mis töötab vastupidises suunas.

4) Alalisvool: voolab ühes suunas (patarei). Vahelduvvool: suund vahetub perioodiliselt (Eestis 50 Hz = 50 korda sekundis). Transformaator: kaks pooli ühisel raudsüdamikul. Primaarpooli vahelduvvool tekitab muutuva magnetvoo → sekundaarpoolis indutseerub pinge. Üles-trafo (suurem pinge) ja alla-trafo (väiksem pinge). Kõrgepingeülekanne: P = UI → sama võimsuse korral kõrgem pinge = väiksem voolutugevus → väiksemad soojuskaod juhtmetes (Q = I²Rt).

5) Rakendused: elektrimootor (kodutehnika, transport), generaator (elektrijaamad), transformaator (kõrgepinge), elektromagnet (vanaraua sorteerimine, MRT-skanner), magnetnõel (kompass), kõvaketas, krediitkaart. Näide — MRT: tugev magnetväli ja raadiosagedusimpulsid → vesinikuaatomite tuumad reageerivad → arvuti moodustab keha sisemuse pildi ilma röntgenita.`,
    blankTestNotes: 'Tööaeg 45 minutit. Kalkulaator pole vajalik.',
    curriculumLinks: [
      { curriculumCode: 'F9.2.15', topicLabel: 'Püsimagnet, magnetpoolused, magnetväli', gradeRange: '9', weightPercent: 20 },
      { curriculumCode: 'F9.2.16', topicLabel: 'Elektromagnet, vooluga juhtme magnetväli', gradeRange: '9', weightPercent: 20 },
      { curriculumCode: 'F9.2.17', topicLabel: 'Elektrimootor ja elektrigeneraator', gradeRange: '9', weightPercent: 20 },
      { curriculumCode: 'F9.2.18', topicLabel: 'Vahelduvvool ja transformaator', gradeRange: '9', weightPercent: 20 },
      { curriculumCode: 'F9.2.19', topicLabel: 'Magnetnähtused looduses ja tehnikas', gradeRange: '9', weightPercent: 20 },
    ],
  },

  // ─── Test 9: Soojusõpetus — koondkontrolltöö ──────────────────────────
  {
    title: 'Soojusõpetus — koondkontrolltöö',
    topic: 'Soojusõpetus',
    grade: '9',
    rubric: `Hindamisjuhend (kokku 30 punkti):

1. Aine ehitus ja temperatuur (4p)
   - Agregaatolekute erinevused osakeste tasemel (2p)
   - Temperatuuri ja osakeste liikumise seos (2p)

2. Soojusülekanne (4p)
   - Nimetab ja kirjeldab kõiki kolme soojusülekande viisi (3p)
   - Toob igapäevaelu näite (1p)

3. Soojushulga arvutused (8p)
   - Ülesanne Q = cm(t₂ – t₁) — valem (1p), lahendus (2p), vastus ühikutega (1p)
   - Soojusliku tasakaalu ülesanne — võrrand (2p), lahendus (1p), vastus (1p)

4. Aine oleku muutused (6p)
   - Sulamine/keemine — mida näitab graafiku horisontaalne lõik (2p)
   - Q = λm arvutus (2p)
   - Q = Lm arvutus (2p)

5. Tuumaenergia (4p)
   - α-, β-, γ-kiirguse võrdlus (tabel) (3p)
   - Kiirguskaitse üks põhimõte (1p)

6. Kompleksülesanne (4p)
   - Mitu soojusprotsessi järjest (nt jää sulatamine + vee soojendamine) (4p)

Hindamine: 27-30p = "5", 21-26p = "4", 15-20p = "3", 8-14p = "2", 0-7p = "1"`,
    answerKey: `Õiged vastused:

1) Tahke aine: osakesed tihedalt, võnguvad, kindel kuju. Vedelik: osakesed liiguvad vabamalt, kindel ruumala, võtab anuma kuju. Gaas: osakesed liiguvad kaootiliselt, täidab kogu ruumi. Temperatuur ~ osakeste keskmine kineetiline energia.

2) Soojusjuhtivus: osakeselt osakesele, ilma aine ülekandeta (metallpann kuumeneb). Konvektsioon: sooja aine liikumisega (radiaator kütab tuba). Soojuskiirgus: elektromagnetlainetena, vajab ainet pole (Päike soojendab Maad).

3) Ülesanne: 3 kg vett soojendada 15°C-lt 85°C-ni.
Q = cm∆t = 4200 · 3 · 70 = 882 000 J = 882 kJ

Tasakaal: 0,5 kg raud (300°C) pannakse 2 kg vette (20°C).
460 · 0,5 · (300 – t) = 4200 · 2 · (t – 20)
230(300 – t) = 8400(t – 20)
69000 – 230t = 8400t – 168000
237000 = 8630t → t ≈ 27,5°C

4) Graafiku horisontaalne lõik: oleku muutus. Kogu antav soojus kulub sidemete lõhkumisele, temperatuur ei muutu.
Q = λm: 2 kg jää sulamine: Q = 330000 · 2 = 660 000 J = 660 kJ
Q = Lm: 0,5 kg vee aurustamine: Q = 2260000 · 0,5 = 1 130 000 J = 1130 kJ

5) Tabel:
| Kiirgus | Koostis | Läbistusvõime | Peatab |
| α | He-tuum (2p+2n) | väike | paberileht |
| β | elektron | keskmine | alumiinium mõne mm |
| γ | EM-laine | suur | paks plii/betoon |
Kiirguskaitse: aeg (viibi kiirguse juures min.), kaugus (kiirgus ~ 1/r²), varjestus.

6) Kompleks: –10°C jää (0,5 kg) → 0°C jää → 0°C vesi → 100°C vesi.
Q₁ = c(jää)·m·∆t = 2100 · 0,5 · 10 = 10 500 J
Q₂ = λ·m = 330000 · 0,5 = 165 000 J
Q₃ = c(vesi)·m·∆t = 4200 · 0,5 · 100 = 210 000 J
Kokku: 10500 + 165000 + 210000 = 385 500 J ≈ 386 kJ`,
    blankTestNotes: 'Tööaeg 60 minutit. Kalkulaator lubatud. Valemileht: c(vesi)=4200, c(jää)=2100 J/(kg·°C), c(raud)=460, λ(jää)=330000 J/kg, L(vesi)=2260000 J/kg.',
    curriculumLinks: [
      { curriculumCode: 'F9.1.1', topicLabel: 'Aine ehituse mudel ja agregaatolekud', gradeRange: '9', weightPercent: 13 },
      { curriculumCode: 'F9.1.6', topicLabel: 'Soojusjuhtivus, konvektsioon, soojuskiirgus', gradeRange: '9', weightPercent: 13 },
      { curriculumCode: 'F9.1.8', topicLabel: 'Soojushulga arvutamine Q = cm∆t', gradeRange: '9', weightPercent: 27 },
      { curriculumCode: 'F9.1.10', topicLabel: 'Sulamine ja tahkumine, sulamissoojus Q = λm', gradeRange: '9', weightPercent: 14 },
      { curriculumCode: 'F9.1.11', topicLabel: 'Aurumine, keemine, keemissoojus Q = Lm', gradeRange: '9', weightPercent: 13 },
      { curriculumCode: 'F9.1.15', topicLabel: 'Radioaktiivsus, α-, β- ja γ-kiirgus', gradeRange: '9', weightPercent: 13 },
      { curriculumCode: 'F9.1.18', topicLabel: 'Soojusfüüsika kompleksülesanne', gradeRange: '9', weightPercent: 7 },
    ],
  },

  // ─── Test 10: Elektriõpetus — koondkontrolltöö ────────────────────────
  {
    title: 'Elektriõpetus — koondkontrolltöö',
    topic: 'Elektriõpetus',
    grade: '9',
    rubric: `Hindamisjuhend (kokku 30 punkti):

1. Elektrilaeng ja vooluring (4p)
   - Elektriseerimise selgitus (1p)
   - Vooluringi osad ja nende otstarve (2p)
   - Elektrivoolu definitsioon metallides (1p)

2. Ohmi seadus ja takistus (6p)
   - Ohmi seaduse sõnastus + valem (2p)
   - Ülesanne: I, U, R arvutamine (2p)
   - Eritakistuse valem R = ρl/S, ülesanne (2p)

3. Jada- ja rööpühendus (6p)
   - Jadaühenduse reeglid (voolutugevus, pinge, takistus) (2p)
   - Rööpühenduse reeglid (2p)
   - Arvutusülesanne: kombineeritud ühendus (2p)

4. Elektrivoolu töö, võimsus, Joule-Lenz (6p)
   - A = IUt ja N = IU — valemid ja arvutus (3p)
   - Q = I²Rt — soojuseraldumine juhtmes (2p)
   - Elektriohutus: lühis, kaitse (1p)

5. Magnetnähtused (4p)
   - Elektromagneti tööpõhimõte (2p)
   - Mootori ja generaatori erinevus (2p)

6. Praktiline ülesanne (4p)
   - Kodu elektrisüsteemi analüüs: koguvõimsus, kaitsme valik, kuumaksumus (4p)

Hindamine: 27-30p = "5", 21-26p = "4", 15-20p = "3", 8-14p = "2", 0-7p = "1"`,
    answerKey: `Õiged vastused:

1) Elektriseerimine hõõrdumisel: elektronid kanduvad ühelt kehalt teisele, mõlemad muutuvad laetuks. Vooluringi osad: vooluallikas (annab energiat), juhtmed (ühendavad), tarbija (muundab energiat), lüliti (avab/sulgeb). Elektrivool metallides: elektronide suunatud liikumine.

2) Ohmi seadus: voolutugevus on võrdeline pingega ja pöördvõrdeline takistusega. I = U/R.
Ülesanne: lamp R = 40 Ω, pinge 230 V. I = 230/40 = 5,75 A.
Eritakistus: R = ρl/S. Alumiiniumjuhe (ρ = 0,028 · 10⁻⁶ Ω·m), l = 200 m, S = 2,5 · 10⁻⁶ m².
R = 0,028 · 10⁻⁶ · 200 / (2,5 · 10⁻⁶) = 5,6 · 10⁻⁶ / 2,5 · 10⁻⁶ = 2,24 Ω

3) Jada: I = I₁ = I₂; U = U₁ + U₂; R = R₁ + R₂.
Rööp: U = U₁ = U₂; I = I₁ + I₂; 1/R = 1/R₁ + 1/R₂.
Ülesanne: R₁ = 10 Ω jadaühenduses R₂ = 5 Ω ja R₃ = 5 Ω rööpühendusega. R₂₃ = 1/(1/5+1/5) = 2,5 Ω. R_kokku = 10 + 2,5 = 12,5 Ω. U = 25 V → I = 25/12,5 = 2 A.

4) Elektripliit: N = 2 kW, t = 0,5 h.
A = Nt = 2000 · 1800 = 3 600 000 J = 3600 kJ (= 1 kWh).
Juhtmes (R = 0,5 Ω, I = 8,7 A, t = 1800 s): Q = I²Rt = 8,7² · 0,5 · 1800 ≈ 68 000 J = 68 kJ.
Lühis: väga väike takistus → suur vool → tuleoht. Kaitse/automaatlüliti katkestab voolu.

5) Elektromagnet: raudsüdamikule keritud pool + vool → tugev magnetväli. Lülitatav ja reguleeritav.
Mootor: elektrienergia → mehaaniline (vooluga juhe magnetväljas pöörleb).
Generaator: mehaaniline → elektrienergia (liikuv juhe magnetväljas tekitab pinge).

6) Kodu: pliit 2000W + boiler 2000W + pesumasin 1500W + valgustus 200W = 5700 W.
I = P/U = 5700/230 ≈ 24,8 A. Vaja 25A kaitset (16A ei piisa kõigi korraga kasutamisel).
Kuu energia: kui keskmine kasutus 3h/päev → 5,7 · 3 · 30 = 513 kWh. Maksumus 0,15 €/kWh → 76,95 €.`,
    blankTestNotes: 'Tööaeg 60 minutit. Kalkulaator lubatud. Valemileht antakse eraldi. ρ(vask)=0,017·10⁻⁶, ρ(Al)=0,028·10⁻⁶ Ω·m. Elektrihind 0,15 €/kWh.',
    curriculumLinks: [
      { curriculumCode: 'F9.2.1', topicLabel: 'Elektrilaeng ja elektriväli', gradeRange: '9', weightPercent: 10 },
      { curriculumCode: 'F9.2.3', topicLabel: 'Ohmi seadus I = U/R', gradeRange: '9', weightPercent: 15 },
      { curriculumCode: 'F9.2.13', topicLabel: 'Eritakistus R = ρl/S', gradeRange: '9', weightPercent: 10 },
      { curriculumCode: 'F9.2.6', topicLabel: 'Jadaühenduse omadused', gradeRange: '9', weightPercent: 10 },
      { curriculumCode: 'F9.2.7', topicLabel: 'Rööpühenduse omadused', gradeRange: '9', weightPercent: 10 },
      { curriculumCode: 'F9.2.8', topicLabel: 'Elektrivoolu töö A = IUt ja võimsus N = IU', gradeRange: '9', weightPercent: 15 },
      { curriculumCode: 'F9.2.9', topicLabel: 'Joule-Lenzi seadus Q = I²Rt', gradeRange: '9', weightPercent: 10 },
      { curriculumCode: 'F9.2.16', topicLabel: 'Elektromagnet, vooluga juhtme magnetväli', gradeRange: '9', weightPercent: 10 },
      { curriculumCode: 'F9.2.10', topicLabel: 'Koguvõimsus, kaitse, energiamaksumus', gradeRange: '9', weightPercent: 10 },
    ],
  },

  // ─── Test 11: Aastalõpu koondkontrolltöö ──────────────────────────────
  {
    title: '9. klassi füüsika — aastalõpu koondkontrolltöö',
    topic: 'Soojusõpetus + Elektriõpetus',
    grade: '9',
    rubric: `Hindamisjuhend (kokku 40 punkti):

A OSA — SOOJUSÕPETUS (20p)

A1. Soojusülekanne (3p)
   - Nimetab kolm soojusülekande viisi näidetega (3p)

A2. Soojushulga arvutus (5p)
   - Valem Q = cm∆t (1p), lahenduskäik (2p), vastus ühikutega (1p), füüsikaline kontroll (1p)

A3. Aine oleku muutus (4p)
   - Graafiku lugemine (2p)
   - Sulamissoojuse/keemissoojuse arvutus (2p)

A4. Kompleksülesanne — mitu soojusprotsessi (5p)
   - Korrektne valemite jada (2p), arvutus (2p), vastus (1p)

A5. Tuumaenergia (3p)
   - α/β/γ kiirguse võrdlus (2p), kiirguskaitse (1p)

B OSA — ELEKTRIÕPETUS (20p)

B1. Ohmi seadus (4p)
   - Valem (1p), ülesanne (2p), ühikud (1p)

B2. Jada- ja rööpühendus (5p)
   - Jadaühenduse arvutus (2p)
   - Rööpühenduse arvutus (3p)

B3. Elektrivoolu töö ja võimsus (4p)
   - A = IUt arvutus (2p)
   - Elektrimaksumus (2p)

B4. Eritakistus (3p)
   - R = ρl/S ülesanne (3p)

B5. Magnetnähtused (4p)
   - Elektromagneti tööpõhimõte (2p)
   - Transformaatori otstarve ja kõrgepingeülekanne (2p)

Hindamine: 36-40p = "5", 28-35p = "4", 20-27p = "3", 10-19p = "2", 0-9p = "1"`,
    answerKey: `Õiged vastused:

A1) Soojusjuhtivus: osakeselt osakesele (metalllusikas tees). Konvektsioon: sooja aine liikumine (radiaator kütab tuba). Soojuskiirgus: elektromagnetlainetena (Päike).

A2) 5 kg vett soojendada 10°C-lt 90°C-ni:
Q = cm∆t = 4200 · 5 · 80 = 1 680 000 J = 1680 kJ. See on umbes 0,47 kWh.

A3) Graafik: horisontaalsed lõigud = oleku muutus (sulamis- ja keemistemperatuur). Tõusvad lõigud = aine soojenemine.
1,5 kg jää sulamine: Q = λm = 330000 · 1,5 = 495 000 J = 495 kJ.

A4) Kompleks: 2 kg jää (0°C) → 2 kg vesi (0°C) → 2 kg vesi (60°C).
Q₁ = λm = 330000 · 2 = 660 000 J
Q₂ = cm∆t = 4200 · 2 · 60 = 504 000 J
Kokku = 660000 + 504000 = 1 164 000 J ≈ 1164 kJ

A5) α: He-tuum, peatab paber. β: elektron, peatab Al. γ: EM-laine, peatab plii.
Kaitse: aeg, kaugus, varjestus.

B1) I = U/R. Lamp R = 230 Ω, U = 230 V → I = 230/230 = 1 A.

B2) Jada: R₁ = 8 Ω, R₂ = 12 Ω, U = 40 V.
R = 8 + 12 = 20 Ω, I = 40/20 = 2 A.
U₁ = 2·8 = 16 V, U₂ = 2·12 = 24 V.

Rööp: R₁ = 6 Ω, R₂ = 12 Ω, U = 24 V.
1/R = 1/6 + 1/12 = 3/12 = 1/4 → R = 4 Ω.
I = 24/4 = 6 A. I₁ = 24/6 = 4 A, I₂ = 24/12 = 2 A.

B3) Boiler: N = 2000 W, t = 2 h.
A = Nt = 2000 · 2 = 4000 Wh = 4 kWh.
Maksumus = 4 · 0,15 = 0,60 €.

B4) Vasejuhe: ρ = 0,017 · 10⁻⁶ Ω·m, l = 50 m, S = 1 · 10⁻⁶ m².
R = ρl/S = 0,017 · 10⁻⁶ · 50 / (1 · 10⁻⁶) = 0,85 Ω.

B5) Elektromagnet: raudsüdamik + pool + vool → tugevam magnetväli kui püsimagnetil, saab lülitada.
Transformaator: muudab vahelduvpinget (üles/alla). Kõrgepingeülekanne: P = UI → kõrgem U, väiksem I → väiksemad soojuskaod juhtmetes (Q = I²Rt).`,
    blankTestNotes: 'Tööaeg 75 minutit. Kalkulaator lubatud. Valemileht: c(vesi)=4200, c(jää)=2100 J/(kg·°C), c(raud)=460, λ(jää)=330000 J/kg, L(vesi)=2260000 J/kg. ρ(vask)=0,017·10⁻⁶ Ω·m. Elektrihind 0,15 €/kWh.',
    curriculumLinks: [
      { curriculumCode: 'F9.1.6', topicLabel: 'Soojusjuhtivus, konvektsioon, soojuskiirgus', gradeRange: '9', weightPercent: 8 },
      { curriculumCode: 'F9.1.8', topicLabel: 'Soojushulga arvutamine Q = cm∆t', gradeRange: '9', weightPercent: 12 },
      { curriculumCode: 'F9.1.10', topicLabel: 'Sulamine ja tahkumine, sulamissoojus Q = λm', gradeRange: '9', weightPercent: 10 },
      { curriculumCode: 'F9.1.18', topicLabel: 'Soojusfüüsika kompleksülesanne', gradeRange: '9', weightPercent: 12 },
      { curriculumCode: 'F9.1.15', topicLabel: 'Radioaktiivsus, α-, β- ja γ-kiirgus', gradeRange: '9', weightPercent: 8 },
      { curriculumCode: 'F9.2.3', topicLabel: 'Ohmi seadus I = U/R', gradeRange: '9', weightPercent: 10 },
      { curriculumCode: 'F9.2.6', topicLabel: 'Jadaühenduse omadused', gradeRange: '9', weightPercent: 8 },
      { curriculumCode: 'F9.2.7', topicLabel: 'Rööpühenduse omadused', gradeRange: '9', weightPercent: 8 },
      { curriculumCode: 'F9.2.8', topicLabel: 'Elektrivoolu töö A = IUt ja võimsus N = IU', gradeRange: '9', weightPercent: 8 },
      { curriculumCode: 'F9.2.13', topicLabel: 'Eritakistus R = ρl/S', gradeRange: '9', weightPercent: 8 },
      { curriculumCode: 'F9.2.16', topicLabel: 'Elektromagnet, vooluga juhtme magnetväli', gradeRange: '9', weightPercent: 8 },
    ],
  },
];

async function seedLibraryTests() {
  console.log('🔧 Seeding batch 2: 6 additional physics tests...\n');

  const fyysika = await db.subject.findFirst({ where: { name: 'Füüsika' } });
  if (!fyysika) {
    console.error('❌ Füüsika subject not found. Run main seed first.');
    process.exit(1);
  }

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

  console.log('\n✨ Batch 2 seeding complete!');
}

seedLibraryTests()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });
