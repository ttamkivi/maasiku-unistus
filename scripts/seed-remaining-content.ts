/**
 * Seed script: Adds printable test content to the 2 remaining tests without content.
 * Run via: npx tsx scripts/seed-remaining-content.ts
 * Idempotent — skips tests that already have content.
 */

import { db } from '../lib/db';

const TEST_CONTENT: Record<string, string> = {

  'Mehaanika kontrolltöö': `KONTROLLTÖÖ: Mehaanika
Kokku: 20 punkti | Aeg: 40 minutit | Kalkulaator lubatud

═══════════════════════════════════════════════════════════

1. ÜLESANNE — Kiirus ja liikumine (4 punkti)

a) Auto sõidab 90 km/h kiirusega. Arvuta, kui kaugele jõuab auto 2,5 tunniga.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Jalgrattur läbis 15 km 45 minutiga. Arvuta jalgratturi keskmine kiirus km/h-des.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

2. ÜLESANNE — Jõud ja mass (4 punkti)

a) Selgita Newtoni II seadust oma sõnadega ja too üks näide igapäevaelust.
   (2p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

b) Kehale mõjub jõud 50 N ja keha mass on 10 kg. Arvuta keha kiirendus.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

3. ÜLESANNE — Raskusjõud ja mass (4 punkti)

a) Arvuta 8 kg massiga keha raskusjõud Maal (g = 9,8 m/s²).
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Astronaudi mass on 75 kg. Arvuta tema kaal Kuul, kus g = 1,6 m/s². Võrdle Maa kaaluga.
   (2p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

4. ÜLESANNE — Hõõrdejõud (4 punkti)

a) Nimeta kolm liiki hõõrdumist ja too igaühe kohta üks näide.
   (2p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

b) Selgita, miks on hõõrdejõud mõnikord kasulik ja mõnikord kahjulik. Too kummagi kohta näide.
   (2p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

5. ÜLESANNE — Töö ja energia (4 punkti)

a) Tõstuk tõstab 200 kg massiga kasti 3 m kõrgusele. Arvuta tehtud töö (g = 9,8 m/s²).
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Selgita energia jäävuse seadust ja too üks näide, kus potentsiaalne energia muundub kineetiliseks.
   (2p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

═══════════════════════════════════════════════════════════
Edu!`,


  'elektrivärk': `KONTROLLTÖÖ: Elektriõpetus
Kokku: 20 punkti | Aeg: 40 minutit | Kalkulaator lubatud

═══════════════════════════════════════════════════════════

1. ÜLESANNE — Elektrilaeng ja väli (4 punkti)

a) Selgita, mis on elektrilaeng. Nimeta kaks laengu liiki ja kirjelda, kuidas samanimelised ja erinimelised laengud teineteist mõjutavad.
   (2p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

b) Kirjelda elektrivälja mõistet ja selgita, kuidas saab elektrivälja olemasolu tõestada.
   (2p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

2. ÜLESANNE — Elektrivool ja pinge (4 punkti)

a) Mis on elektrivool? Nimeta elektrivoolu tugevuse ühik ja mõõteriist.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Vooluringi pinge on 12 V ja voolutugevus 2 A. Arvuta takistus Ohmi seaduse abil.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

3. ÜLESANNE — Takistus ja eritakistus (4 punkti)

a) Nimeta kolm tegurit, millest sõltub juhtme takistus. Selgita igaüht ühe lausega.
   (2p)

   _______________________________________________________________
   _______________________________________________________________
   _______________________________________________________________

b) Juhtme pikkus on 10 m, ristlõikepindala 0,5 mm² ja eritakistus 0,017 Ω·mm²/m (vask). Arvuta juhtme takistus.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

4. ÜLESANNE — Jada- ja rööpühendus (4 punkti)

a) Joonista skeem, kus kaks takistit (R₁ = 4 Ω ja R₂ = 6 Ω) on ühendatud jadamisi. Arvuta kogutakistus.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Samad takistid (R₁ = 4 Ω ja R₂ = 6 Ω) on nüüd ühendatud rööbiti. Arvuta kogutakistus.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

5. ÜLESANNE — Elektrienergia ja võimsus (4 punkti)

a) Elektripliit tarbib voolu 10 A pingel 230 V. Arvuta pliidi võimsus.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

b) Sama pliit töötab 2 tundi. Arvuta tarbitud elektrienergia kilovatt-tundides (kWh) ja džaulides.
   (2p)

   _______________________________________________________________
   _______________________________________________________________

═══════════════════════════════════════════════════════════
Edu!`,

};

async function main() {
  console.log('\n=== Seeding remaining test content ===\n');

  for (const [title, content] of Object.entries(TEST_CONTENT)) {
    const test = await db.test.findFirst({ where: { title } });

    if (!test) {
      console.log(`⚠ Test not found: "${title}" — skipping`);
      continue;
    }

    if (test.content) {
      console.log(`⏭ Already has content: "${title}" — skipping`);
      continue;
    }

    await db.test.update({
      where: { id: test.id },
      data: { content },
    });
    console.log(`✅ Added content: "${title}"`);
  }

  console.log('\n=== Done ===\n');
}

main().catch(console.error);
