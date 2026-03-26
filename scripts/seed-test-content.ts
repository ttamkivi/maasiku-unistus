/**
 * Seed script: Adds printable test content (questions/tasks) to existing library tests.
 *
 * Run via: npx tsx scripts/seed-test-content.ts
 * Idempotent — skips tests that already have content.
 */

import { db } from '../lib/db';

const TEST_CONTENT: Record<string, string> = {

  // ─── Test 1: Aine ehitus ja temperatuur ───────────────────────────────
  'Aine ehitus ja temperatuur': `KONTROLLTÖÖ: Aine ehitus ja temperatuur
Kokku: 20 punkti | Aeg: 40 minutit | Kalkulaator lubatud

═══════════════════════════════════════════════════════════

1. ÜLESANNE — Aine ehituse mudel (4 punkti)

a) Kirjelda, kuidas aineosakesed liiguvad tahkes aines, vedelikus ja gaasis.
   (2p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

b) Selgita, kuidas on difusioon ja soojuspaisumine seotud aineosakeste liikumisega.
   (2p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

2. ÜLESANNE — Temperatuur ja termomeetrid (4 punkti)

a) Selgita, kuidas on temperatuur seotud aineosakeste liikumise kiirusega.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Kirjelda termomeetri tööpõhimõtet. Nimeta kaks temperatuuriskaalat ja selgita nende erinevust.
   (2p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

3. ÜLESANNE — Agregaatolekud (4 punkti)

a) Täida tabel. Märgi iga omadus (+) või (–).

   | Omadus                    | Tahke aine | Vedelik | Gaas |
   |---------------------------|------------|---------|------|
   | Kindel kuju               |            |         |      |
   | Kindel ruumala            |            |         |      |
   | Kokkusurutav              |            |         |      |
   | Võtab anuma kuju          |            |         |      |
   (2p)

b) Nimeta kõik kuus üleminekut agregaatolekute vahel (nt tahke → vedelik = sulamine).
   (2p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

4. ÜLESANNE — Arvutusülesanne (4 punkti)

Kui palju soojust on vaja 2 kg vee soojendamiseks 20 °C-lt 80 °C-ni?
Vee erisoojus c = 4200 J/(kg·°C).

Kirjuta välja valem, ühikud, arvutuskäik ja vastus.

   Valem: ________________________________________

   Arvutus: ______________________________________

   Vastus: ________________________________________

───────────────────────────────────────────────────────────

5. ÜLESANNE — Rakendusülesanne (4 punkti)

Miks tundub metallkäepide käega katsudes külmem kui puitkäepide, kuigi mõlemad on samas ruumis ja seega ühel temperatuuril?

Anna füüsikaline selgitus ja seosta see igapäevaeluga.

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________`,

  // ─── Test 2: Soojusülekanne ja energia ────────────────────────────────
  'Soojusülekanne ja energia': `KONTROLLTÖÖ: Soojusülekanne ja energia
Kokku: 25 punkti | Aeg: 40 minutit | Kalkulaator lubatud

═══════════════════════════════════════════════════════════

1. ÜLESANNE — Soojusülekande liigid (6 punkti)

a) Nimeta kolm soojusülekande liiki.
   (1p)

   _______________________________________________________________

b) Selgita igaüht ja too igaühele üks igapäevaelu näide.
   (3p)

   1) ____________________________________________________________
      Näide: ____________________________________________________

   2) ____________________________________________________________
      Näide: ____________________________________________________

   3) ____________________________________________________________
      Näide: ____________________________________________________

c) Milline soojusülekande liik toimib ka vaakumis? Põhjenda.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

2. ÜLESANNE — Soojushulk ja erisoojus (5 punkti)

a) Kirjuta valem soojushulga arvutamiseks ja selgita kõiki tähiseid.
   (2p)

   Valem: ________________________________________
   Tähised: ______________________________________

b) Miks on vee erisoojus oluliselt suurem kui raua erisoojus? Mida see tähendab praktikas?
   (1,5p)

   _______________________________________________________________
   _______________________________________________________________

c) Miks kasutatakse keskküttes soojuskandjana just vett?
   (1,5p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

3. ÜLESANNE — Arvutusülesanded (8 punkti)

a) Kui palju soojust on vaja 3 kg vee soojendamiseks 15 °C-lt keemistemperatuurini?
   c(vesi) = 4200 J/(kg·°C)
   (4p)

   _______________________________________________________________
   _______________________________________________________________

b) 0,5 kg metallist keha jahtub 200 °C-lt 50 °C-ni, eraldades 33 750 J soojust.
   Arvuta metalli erisoojus. Mis metalliga võiks olla tegu? (Vt valemilehte.)
   (4p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

4. ÜLESANNE — Energia jäävuse seadus soojusõpetuses (6 punkti)

a) Sõnasta energia jäävuse seadus soojusõpetuse kontekstis.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) 0,4 kg vett temperatuuril 80 °C segatakse 0,6 kg veega temperatuuril 20 °C. Leia segunemistemperatuur.
   (4p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________`,

  // ─── Test 3: Aine oleku muutused ──────────────────────────────────────
  'Aine oleku muutused': `KONTROLLTÖÖ: Aine oleku muutused
Kokku: 20 punkti | Aeg: 40 minutit | Kalkulaator lubatud

═══════════════════════════════════════════════════════════

1. ÜLESANNE — Oleku muutused ja energia (5 punkti)

a) Nimeta kõik kuus oleku muutust (faasiüleminet). Märgi iga muutuse juures, kas soojust neeldub või vabaneb.
   (3p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

b) Selgita, miks sulamisel temperatuur ei muutu, kuigi soojust antakse juurde.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

2. ÜLESANNE — Sulamine ja tahkumine (4 punkti)

a) Mis on sulamistemperatuur? Kuidas see jää puhul sõltub rõhust?
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Kirjuta valem sulamissoojuse arvutamiseks ja selgita tähiseid.
   (2p)

   Valem: ________________________________________
   Tähised: ______________________________________

───────────────────────────────────────────────────────────

3. ÜLESANNE — Aurumine ja kondenseerumine (4 punkti)

a) Mille poolest erineb aurumine keemisest?
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Nimeta kolm tegurit, mis mõjutavad aurumise kiirust. Selgita igaüht.
   (2p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

4. ÜLESANNE — Arvutusülesanne (4 punkti)

Kui palju soojust on vaja 0,5 kg jää sulatamiseks temperatuuril 0 °C ja saadud vee soojendamiseks 40 °C-ni?
Jää sulamissoojus λ = 330 000 J/kg, vee erisoojus c = 4200 J/(kg·°C).

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

5. ÜLESANNE — Rakendusülesanne (3 punkti)

Selgita, miks higiledes on jahedam. Kasuta oma vastuses mõisteid "aurumine", "energia" ja "aineosakesed".

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________`,

  // ─── Test 4: Elektrivool ja vooluring ─────────────────────────────────
  'Elektrivool ja vooluring': `KONTROLLTÖÖ: Elektrivool ja vooluring
Kokku: 25 punkti | Aeg: 45 minutit | Kalkulaator lubatud

═══════════════════════════════════════════════════════════

1. ÜLESANNE — Elektrilaeng ja vool (5 punkti)

a) Mis on elektrilaeng? Nimeta kaks laengu liiki ja selgita, kuidas samanimelised ja erinevanimelised laengud üksteist mõjutavad.
   (2,5p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

b) Mis on elektrivool? Mis on voolutugevuse ühik ja mida see näitab?
   (2,5p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

2. ÜLESANNE — Pinge ja takistus (6 punkti)

a) Mis on pinge ja mis on selle ühik? Selgita pinge rolli vooluringis.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Mis on elektritakistus? Mis on selle ühik? Millest sõltub juhtme takistus?
   (2p)

   _______________________________________________________________
   _______________________________________________________________

c) Sõnasta Ohmi seadus ja kirjuta see valemina.
   (2p)

   _______________________________________________________________
   Valem: ________________________________________

───────────────────────────────────────────────────────────

3. ÜLESANNE — Vooluringi skeemid (4 punkti)

Joonista vooluring, mis koosneb patareist, lülitist, lambist, ampermeetrist (jadaühenduses lambiga) ja voltmeetrist (rööpühenduses lambiga). Kasuta elektriskeemide sümboleid.

   [joonistuse koht]




───────────────────────────────────────────────────────────

4. ÜLESANNE — Arvutusülesanded (6 punkti)

a) Vooluringi pinge on 12 V ja takistus 40 Ω. Arvuta voolutugevus.
   (2p)

   _______________________________________________________________

b) Lambi kaudu voolab 0,3 A ja lambi otstel on pinge 6 V. Arvuta lambi takistus ja tarbitav võimsus.
   (4p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

5. ÜLESANNE — Elektriohutus (4 punkti)

a) Nimeta kolm elektriohutuse reeglit, mida peab kodus järgima.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Selgita, miks on märgades ruumides elektri kasutamine ohtlikum.
   (2p)

   _______________________________________________________________
   _______________________________________________________________`,

  // ─── Test 5: Jada- ja rööpühendus ────────────────────────────────────
  'Jada- ja rööpühendus. Elektrivoolu töö ja võimsus': `KONTROLLTÖÖ: Jada- ja rööpühendus. Elektrivoolu töö ja võimsus
Kokku: 25 punkti | Aeg: 45 minutit | Kalkulaator lubatud

═══════════════════════════════════════════════════════════

1. ÜLESANNE — Jadaühendus (5 punkti)

a) Joonista kahe takisti jadaühenduse skeem. Märgi voolusuund.
   (1p)

   [joonistuse koht]

b) Kirjuta jadaühenduse seaduspärasused voolutugevuse, pinge ja kogutakistuse kohta.
   (2p)

   I = ______________________
   U = ______________________
   R = ______________________

c) Kaks takistit R₁ = 20 Ω ja R₂ = 30 Ω on jadaühenduses. Pinge on 10 V. Arvuta kogutakistus ja voolutugevus.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

2. ÜLESANNE — Rööpühendus (5 punkti)

a) Joonista kahe takisti rööpühenduse skeem.
   (1p)

   [joonistuse koht]

b) Kirjuta rööpühenduse seaduspärasused voolutugevuse, pinge ja kogutakistuse kohta.
   (2p)

   I = ______________________
   U = ______________________
   R = ______________________

c) Kaks takistit R₁ = 60 Ω ja R₂ = 30 Ω on rööpühenduses. Pinge on 12 V. Arvuta kogutakistus ja koguvoolutugevus.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

3. ÜLESANNE — Elektrivoolu töö ja võimsus (6 punkti)

a) Kirjuta elektrivoolu töö ja võimsuse valemid. Selgita tähiseid.
   (2p)

   A = ______________________
   P = ______________________

b) Elektripliit tarbib võimsust 2000 W ja töötab 1,5 tundi. Arvuta tehtud töö kilowatt-tundides ja džaulides.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

c) Elektriarve näitab, et kuu jooksul tarbiti 250 kWh. Elektri hind on 0,15 €/kWh. Kui palju tuleb maksta?
   (2p)

   _______________________________________________________________

───────────────────────────────────────────────────────────

4. ÜLESANNE — Kombineeritud ülesanne (5 punkti)

Kolm ühesugust lampi (igaühe takistus 12 Ω) on ühendatud: kaks neist rööbiti ja see kombinatsioon jadamisi kolmandaga. Pinge on 12 V.

a) Joonista skeem. (1p)
b) Arvuta kogutakistus. (2p)
c) Arvuta koguvoolutugevus. (1p)
d) Arvuta igal lambil eralduv võimsus. (1p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

5. ÜLESANNE — Energiasääst (4 punkti)

a) Miks on LED-lamp ökonoomsem kui hõõglamp, kui mõlemad annavad sama palju valgust?
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Too kaks praktilist nõuannet, kuidas kodus elektrienergia tarbimist vähendada. Põhjenda füüsikaliselt.
   (2p)

   _______________________________________________________________
   _______________________________________________________________`,

  // ─── Test 6: Tuumaenergia ─────────────────────────────────────────────
  'Tuumaenergia': `KONTROLLTÖÖ: Tuumaenergia
Kokku: 20 punkti | Aeg: 40 minutit

═══════════════════════════════════════════════════════════

1. ÜLESANNE — Aatomi ehitus ja isotoobid (4 punkti)

a) Kirjelda aatomituuma koostist. Millistest osakestest see koosneb ja milline on nende laeng?
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Mis on isotoobid? Too näide.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

2. ÜLESANNE — Radioaktiivsus ja kiirguse liigid (6 punkti)

a) Mis on radioaktiivsus?
   (1p)

   _______________________________________________________________

b) Täida tabel radioaktiivsete kiirguse liikide kohta.

   | Kiirguse liik | Koostis | Läbistusvõime (väike/keskmine/suur) | Mis peatab? |
   |---------------|---------|-------------------------------------|-------------|
   | α-kiirgus     |         |                                     |             |
   | β-kiirgus     |         |                                     |             |
   | γ-kiirgus     |         |                                     |             |
   (5p)

───────────────────────────────────────────────────────────

3. ÜLESANNE — Tuumareaktsioonid (4 punkti)

a) Selgita, mis on kergete tuumade ühinemine (termotuumareaktsioon). Kus looduses see toimub?
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Selgita, mis on raskete tuumade lõhustumine ja kuidas tekib ahelreaktsioon.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

4. ÜLESANNE — Tuumaenergia rakendused (3 punkti)

a) Kirjelda tuumareaktori tööpõhimõtet lihtsustatud kujul.
   (1,5p)

   _______________________________________________________________
   _______________________________________________________________

b) Nimeta kaks tuumaenergia eelist ja kaks puudust.
   (1,5p)

   Eelised: ______________________________________________________
   Puudused: _____________________________________________________

───────────────────────────────────────────────────────────

5. ÜLESANNE — Kiirguskaitse (3 punkti)

a) Nimeta kaks ioniseeriva kiirguse allikat looduses.
   (1p)

   _______________________________________________________________

b) Selgita kiirguskaitse kolme põhimõtet.
   (1p)

   _______________________________________________________________

c) Mis on dosimeeter ja milleks seda kasutatakse?
   (1p)

   _______________________________________________________________`,

  // ─── Test 7: Eritakistus ja takistuse sõltuvus ────────────────────────
  'Eritakistus ja takistuse sõltuvus': `KONTROLLTÖÖ: Eritakistus ja takistuse sõltuvus
Kokku: 25 punkti | Aeg: 45 minutit | Kalkulaator lubatud

═══════════════════════════════════════════════════════════

1. ÜLESANNE — Takistuse sõltuvus (5 punkti)

a) Nimeta kolm tegurit, millest sõltub juhtme takistus.
   (1,5p)

   _______________________________________________________________

b) Kirjuta valem R = ρ·l/S. Selgita iga suuruse tähendust ja ühikut.
   (2p)

   R = ___________________________________________________________
   ρ = ___________________________________________________________
   l = ___________________________________________________________
   S = ___________________________________________________________

c) Kuidas muutub juhtme takistus, kui selle pikkust kahekordistada? Aga kui ristlõikepindala kahekordistada?
   (1,5p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

2. ÜLESANNE — Eritakistus (5 punkti)

a) Mis on eritakistus? Mida see füüsikaliselt näitab?
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Vase eritakistus on 0,017 Ω·mm²/m ja nikroomi eritakistus 1,1 Ω·mm²/m.
   Miks kasutatakse elektrijuhtmetes vaske, aga küttekehas nikroomi? Selgita.
   (3p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

3. ÜLESANNE — Arvutusülesanded (10 punkti)

a) Arvuta 50 m pikkuse ja 0,5 mm² ristlõikepindalaga vasejuhtme takistus.
   ρ(vask) = 0,017 Ω·mm²/m
   (3p)

   _______________________________________________________________
   _______________________________________________________________

b) Nikroomtraadi takistus on 22 Ω, pikkus 2 m. Arvuta traadi ristlõikepindala.
   ρ(nikroom) = 1,1 Ω·mm²/m
   (3p)

   _______________________________________________________________
   _______________________________________________________________

c) Alumiiniumjuhe (ρ = 0,028 Ω·mm²/m) on 100 m pikk ja selle takistus on 0,7 Ω. Arvuta juhtme ristlõikepindala ja läbimõõt.
   (4p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

4. ÜLESANNE — Takistus ja temperatuur (5 punkti)

a) Kuidas mõjutab temperatuur metalljuhtme takistust? Selgita, miks.
   (2,5p)

   _______________________________________________________________
   _______________________________________________________________

b) Too kaks igapäevaelu näidet, kus juhtme takistuse sõltuvus temperatuurist on oluline.
   (2,5p)

   _______________________________________________________________
   _______________________________________________________________`,

  // ─── Test 8: Magnetnähtused ───────────────────────────────────────────
  'Magnetnähtused': `KONTROLLTÖÖ: Magnetnähtused
Kokku: 25 punkti | Aeg: 45 minutit

═══════════════════════════════════════════════════════════

1. ÜLESANNE — Püsimagnet ja magnetväli (5 punkti)

a) Nimeta magneti kaks poolust. Sõnasta tõmbumis- ja tõukumisreegel.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Mis on magnetväli? Joonista püsimagneti magnetvälja jõujooned (näita suund).
   (2p)

   [joonistuse koht]

c) Mis on magnetnõel ja kuidas see on seotud Maa magnetväljaga?
   (1p)

   _______________________________________________________________

───────────────────────────────────────────────────────────

2. ÜLESANNE — Elektromagnet (5 punkti)

a) Kirjelda, milline magnetväli tekib vooluga juhtme ümber.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Selgita elektromagneti ehitust ja tööpõhimõtet.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

c) Nimeta üks tegur, mis suurendab elektromagneti tugevust. Selgita, miks.
   (1p)

   _______________________________________________________________

───────────────────────────────────────────────────────────

3. ÜLESANNE — Elektrimootor ja -generaator (5 punkti)

a) Selgita elektrimootori tööpõhimõtet: kuidas magnetväli paneb vooluga juhtme liikuma?
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Selgita generaatori tööpõhimõtet: kuidas tekib liikuvas juhtmes pinge?
   (2p)

   _______________________________________________________________
   _______________________________________________________________

c) Mis on ühine elektrimootori ja generaatori vahel?
   (1p)

   _______________________________________________________________

───────────────────────────────────────────────────────────

4. ÜLESANNE — Elektromagnetiline induktsioon (5 punkti)

a) Sõnasta elektromagnetilise induktsiooni seadus omal sõnadel.
   (2p)

   _______________________________________________________________

b) Kirjelda katset, mis demonstreerib elektromagnetilist induktsiooni.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

c) Nimeta üks elektromagnetilise induktsiooni rakendus igapäevaelus.
   (1p)

   _______________________________________________________________

───────────────────────────────────────────────────────────

5. ÜLESANNE — Rakendusülesanne (5 punkti)

a) Nimeta kolm elektromagneti rakendust igapäevaelus.
   (1,5p)

   _______________________________________________________________

b) Selgita, kuidas töötab ukse elektriline lukk (elektromagneti abil).
   (1,5p)

   _______________________________________________________________
   _______________________________________________________________

c) Miks on trafo vajalik elektrienergia edastamisel pikki vahemaid?
   (2p)

   _______________________________________________________________
   _______________________________________________________________`,

  // ─── Test 9: Soojusõpetus — koondkontrolltöö ─────────────────────────
  'Soojusõpetus — koondkontrolltöö': `KOONDKONTROLLTÖÖ: Soojusõpetus
Kokku: 30 punkti | Aeg: 45 minutit | Kalkulaator lubatud | Valemileht lubatud

═══════════════════════════════════════════════════════════

1. ÜLESANNE — Aine ehitus (4 punkti)

a) Selgita lühidalt, kuidas erinevad aineosakeste paiknemine ja liikumine tahkes aines, vedelikus ja gaasis.
   (2p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

b) Kirjelda ühte katset, mis tõestab aineosakeste liikumist.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

2. ÜLESANNE — Soojusülekanne (5 punkti)

a) Nimeta kolm soojusülekande liiki ja too igaühele üks näide.
   (3p)

   1) ____________________________________________________________
   2) ____________________________________________________________
   3) ____________________________________________________________

b) Selgita, miks on termos hea soojusisolaator. Millist soojusülekande liiki iga termose osa takistab?
   (2p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

3. ÜLESANNE — Oleku muutused (4 punkti)

a) Joonista graafik, mis näitab jää soojendamist –20 °C-lt 120 °C-ni (veeauruni). Märgi graafikul kõik oleku muutused ja tasased lõigud.
   (2p)

   [graafiku koht]

b) Selgita, miks temperatuur sulamisel ja keemisel ei muutu.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

4. ÜLESANNE — Soojushulga arvutamine (10 punkti)

a) Kui palju soojust on vaja 0,8 kg jää soojendamiseks –10 °C-lt 0 °C-ni, seejärel sulatamiseks ja saadud vee soojendamiseks 25 °C-ni?
   c(jää) = 2100 J/(kg·°C), λ(jää) = 330 000 J/kg, c(vesi) = 4200 J/(kg·°C)
   (6p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

b) 0,3 kg vett temperatuuril 90 °C valatakse alumiiniumtopsi (mass 0,2 kg, temperatuur 20 °C). Leia lõpptemperatuur.
   c(vesi) = 4200 J/(kg·°C), c(alumiinium) = 900 J/(kg·°C)
   (4p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

5. ÜLESANNE — Energia ja igapäevaelu (4 punkti)

a) Sõnasta energia jäävuse seadus soojusõpetuse kontekstis.
   (2p)

   _______________________________________________________________

b) Miks on metall ukselink talvel õues külmem puust uksest? Kasuta mõistet "soojusjuhtivus".
   (2p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

6. ÜLESANNE — Tuumaenergia (3 punkti)

a) Mis vahe on tuumade ühinemisel ja lõhustumisel? Kus kumbki toimub?
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Nimeta üks tuumaenergia eelis ja üks puudus.
   (1p)

   _______________________________________________________________`,

  // ─── Test 10: Elektriõpetus — koondkontrolltöö ────────────────────────
  'Elektriõpetus — koondkontrolltöö': `KOONDKONTROLLTÖÖ: Elektriõpetus
Kokku: 30 punkti | Aeg: 45 minutit | Kalkulaator lubatud | Valemileht lubatud

═══════════════════════════════════════════════════════════

1. ÜLESANNE — Põhimõisted (5 punkti)

a) Mis on elektrivool, pinge ja takistus? Anna igaühele definitsioon ja ühik.
   (3p)

   Elektrivool: __________________________________________________
   Pinge: ________________________________________________________
   Takistus: _____________________________________________________

b) Sõnasta Ohmi seadus ja kirjuta valem.
   (2p)

   _______________________________________________________________
   Valem: ________________________________________

───────────────────────────────────────────────────────────

2. ÜLESANNE — Jada- ja rööpühendus (6 punkti)

Täida tabel:

   | Suurus         | Jadaühendus | Rööpühendus |
   |----------------|-------------|-------------|
   | Voolutugevus I |             |             |
   | Pinge U        |             |             |
   | Takistus R     |             |             |
   (3p)

Kaks takistit R₁ = 10 Ω ja R₂ = 30 Ω. Arvuta kogutakistus:
a) jadaühenduse korral (1,5p)
b) rööpühenduse korral (1,5p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

3. ÜLESANNE — Eritakistus (5 punkti)

a) Kirjuta eritakistuse valem ja selgita tähiseid.
   (2p)

   Valem: ________________________________________

b) Arvuta 80 m pikkuse vasejuhtme takistus, kui ristlõikepindala on 2 mm².
   ρ(vask) = 0,017 Ω·mm²/m
   (3p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

4. ÜLESANNE — Elektrivoolu töö ja võimsus (6 punkti)

a) Kirjuta valemid elektrivoolu töö ja võimsuse arvutamiseks.
   (2p)

   A = ___________  P = ___________

b) Boiler (2000 W) töötab päevas 3 tundi. Kui palju energiat tarbib see kuus (30 päeva)? Anna vastus kWh-des.
   (2p)

   _______________________________________________________________

c) Elektrihind on 0,15 €/kWh. Kui palju maksab boiler kuus?
   (2p)

   _______________________________________________________________

───────────────────────────────────────────────────────────

5. ÜLESANNE — Magnetnähtused (5 punkti)

a) Selgita elektromagneti tööpõhimõtet.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Mis vahe on elektrimootoril ja generaatoril? Selgita energiamuundamist.
   (3p)

   Mootor: _______________________________________________________
   Generaator: ___________________________________________________

───────────────────────────────────────────────────────────

6. ÜLESANNE — Kombineeritud ülesanne (3 punkti)

Elektripliidil (võimsus 1500 W, kasutegur 80%) soojeneb 1,5 kg vett 20 °C-lt keemistemperatuurini.
Kui kaua see aega võtab?  c(vesi) = 4200 J/(kg·°C)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________`,

  // ─── Test 11: Aastalõpu koondkontrolltöö ──────────────────────────────
  '9. klassi füüsika — aastalõpu koondkontrolltöö': `KOONDKONTROLLTÖÖ: 9. klassi füüsika (aastalõpp)
Kokku: 35 punkti | Aeg: 45 minutit | Kalkulaator lubatud | Valemileht lubatud

═══════════════════════════════════════════════════════════

1. ÜLESANNE — Aine ehitus ja soojusõpetus (7 punkti)

a) Selgita lühidalt, kuidas on temperatuur seotud aineosakeste liikumisega.
   (1,5p)

   _______________________________________________________________

b) Nimeta kolm soojusülekande liiki. Milline neist toimib vaakumis?
   (2p)

   _______________________________________________________________

c) 2 kg vett temperatuuril 80 °C segatakse 3 kg veega temperatuuril 20 °C. Leia segunemistemperatuur.
   (3,5p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

2. ÜLESANNE — Oleku muutused (4 punkti)

a) Kirjelda, mis toimub jää soojendamisel –10 °C-lt 110 °C-ni. Nimeta kõik faasid ja oleku muutused.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Selgita, miks aurumine jahutab (nt higilemisel). Kasuta mõistet "energia".
   (2p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

3. ÜLESANNE — Elektrivoolu alused (6 punkti)

a) Sõnasta Ohmi seadus ja kirjuta valem.
   (2p)

   _______________________________________________________________

b) Lampide takistused on R₁ = 20 Ω ja R₂ = 60 Ω. Pinge on 12 V.
   Arvuta koguvoolutugevus, kui lambid on:
   i) jadaühenduses (2p)
   ii) rööpühenduses (2p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

4. ÜLESANNE — Eritakistus (4 punkti)

a) Kirjuta eritakistuse valem ja selgita, mida eritakistus näitab.
   (2p)

   _______________________________________________________________

b) Arvuta 200 m pikkuse alumiiniumjuhtme takistus, ristlõikepindala 4 mm².
   ρ(Al) = 0,028 Ω·mm²/m
   (2p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

5. ÜLESANNE — Elektrivoolu töö ja võimsus (5 punkti)

a) Pesumasin (võimsus 2200 W) töötab 1,5 tundi. Arvuta tarbitud energia kWh-des ja džaulides.
   (2p)

   _______________________________________________________________

b) Elektri hind on 0,15 €/kWh. Pesumasinat kasutatakse 4 korda nädalas (à 1,5 h). Kui palju maksab see kuus (4 nädalat)?
   (3p)

   _______________________________________________________________
   _______________________________________________________________

───────────────────────────────────────────────────────────

6. ÜLESANNE — Magnetnähtused (5 punkti)

a) Kirjelda elektromagneti tööpõhimõtet ja nimeta kaks rakendust.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Selgita elektrimootori ja generaatori tööpõhimõtet. Milline energiamuundamine toimub kummaski?
   (3p)

   Mootor: _______________________________________________________
   Generaator: ___________________________________________________

───────────────────────────────────────────────────────────

7. ÜLESANNE — Tuumaenergia (4 punkti)

a) Mis vahe on tuumade ühinemisel (fusioonil) ja lõhustumisel (fissionil)?
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Nimeta kaks tuumaenergia eelist ja kaks puudust võrreldes fossiilkütustega.
   (2p)

   Eelised: ______________________________________________________
   Puudused: _____________________________________________________`,
};

async function main() {
  console.log('=== Seeding test content (printable questions) ===\n');

  let updated = 0;
  let skipped = 0;

  for (const [title, content] of Object.entries(TEST_CONTENT)) {
    // Find the test by title
    const test = await db.test.findFirst({
      where: {
        title,
        visibility: 'PUBLIC',
        deletedAt: null,
      },
    });

    if (!test) {
      console.log(`⚠ Test not found: "${title}" — skipping`);
      skipped++;
      continue;
    }

    if (test.content) {
      console.log(`⏭ Already has content: "${title}" — skipping`);
      skipped++;
      continue;
    }

    await db.test.update({
      where: { id: test.id },
      data: { content },
    });

    console.log(`✅ Added content to: "${title}"`);
    updated++;
  }

  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
