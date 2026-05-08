# Ehituslogi — Õpetaja Tagasiside (matemaatika eri-fookus)

## Kirjutamise reegel

Lisa siia ainult **otsused, avastused, kompromissid ja spec'i muutused**, mis aitavad järgmisel Codexi/Claude Code'i sessioonil aru saada, miks projekt on sellises seisus.

**Mis siia EI lähe:** üldine progress ("täna ehitasin"), TODOd, mõtted. Need käivad `prd.md`-sse või tiimi chati.

Vorm: `### YYYY-MM-DD (autor)` + 1-3 lause kanne, miks ja mida.

---

## Logi

### 2026-05-08 (häki päev 1, 17:00) — Brain'i sisu kasutus-mustrid + few-shot example retrieval (F9.9)

**Avastus:** spec rääkis õigest struktuurist (FYI taust + 3 aktiivset tasandit), aga **ei selgitanud, kuidas iga sisu-tüüp agendi-promptisse jõuab**. Andmed `brain/`-s on neljas eri kasutus-mustris ja iga sisu-tüüp peab olema selgelt klassifitseeritud:

1. **System context (load-once):** Ainekava + Ainekaart + Õigusruum + Vea-taksonoomia + Pedagoogika-põhimõtted → cached agendi-init'is, sama kõikide päringute jaoks.
2. **Per-request context (load fresh):** Test rubric + answerKey + testType + solutionKey → DB query iga TestId kohta.
3. **Few-shot examples (retrieval):** Folder #6 PDF-id (~25 õpetaja-tagasisidet) → top-3 sarnaseimat näidet retrieved per päringu (F9.9 uus).
4. **Dynamic learnings (DB query):** FeedbackPattern tabelist agregeeritud mustrid → cached 10 min.

**spec.md uuendus:** lisatud uus sektsioon "Brain'i sisu kasutus" enne "Tehniline arhitektuur" — tabel mis-kuhu-kuidas + 4 mustri definitsioonid + folder #6 4-otstarbeline kasutus (eval / few-shot / FeedbackPattern source / training corpus).

**prd.md uuendus:** uus F9.9 nõue (Few-shot example retrieval süsteem):
- F9.9.1: PDF-ide ekstraktimine + index loomine
- F9.9.2: kerge sarnasus-mootor (mitte ML — keyword + kursus + vea-tüüp match)
- F9.9.3: integreerimine `feedback-agent`-i (top-3 näited promptis)
- F9.9.4: pitch-vara ("AI õpib 25 päris õpetaja-tagasisidest")
- F9.9.5: privaatsus (näidete anonümiseerimine)

**Pedagoogiline tähendus:** see muudab AI **õppivaks** mitte **reegli-järgivaks**. AI ei lähe lihtsalt rubrici peale, vaid näeb in-context, kuidas päris õpetaja sarnaste ülesannete tagasiside-kirjutus käib. See on **suur demo-väärtus**: jüriile saame öelda "meie AI ei ole staatiline regulaator, vaid õpib päris õpetajate näidetelt."

**Sprint 19.5 mõju:** lisaks ~3-4 h F9.9 jaoks. Kogu Sprint 19.5 nüüd ~10-14 h. Eelistus: F9.4 (eval-loop) + F9.9 (few-shot) ühe sprindina, sest F9.9 ehitab F9.4 ekstraktimise peale.

### 2026-05-08 (häki päev 1, 15:35) — Ainekaart muutus FYI taustaks (matemaatikaõpetajate feedback)

**WhatsApp-vestluses:**
- Tiimijuht: küsis tiimi 6-kihilise mudeli kohta, kas RÕK → Ainekaart → tühi KT → ... → hinnatud vastab kontrolltöö elutsüklile.
- Matemaatikaõpetaja A: "Ainekaart on liiga üldine, see on pigem õpilasele info kogu kursuse kohta. Tööde parandamisel sellest eriti abi ei ole."
- Matemaatikaõpetaja B: "Ma ei teagi kas ainekaarti on vaja."

