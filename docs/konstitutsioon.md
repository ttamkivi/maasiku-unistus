# Konstitutsioon — Õpetaja Tagasiside (matemaatika eri-fookus)

**Versioon:** v1.0 (häki-eelne)
**Viimati uuendatud:** 2026-04-30
**Lukustamise hetk:** reede 2026-05-08 enne lõunat (käsiraamatu järgi tiimi muudatused enne lõunat lubatud)

---

## Probleem

Eesti **9. klassi matemaatikaõpetaja** kaotab ühe töökuu aastas testide parandamisele (5 h × 40 nädalat = 200 h, OECD TALIS 2024 — Eesti vastab Euroopa keskmisele).

Iga kontrolltöö peaks andma õpilasele personaalse, edasiviiva tagasiside. Tegelikkuses saab enamik õpilasi tagasi vaid hinde ja punase linnukese. **Põhjus pole laiskus, vaid aeg:** korraliku tagasiside kirjutamine võtab 5–10 min õpilase kohta × 30 õpilast × 3 kontrolltööd kuus = ei jää aega.

Konkreetne olukord: kontrolltöö on tehtud paberil. Õpetaja istub õhtul või nädalavahetusel laua taha 30 paberiga ja peab iga kohta kirjutama, mis läks valesti, miks ja kuidas edasi. Tüüpiliselt ta ei jõua — saadab tagasi hinde ja paari sõnaga märkme.

## Sihtrühm

**9. klassi matemaatikaõpetaja Eesti üldhariduskoolis** (~30 õpilast klassis, 3+ kontrolltööd kuus, valdab eesti keelt erialaterminoloogias).

Sihtrühm on teadlikult valitud kitsamalt:

- **9. klass** = põhikooli lõpp. Viimane hetk lünki täita enne põhikooli eksamit.
- **Matemaatika** = AI-le üks raskemaid aineid (mitmekesised lahendusteed, viis vea-tüüpi, eestikeelne väljund). Kui see töötab matemaatikas, on tee teistesse ainesse selge.
- **Eesti üldhariduskool** = mitte rahvusvaheline, mitte Vene-õppekeelne (kuigi me toetame nendega ülemineku tegijaid).

## Kontekst

- Sama tiim ehitas eelnevalt **füüsika versioonil** sama platvormi (`Õpetaja Tagasiside` / `fyysika-tagasiside.vercel.app`) — pilot-ready aprillist 2026.
- Olemasolevad osad: Next.js 16 + React 19 + Prisma + LibSQL stack; 4-agentline AI pipeline (digitalize → assess → feedback → qa) sprint 18-st; **`lib/brain/mathematics.ts` sisaldab juba RÕK 7-9 + gümnaasium**; demo-PDF'id 9. klassi kontrolltöödest `public/demo/`-s.
- Häki **36 tundi** ei ole nullist ehitamine vaid:
  1. Matemaatika feature flag aktiveerimine + matemaatika-spetsiifilised `FeedbackPattern` kirjed
  2. `assess-agent.ts` matemaatika-vea-taksonoomia tuunimine
  3. 4 päris kontrolltöö lõpust lõpuni demo
  4. Demo-mõõdik: õpetaja ülevaatuse aeg
  5. Pitch deck'i ettevalmistamine (eestikeelse õppe ülemineku frame)

Eestikeelse õppe ülemineku kontekst: hackathon on Presidendi haridushäkaton, kus žürii kriteerium #1 on **"sobivus toetama eestikeelsele haridusele üleminekut"**. Vene-õppe-koolide õpilastele, kes lähevad üle eestikeelsele matemaatikale, on tagasiside eesti matemaatikaterminoloogias kriitilise tähtsusega.

## Põhimõtted ja piirangud

Need on tiimi kokkulepped, mis raamistavad kõiki edasisi otsuseid. Spec ja PRD järgivad neid; vastuolu korral võidab konstitutsioon.