**Otsus:** Ainekaart **EI ole** hindamise sihtmärk, vaid läheb FYI taustaks. Ainekava + Ainekaart liidetakse üheks tausta-kihiks. **Hindamine algab tasandilt 'Tühi kontrolltöö + juhend' (rubric).**

**Mõju spec'ile:**

- `konstitutsioon.md` põhimõte 2 ümber sõnastatud: Ainekava + Ainekaart on FYI taustakontekst, mitte 3-tasandiline assessment-hierarhia.
- `spec.md` F3 hierarhia: 4 tasandit → **1 FYI taust + 3 aktiivset tasandit** (Tasand 1 PRIMARY = Test rubric + answerKey + testType + solutionKey; Tasand 2 = per-subquestion criteria; Tasand 3 = vea-taksonoomia).
- `prd.md` F9.5 ümber struktureeritud: 3 ainekava-allikat (RÕK + TRK + koolipõhine Ainekaart) lähevad **ühte FYI sektsiooni**, mitte 3 eraldi assessment-tasandit. Salvestus-kausta nimi `brain/static/ainekava-fyi/` (eksplitsiitselt FYI).
- `prd.md` F9.7 ümber: AI prompti läheb selge eraldus `## FYI: pedagoogiline taust (ÄRA HINDA SELLE VASTU)` + `## ASSESSMENT TARGET: Test rubric...`. `qa-agent` valideerib **rubric-järgsust**, mitte Ainekaardi-järgsust.
- `teaching-process-flow.md`: 6 kihti → **5 kihti** (#1 Ainekava ja #2 Ainekaart liideti üheks "FYI taust" kihiks; numeratsioon nihkus).

**Pedagoogiline põhjendus** (miks see õige otsus on):

- Õpetaja vaade: Ainekaart on **planeeris-tööriist** semestri jaoks, mitte hindamis-juhend ühe testi jaoks. Iga tööd hinnatakse selle testi enda rubric'u järgi.
- AI-promptis: kui AI hindab Ainekaardi õpitulemuste vastu, võib ta öelda "õpilane ei saavutanud õpitulemus #5" — aga see pole **selle testi** funktsioon. Test mõõdab konkreetseid asju (rubric'u järgi), mis on osa õpitulemuse omandamisest.
- Demo-vaade: "AI hindab samamoodi nagu õpetaja — rubric'u järgi" on **palju lihtsam pitch** kui "AI hindab Ainekaardi õpitulemuste hierarhia järgi".

**Mida MITTE muuta:**

- Ainekaart **jääb** kättesaadavaks `brain/static/ainekava-fyi/`-s — AI **peab teadma**, et see on kursus 11.1 raames, mitte hüpata otsekohe rubric'u peale ilma kontekstita.
- Tühjad kontrolltööd (kaust #3 gdrive'is) jäävad **PEAMISE assessment-target'i** asukohaks.

### 2026-05-08 (häki päev 1, varem) — Tiimi "AI aju" struktuuri õpitud + grading-kriteeriumite hierarhia + agent improvements plan

Tiim on häki esimese hommiku jooksul ehitanud **palju pedagoogiliselt küpsema mudeli** kui mu original'is `architecture/00-program-brain-design.md`-s. Vt `team-brain-analysis.md` Brain'is detailides.

**Mis muutus mu mentaalmudelis:**

1. **3-osaline student-tööde pipeline** — hindamata → õpetaja-lahendatud (gold standard) → AI-hinnatud. Tiim on aru saanud, et **gold-standard eval-set on projekti kõige tähtsam vara**. Olemas ~25 anonüümitud "õpetaja lahendatud" PDF-i, mis tulevad eval-loop'i sisse.

2. **Per-kursus Ainekaardid** (gümnaasiumi 11/12/13. kursus) konkreetsete õpitulemustega — palju täpsem kui mu üldine "RÕK 7-9. klass". Iga kursus annab AI-le konkreetsed assessment-targets, mille vastu hinnata.

3. **Õigusruum 2026 analüüs** — 7 spetsiifilist Eesti seadust + analüüs "kas kontrolltöö on autoriõigusega kaitstud". Asendab mu üldist GDPR/EU AI Act viidet konkreetse Eesti raami vastu.

4. **Õpilaste tagasiside juba kogutud** — 4 võtmenõuet, mis vajavad konkreetseid agentide muudatusi:
   - Korduvate vigade välja toomine (mitte ainult per-question hinnang)
   - Õigete vastuste näitamine + õpitavate teemade loend
   - Hindamisjuhendi selgitus iga alapunkti juures
   - Töö-lõpu kokkuvõte 3 põhiveast + 3 üle vaadata teemast

**Hindamis-kriteeriumite hierarhia (uus selge mudel):**

Kontrolltööde hindamine ei ole üks-tasandine "õige/vale". See on **4-tasandine hierarhia**, kus iga tasand annab AI-le erineva konteksti:

| Tasand | Mis | Kus elab | Mida AI sealt loeb |
|---|---|---|---|
| 1. **Õpitulemused** | Mida test üldse mõõdab | `Ainekaart` (per kursus) | "see test mõõdab vektor-ruumi õpitulemusi 1, 3, 5" |
| 2. **Test rubric** | Punktide jaotus küsimuste lõikes | `Test.rubric` + `Test.answerKey` | "küsimus 3 = 4 punkti, õige vastus on X" |
| 3. **Per-subquestion criteria** | Mille eest punkte saab ÜHE küsimuse sees | Rubric'u parsitud osa või vaikimisi | "1p õige meetod, 1p õige seadistus, 1p õige arvutus, 1p õige ühik" |
| 4. **Vea-taksonoomia** | Kui kriteerium ei täideta, mis tüüpi viga | `assess-agent` 5+1 klassifikaatorid | "ühik puudub → ühiku-viga" |

`feedback-agent` koostab tagasiside, mis **kõnnib läbi kõik 4 tasandit**:
- "Sa pidid näitama, et kasutad ruumivektorite kollineaarsuse tunnuseid (Ainekaart, õpitulemus 2)" — tasand 1
- "Selle ülesande maksimum oli 4p" — tasand 2
- "Sina said 2p sest ✓ õige meetod (1p), ✓ õige seadistus (1p), ✗ arvutusviga (0p), ✗ ühik puudub (0p)" — tasand 3
- "Sa tegid arvutusvea (sama tüüpi kordus 4 küsimuses) ja ühiku-vea" — tasand 4

See on **konkreetsem ja pedagoogiliselt rangem** kui üldine "tugevused / arengukohad" mudel. Lisaks: tasand 1 (Ainekaart) annab AI-le **selge konteksti, mida hinnata**, mitte ei lasta AI-l tagantjärele otsustada.

**Mida see tähendab repos:**

- `docs/spec.md` F3 sektsioon **kohandatud** vastavalt 4 õpilase-nõudele (per-küsimus + cross-question kokkuvõte) + 4-tasandiline hierarhia tehtud selgeks
- `docs/prd.md` uus F9 sektsioon (F9.1–F9.7) — pattern-detector, end-of-test summary, rubric explanation, eval-loop, ainekaart loader, õigusruum loader, **grading-kriteeriumite hierarhia integratsioon**
- `architecture/00-program-brain-design.md` viitab nüüd **tiimi tegelikule struktuurile** kui implementation reference, mitte mu hüpoteetilisele plaanile

**Mida sprint 19 võrra läbi vaadata:**

Sprint 19 plaanis algselt oli `brain/static/{legal,curriculum,pedagogy,assessment}` üldine struktuur. Tiimi struktuuri valguses:
- `brain/static/curriculum/` muutub `brain/static/ainekaardid/` (per-kursus, mitte per-klass) + `brain/static/õpitulemused/` per-Ainekaart
- `brain/static/legal/` saab konkreetse Eesti õigusruumi sisuhalduri (mitte üldine GDPR)
- Lisatud uus dimension: `brain/eval/` (gold-standard PDF-id, eval-results, võrdluse output)
- `brain/static/assessment/` saab konkreetse 4-tasandilise hierarhia struktuuri-mudeli

Sprint 19 jätkamiseks vt `architecture/02-sprint-19-architecture-refactor.md`, lisaks **Sprint 19.5 sprint card** sammudele F9.1–F9.7 (eraldi fail Brain'is, järgmiseks koostatav).

**Õpetajate küsitlus paralleelselt** levitamas (Google Form). Q4 sõnastus võiks olla positiivseks ümber-tehtud (vt `team-brain-analysis.md`-s "Mis on nõrk"), aga muu küsimustik on soliidne. Vastuste agregeerimine pitchi lõuna-pausi ajal laupäeval.

### 2026-04-30 (tiim) — Sprint 19 plaanitud: Brain arhitektuur + PII tokenizer + OpenAI provider

- **Programm-aju formaalselt eraldatud häki-projekti dokumentidest.** Uus `brain/` top-level kaust (`static/legal`, `static/curriculum`, `static/pedagogy`, `static/assessment` + `dynamic-spec.md`). `docs/` jääb häki spec'i jaoks. `lib/brain/` muutub puhtaks loader-kihiks. Põhimõte 8 lisatud konstitutsioonisse.
- **PII tokeniseerimine standardiseeritud kihina** `lib/security/pii-tokenizer.ts`-s. Praegu agentide-vahel hajutatud anonümiseerimine tõstetakse üheks kohaks. `[bracket]` PII (emailid, isikukoodid, telefonid) ei lähe LLM-i — audit-safety-net peatab pipeline'i lekke korral. Põhimõte 9 lisatud konstitutsioonisse.
- **Multi-provider aktiveeritud häki ajaks.** `lib/ai-provider.ts` on juba multi-provider disainitud (Anthropic + OpenAI + Google), aga OpenAI dependency + tegelik kõnekood on TODO. Sprint 19 Faas 4.5 implementeerib selle. Häki ajal kasutame organisaatorite OpenAI krediiti läbi BYOK-arhitektuuri (`AIProviderConfig` per kool), mitte env-default'i muutes. See tugevdab pitch'i: "iga kool valib oma provideri ja kannab oma API-kulu".
- **Tokenizer on provider-agnostic** — sama kiht töötab Claude, OpenAI ja Gemini'ga, sest tokenize/detokenize tegutseb stringi-tasemel enne provider-spetsiifilist payload-pakkimist.
- **Mõju kasutaja-vaatele:** ükski. See on infra-uuendus, demo-funktsionaalsus säilib.
- **Sprint 19 detail:** `architecture/02-sprint-19-architecture-refactor.md` (Brain'is) sisaldab Faas 1-6 sammhaaval kava, eeldatav aeg 5-8 h.
- **Paralleelelu lubatud** — vana `lib/brain/*.ts` const-id jäävad esialgu shimm'idena (`export const X = loadStaticContent(...)`), peale Sprint 20-t kustutame.

### 2026-04-30 (tiim) — õpilase-arusaamise mõõdik lisatud

- **Edu kriteerium #7, kasutajalugu K11, mittefunktsionaalne nõue N8, häki-päeva nõue D7 lisatud.** Põhjus: häki mentori feedback Eventornado discussion'is — meie esialgsed kriteeriumid mõõtsid ainult õpetaja-poolt (review-aeg, klassifikatsioon, RÕK-vaste). Kui AI tagasiside on õpetajale-mõistlik aga õpilasele segane, me ei lahendanud probleemi.
- **Kahekihiline lahendus:** (1) eval-set'is iga õpilane hindab oma tagasisidet skaalal "selge / keskmine / segane" pluss vabatext (= mass-mõõdik), (2) demo'l laupäeval üks külalis-õpilane matemaatikaõpetaja klassist annab vahetut hinnangut jürii ees (= näide-mõõdik). Esimene annab kvantiteedi, teine annab usaldusväärsuse.
- **Tiimi suurus jääb 4-liikmeliseks** (tiimijuht + 2 matemaatikaõpetajat + UX/disainer) + 2 TBD. Õpilane on **demo-osaleja** (laupäeva pärastlõunal ~30-60 min), mitte tiimi-liige. Hoiab raami 3-5 sees ilma erandita.
- **D7 sõltuvus:** matemaatikaõpetaja peab oma klassist värbama ühe põnevil 9. klassi õpilase + vanema kirjaliku nõusoleku.

### 2026-04-30 (tiim) — spec-driven scaffold

- **Spec-driven scaffold lisatud Praktikali häki-template'i järgi.** AGENTS.md uuendatud (preserve nextjs-rules + lisa spec-driven workflow + projekt-spetsiifilised reeglid). Lisatud `docs/konstitutsioon.md`, `spec.md`, `prd.md`, `ehituslogi.md`. Filo-konventsioon: `ehituslogi.md` (mitte `log.md`) match'imaks Praktikali template'iga, et tiimi liikmed teiste häki tiimidega samas keeles räägivad.
- **Vea-taksonoomia lukustatud konstitutsioonis 5+1 kategooriasse:** mõiste / arvutus / märk / loogika / ühik / ei ole viga. Kui `assess-agent.ts` praegu kasutab teist taksonoomiat (näiteks füüsika-spetsiifilist), siis häki-eelne ülesanne on see matemaatikale kohandada. Matemaatikaõpetaja valideerib enne reedet.
- **Tagasiside struktuur:** tugevused / arengukohad / järgmised sammud / märkmed õpetajale + RÕK-viide. Hindenumbrit ja klassi-võrdlust EI sisalda. Põhjus: pedagoogika uuringud näitavad, et õpilased ignoreerivad tagasisidet kui hinne on nähtav.
- **Skoop lukustatud 9. klassi matemaatikale.** Mitte 10.-12. klass, mitte teised ained, mitte õpilase iseteenindus. Põhjus: "kui matemaatika 9. klassis töötab, on tee teistesse selge" (submission), aga häki demo on lukustatud kitsale fookusele.
- **Demo-režiim häki uus ülesanne.** F7 PRD-s. Üks `/demo` route, eel-täidetud 4 päris õpilastööga `public/demo/kontrolltoo_9A_4_opilast.pdf`-st. Külalis-õpetaja saab läbi viia ilma logimata. **See on ainuke märkimisväärne uus kood, mida häki ajal ehitada — ülejäänu on tuuning.**
- **DB & infra eel-häki nädala plaan separaatselt:** vt Brain'is `db-prep/00-week-plan.md`. Kokku 4-6 h tööd üle viie ülesande. **Ei vaheta DB-mootorit.** Postgres migration runbook on ära kirjutatud kontingentsiplaaniks, mitte enne häkki täitmiseks.
- **AI provider strateegia:** Anthropic Claude jääb runtime'iks (toode jookseb sellel). Codex (häki ametlik tööriist + krediidid) kasutame ainult koodi-genereerimiseks, mitte runtime-AI vahetuseks. Põhjus: 5 nädalat tunutud Claude-pipeline'i ei ole mõtet 36 tunni eest lammutada.
- **Per-student API call on JUBA olemas** — `app/api/tests/[id]/bulk-analyze/route.ts` POST-i kommentaar ütleb otse: "Analyze a single result (called per-result from the client to show progress)". Niisiis Vercel timeout'i mure on lahendatud arhitektuuriliselt; jääb ainult `maxDuration = 60` lisamine route'i konfigi.