1. **Õpetaja on alati silmas.** AI ei ütle õpilasele midagi, mida õpetaja pole üle vaadanud ja kinnitanud. Tagasiside on **mustand**, õpetaja on viimane otsustaja. (EU AI Act Art. 14 inimese-üle-vaatuse nõue.)
2. **Eesti keeles, eesti matemaatikakeeles, RÕK-i järgi.** Tagasiside terminoloogia peab vastama eesti kooli matemaatika sõnavarale ja õppekavale, mitte tõlgitud anglitsismidele. Iga RÕK-viide peab olema **päriselt olemas** (mitte hallutsineeritud).
3. **Töötab paberi peal.** Sisend on foto käsitsi tehtud kontrolltööst (mobiili kaameraga, halvas valguses, viltu). Kui OCR ei tööta päris käsitsi-lahendusel, ei ole demot. Klaviatuuriga sisestamine ei ole asendus.
4. **Õpilane on alaealine — andmed on tundlikud.** Anonüümne kood (Õpilane 01...) **enne** AI-le saatmist; pildid kustutatud peale õpetaja kinnitust; **lapsevanema nõusolek hard-gate** iga AI-analüüsi ees. GDPR ja EU AI Act vastavus algusest peale, mitte hiljem.
5. **Kvaliteet on mõõdetav, mitte tunnetatav.** Iga väide "see töötab" peab olema seotud konkreetse mõõdetava näitajaga (õpetaja ülevaatuse aeg sekundites, vea klassifikatsiooni täpsus protsentides, RÕK-viite reaalsuse osakaal).
6. **Pilot-ready toode, mitte häki-prototüüp.** Andmed on tegelikud, salvestus on tegelik, audit-trail on tegelik. Häki ajal ehitatud osad peavad sobima sama koodibaasi sisse — mitte one-off demo eraldi koodibaasis.
7. **Hindeid ei näita.** Tagasiside sisaldab tugevusi, arengukohti, järgmisi samme, RÕK-i viidet. Hinde-numbrit ja klassi-võrdlust ei ole. (Teadlik valik, uuringutele tuginev — õpilased ignoreerivad tagasisidet, kui hinne on nähtav.)

## Edu kriteeriumid

### Häki lõpuks (laupäev 9. mai 19:30)

| # | Kriteerium | Mõõdik | Sihtväärtus |
|---|---|---|---|
| 1 | **Õpetaja ülevaatuse aeg** | sek AI-mustandi kontrollimiseks ja kinnitamiseks | mediaan ≤ 60 sek (vs 5–10 min nullist kirjutamiseks) |
| 2 | **Töötab päris töödel** | mitu päris 9. klassi kontrolltööd lõpust lõpuni | 4 (vastavalt submissionile) |
| 3 | **Vea klassifikatsiooni täpsus** | õpetaja-kinnitatud vs AI-pakutud vea tüüp | ≥ 80% õigesti |
| 4 | **Tagasiside kvaliteet** | õpetaja kinnitab AI-tagasiside muutmata | ≥ 50% kinnitatakse muutmata; ülejäänud ≤ 30 sek redigeerimist |
| 5 | **RÕK-seos** | iga tagasiside viitab konkreetsele RÕK punktile | 100%, ükski viide pole hallutsineeritud |
| 6 | **Eestikeelse õppe seos** | pitch näitab selgelt, kuidas lahendus toetab üleminekut | jah/ei (žürii kriteerium #1) |

### Häki-välised, korraldajate nõue 3 kuu jooksul

- Testimine **vähemalt 2 haridusasutuses** — kaetud Audentes International School (Triin Meritam) + Praktikali partnerkool (Omari Loid).
- 1-leheküljeline A4 tulemuste kokkuvõte.
- Valmidus 30-min tutvustuseks tulemustest ja järgmistest sammudest.

## Avatud küsimused

- **Vea-taksonoomia kontroll `assess-agent.ts`-s** — hetke koodis on mingi error type loogika; kas seal on juba 5+1 kategooriat (mõiste/arvutus/märk/loogika/ühik/ei ole viga) või füüsika-spetsiifiline taksonoomia? Triin peab valideerima.
- **Demo-mõõdik UI-s** — kas õpetaja ülevaatuse aja sekund-täpne mõõtmine on juba app'is, või ehitame selle häki ajal? PRD F-jadasse lisada kui pole.
- **AI provider strateegia häki ajal** — Claude (runtime) + Codex (build velocity) hybrid; kas Codex'i kogu krediit kasutame ainult koodi-genereerimiseks, mitte runtime-AI vahetuseks? Vt `repo-staging/AGENTS.md`.
