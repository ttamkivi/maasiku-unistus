# Spec — Õpetaja Tagasiside (matemaatika eri-fookus)

**Versioon:** v1.0 (häki-eelne)
**Seotud:** [konstitutsioon.md](./konstitutsioon.md), [prd.md](./prd.md), [ehituslogi.md](./ehituslogi.md)
**Reegel:** see fail kirjeldab MIDA lahendus teeb. KUIDAS otsustab Codex / Claude Code rakendaja.

---

## Ülevaade

Õpetaja Tagasiside on Eesti üldhariduskoolide õpetajatele mõeldud AI-tööriist, mis loeb käsitsi täidetud paberil olevad kontrolltöö pildid, klassifitseerib vead, koostab personaalse eestikeelse tagasiside iga õpilase kohta, ja jätab lõpliku otsuse õpetajale. Alates füüsikast aprillis 2026; matemaatika 9. klassi eri-fookus mais 2026 Presidendi haridushäkatonil.

## Kasutajalood

### MVP (ehitatud / valmistuvad häkiks) — peavad häki demo'ks töötama

- **K1.** Õpetajana tahan ma laadida üles fotosid käsitsi täidetud 9. klassi matemaatika kontrolltööst (kuni 4 fotot ühe õpilase kohta), et süsteem alustaks töötlemist. *(vt `app/dashboard/tests/[id]/batch-import/page.tsx`)*
- **K2.** Õpetajana tahan ma näha tuvastatud õpilase nime (klassikaaslaste registriga match), et veenduda õige õpilasega seotuses enne AI-analüüsi. *(vt fuzzy match `lib/curriculum-filter.ts`-i ja batch-import flow'i)*
- **K3.** Õpetajana tahan ma näha õpilase lahendust ja AI poolt klassifitseeritud vea tüüpi (üks 5+1-st: mõiste / arvutus / märk / loogika / ühik / ei ole viga), et saaksin seda kiirelt kontrollida.
- **K4.** Õpetajana tahan ma näha AI mustand-tagasisidet eesti keeles, RÕK-i punktile viitavalt (struktuur: tugevused / arengukohad / järgmised sammud / märkmed õpetajale), et saaksin selle ülevaatuse 1 minutiga teha. *(vt `lib/agents/feedback-agent.ts`)*
- **K5.** Õpetajana tahan ma tagasisidet redigeerida (vabatekst) või kinnitada ühe klõpsuga. *(vt `app/dashboard/results/`)*
- **K6.** Õpetajana tahan ma näha klassi ülevaadet (kus mitu õpilast tegi sama vea-tüüpi vea), et saaksin järgmise tunni planeerida selle järgi.
- **K7.** Õpetajana tahan ma jagada kinnitatud tagasiside õpilasega (e-postiga `.docx` manusena või lingiga töölaual) — alles peale lapsevanema kehtiva nõusoleku kontrolli.

### Stretch (kui häki ajal jääb aega)

- **K8.** Õpetajana tahan ma näha, milliste RÕK-i punktidega on klassil kõige rohkem probleeme.
- **K9.** Õpetajana tahan ma "õpetada" süsteemi — kui ma redigeerin tagasisidet, peaks `FeedbackPattern` tabelis tekkima kanne minu stiili järgi tulevasteks soovitusteks.

### Demo-lugu (laupäev 9. mai žürii ees)

- **K10.** Külalis-õpetajana (mitte tiimi liige) tahan ma vaadata läbi 4 päris õpilastöö AI-tagasiside ja kinnitada, et keskmine ülevaatuse aeg on ≤ 1 minut, et žürii saaks hinnata, kas väide on tõene. *(stopper algab AI-mustandi näitamisest, lõpeb kinnituse klõpsust)*
- **K11.** 9. klassi õpilasena tahan ma lugeda mulle suunatud AI+õpetaja kinnitatud tagasisidet ja anda hinnangu skaalal "selge / keskmine / segane" + vabatekstis öelda, mis on segane, et tiim näeks, kas keskmine lõppkasutaja saab tagasisidest aru ja oskab järgmise sammu astuda. *(rakendub kahel viisil: eel-häki eval-set'i raames mitukümmend õpilast hindavad anonüümselt; demo'l laupäeval üks külalis-õpilane Triin'i klassist annab vahetut tagasisidet jürii ees.)*

## Funktsionaalsus kasutaja vaatest

### F1 — Sisestamine (skanee + tuvastamine)
- Õpetaja teeb fotosid (1–4 lehekülge per õpilane); upload PDF-ina või eraldi fotodega.
- `digitalize-agent` tuvastab kontrolltöö struktuuri (küsimuse number → õpilase vastus) + õpilase nime (fuzzy match klassikaaslaste registriga).
- Roheline = kindel match, kollane = kahtlane, punane = manual override vajalik.

### F2 — Analüüs ja vea klassifikatsioon (matemaatika)
- `assess-agent` võrdleb õpilase vastust õige vastusega (rubric + answerKey kontekstist).
- Klassifitseerib vea ühte 5+1-st (mõiste / arvutus / märk / loogika / ühik / ei ole viga).
- Toob välja konkreetse koha lahenduses, kus viga tekkis.

### F3 — Tagasiside genereerimine

#### Hindamis-kriteeriumite hierarhia: 1 FYI taust + 3 aktiivset tasandit

Triin & Evelin tagasiside (2026-05-08): Ainekaart on liiga üldine ja pole hindamise sihtmärk. Hindamine sõltub konkreetse testi rubricust. Niisiis:

##### FYI taust (mida AI peab teadma, aga mitte hindama selle vastu)

- **Ainekava + Ainekaart kombinatsioonina** — RÕK matemaatikale gümnaasiumis + TRK referends + koolipõhine Ainekaart (`lib/brain/ainekava-fyi/`). AI saab konteksti "see test on kursuse 11.1 raames, mille üldised teemad on X, Y, Z". Selle taustaga AI mõistab, **mis kursuse** rubric on, aga **ei hinda õpitulemuste vastu**.

##### Tasand 1 (PRIMARY) — Test rubric + answerKey + testType

`Test.rubric`, `Test.answerKey`, `Test.testType`, `Test.solutionKey` DB-st.

Näide: "see on KT (regulaarne), küsimus 3 = 4 punkti, õige vastus on X, õpetaja-lahenduses näidatud samm-sammu lahendamise viis on Y."

**See on PEAMINE assessment-target** — AI hindab iga küsimust selle vastu.

##### Tasand 2 — Per-subquestion criteria

Mille eest punkte saab ÜHE küsimuse sees. Parsitud rubricust või vaikimisi (1p õige meetod, 1p õige seadistus, 1p õige arvutus, 1p õige ühik). Näide: "vajalikud: meetod ✓, seadistus ✓, arvutus ✗, ühik ✗".

##### Tasand 3 — Vea-taksonoomia

Kui kriteerium ei täideta, mis tüüpi viga. 5+1 klassifikatsioon (mõiste/arvutus/märk/loogika/ühik/ei ole viga).

`feedback-agent` koostab tagasiside, mis **kõnnib läbi 3 aktiivset tasandit järjest** (FYI taust on promptisse, aga ei jõua õpilase-vastuste sisu) — see annab õpilasele selge kausaalse selgituse "mille eest punkte sai" → "mille eest mille kaotasin" → "miks see oli see vea-tüüp".

#### Õpilaste reaalsed nõuded (kogutud tiimi poolt 2026-05-08, vt `team-brain-analysis.md`):

1. "Et AI tooks välja **korduvad vead** ja annaks **õiged vastused**, mitte ainult kas õige või vale"
2. "Et AI tooks välja, et **mida peab veel juurde õppima**"
3. "Selgitaks rohkem ja täpsemalt **hindamisjuhendit iga alapunkti juures**"
4. "Kirjutaks **töö lõppu kokkuvõtte**, et mis olid põhivead ja mida peab veel üle vaatama"

#### Per-küsimus tagasiside (`feedback-agent` output, iga küsimuse kohta)

- **õige vastus** — konkreetselt näidatud (mitte ainult "valesti", vaid "õige vastus oli X")
- **vea-tüüp** — mõisteviga / arvutusviga / märgiviga / loogikaviga / ühiku viga / ei ole viga
- **selgitus** — miks õpilane eksis, **2–4 lauset**
- **hindamisjuhendi (rubric) tõlgendus** — kuidas punkte jaotati selle ülesande puhul: "anti maksimum 4p; sina said 2p sest ✓ õige meetod (1p), ✓ õige seadistus (1p), ✗ arvutusviga (0p), ✗ ühik puudub (0p)"
- **RÕK-viide** — link riiklikule õppekavale / Ainekaardi õpitulemusele

#### Cross-question kokkuvõte (`feedback-agent` output, töö-lõpus, **uus**)

Pärast kõikide küsimuste tagasiside-genereerimist `pattern-detector` analüüsib mustreid ja `feedback-agent` koostab töö-lõpu kokkuvõtte:

- **tugevused** — 2–3 punkti, mida õpilane terve töö vältel hästi tegi
- **korduvad vead (top 3)** — vea-tüüp + kus see esines (küsimuste numbrid) + üks lause "miks see kordub" + parandus-soovitus. Näide: "Sa tegid 4 ülesandes (1, 3, 5, 7) **ühiku-vea** — unustasid SI-ühikud lõppvastusest. Vaata üle ühiku-süsteem peatükis X."
- **järgmised sammud (top 3 RÕK-koodide kaupa)** — "Vaata üle: ruutvõrrandi diskriminant (RÕK 9.M.2.1), trigonomeetria sin/cos/tan (RÕK 9.M.3.2), ..."
- **märkmed õpetajale** (privaatne, ainult õpetajale) — õpilase eripärad, soovitatud lisaharjutus, kui mõistlik

#### Vorming

- Eesti keeles, eesti matemaatikaterminoloogias
- Tagasiside on **edasiviiv** — iga vea kohta konkreetne järgmise sammu soovitus (mitte ainult "õpi rohkem")
- Hindenumbrit ega klassi-võrdlust **ei sisalda**
- Kokkuvõte on **lugemis-järjekorras esimene**, per-küsimuse osa teine (õpilased loevad keskmiselt esimesi paar lõiku)

### F4 — QA pass
- `qa-agent` valideerib, et tagasiside ei sisalda matemaatika-vigu, hallutsineeritud RÕK-viiteid, sobimatut tooni.
- Skoor (0-100) kuvatakse õpetajale ülevaatuse-ekraanil.

### F5 — Õpetaja ülevaatus ja kinnitamine
- Üks ekraan korraga: foto + tuvastatud lahendus + AI vea-klassifikatsioon + AI tagasiside mustand + RÕK-viide + QA skoor.
- Tegevused: ✓ kinnita / ✏ redigeeri / ✗ tagasilükata.
- **Stopper kuvatud sees** (demo-mõõdik): kui kaua iga ülevaatus võtab.

### F6 — Klassi kokkuvõte
- Pärast kõikide tööde ülevaatust näeb õpetaja klassi vea-mustreid (vea tüüp × kui mitu õpilast).
- Mis RÕK-i punkte oleks järgmiseks korrata.

### F7 — Demo-režiim (häki uus)
- Eraldi `/demo` route, mis on eel-täidetud 4 päris 9.A klassi kontrolltööga (`public/demo/kontrolltoo_9A_4_opilast.pdf`).
- Külalis-õpetaja saab demo läbi viia ilma ettevalmistuseta — login võimalik kohapeal või demo-režiim ilma logimiseta.
- Kuvab keskmise ülevaatuse aja sekundites jüriile reaalajas.

## Mida lahendus EI tee (skoobi piirid)

- **Hindeid ei pane** — õpetaja otsus.
- **Tagasisidet õpilasele automaatselt ei saada** — ALATI õpetaja kinnitus enne.
- **Muid aineid** häkiks ei toeta (füüsika ON, matemaatika ON; bioloogia/keemia/ajalugu kasutavad geneerilist tagasisidet, mitte sügavat ainepõhist analüüsi).
- **Muid klassiastmeid kui 9. klass** matemaatika eri-fookus selles häkis ei käsitle.
- **Õpilase iseteenindust** ei toeta — see on **õpetaja tööriist**.
- **Õpilastööde pilte** püsivalt ei salvesta (kustutus peale `APPROVED/SHARED` GDPR-cron'iga).
- **eKooli/Stuudiumi integratsiooni** häki ajal ei tee — post-häki tegevus.

## Brain'i sisu kasutus — kuidas andmed agentidele jõuavad

Selle programm-aju (`brain/`) sisul on **neli kasutus-mustrit**, mis erinevad selle järgi, kus ja kuidas andmed agendi-promptisse jõuavad. Iga sisuosa peab olema selgelt klassifitseeritud, et programm on järgnev ja agendid teavad, kust mida võtta.

| Sisu | Kasutus-muster | Kus täpselt | Laadimine |
|---|---|---|---|
| **Ainekava + Ainekaart (FYI taust)** | System context | system-prompt sektsioonis `## FYI: pedagoogiline taust (ÄRA HINDA SELLE VASTU)` | **load-once at agent init** (cache 10 min) |
| **Õigusruum 2026** | System context | system-prompt sektsioonis `## Õiguslik raam` | **load-once at agent init** (cache 10 min) |
| **Vea-taksonoomia (5+1)** | System context | system-prompt sektsioonis `## Vea-klassifikatsiooni kategooriad` | **load-once at agent init** |
| **Pedagoogika-põhimõtted** (Hattie & Timperley raamistik) | System context | system-prompt sektsioonis `## Tagasiside-metoodika põhimõtted` | **load-once at agent init** |
| **Test rubric + answerKey + testType** | Per-request context (PRIMARY assessment target) | system-prompt sektsioonis `## ASSESSMENT TARGET: Test rubric` | **load fresh per päring** (DB query iga TestId kohta) |
| **Test.solutionKey (õpetaja-lahendus)** | Per-request reasoning example | system-prompt sektsioonis `## REASONING EXAMPLE: õpetaja samm-sammu lahendus` | **load fresh per päring** (kui olemas) |
| **Folder #6 gold-standard PDF-id** | Few-shot examples (retrieval) | user-message või system-prompt sektsioonis `## SARNASED NÄITED: päris õpetaja-tagasisided` | **retrieval per päring** (top-3 sarnaseimat) |
| **FeedbackPattern (DB)** | Dynamic learnings | system-prompt sektsioonis `## TUNNUSED MUSTRID: mida AI on varem valesti teinud` | **load fresh per päring** (DB query, cache 10 min) |
| **Folder #4 hindamata töö** | Input data | user-message (foto + tekst) | **per-request** |

### Kasutus-mustrite definitsioonid

1. **System context (load-once):** sisu pannakse agendi-süsteemi-prompti agendi käivitamisel. Sama kõikide päringute jaoks. Cached'akse 10 min, et mitte iga päringuga uuesti faili lugema. Need on **käitumise reeglid + üldine taust**.

2. **Per-request context (load fresh):** sisu pannakse iga päringuga eraldi prompti, sest see on Test-spetsiifiline (rubric muutub per kontrolltöö). Kasutatakse Prisma DB query'd. Need on **konkreetse testi assessment target ja seotud andmed**.

3. **Few-shot examples (retrieval):** päringu ajal retrieve top-3 kõige sarnasemat eelmist-õpetaja-hinnatud näidet (`brain/eval/extracted/*.json`). Sarnasus: kursus + teema-võtmesõnad + vea-tüüp. Need on **päris õpetajate käitumise näited**, mille pealt AI õpib in-context.

4. **Dynamic learnings (DB query):** `FeedbackPattern` tabelist agregeeritud andmed mustritest, mida AI on varem teinud valesti ja mida õpetajad on parandanud. Iga päringu eel agregeeritakse top 5-10 mustrit selle aine + klassi-astme kohta. See on **õppiv aju** — muutub ajas.

### Õpetaja-kinnitatud tööde 4-otstarbeline kasutus

Folder #6 (õpetaja-kinnitatud lõplikud tagasisided) on **kõige tähtsam vara** ja sellel on **neli erinevat kasutus-otstarvet**:

1. **Eval-loop (F9.4)** — võrdlus AI mustand vs õpetaja-kinnitatud → mõõdik "AI klassifitseeris vea õigesti X%-l".
2. **Few-shot examples (F9.9)** — retrieved päringu ajal sarnaseimad → in-context learning.
3. **FeedbackPattern source** — õpetaja-redigeeringute mustrid → automaatne "tunnused mustrid" tabel.
4. **Training corpus** — kui kunagi fine-tune teeme, see on training data (post-häki).

## Tehniline arhitektuur (LLM-piiri turvalisus + multi-provider tugi)

### LLM-providerite tugi

Süsteem on **provider-agnostic** läbi `lib/ai-provider.ts` abstraktsiooni. Toetab:

- **Anthropic Claude** (claude-sonnet-4-6, claude-opus-4-6, claude-haiku-4-5)
- **OpenAI GPT** (gpt-4o, gpt-4o-mini, o3) — *aktiveeritakse häkiks organisaatorite krediidiga*
- **Google Gemini** (gemini-2.5-pro, gemini-2.5-flash) — *toodud kuid mitte aktiivne*

Provider valitakse kahe-tasemelise resolution'iga: (1) kooli `AIProviderConfig` (BYOK), (2) süsteemi default. Iga kool saab valida oma provideri ja kanda oma API-kulud.

### PII tokeniseerimine LLM-piiril

- **Kõik LLM-päringud** (olgu Claude, OpenAI või Gemini) lähevad läbi `lib/security/pii-tokenizer.ts`.
- **Tokenize** käib peale digitalize-agent'i (mis loeb pildilt nimed), enne assess-agent'i.
- **Detokenize** käib pärast qa-agent'i, enne salvestust DB-sse või UI-le.
- **Tokeniseeritavad andmed:** õpilase nimi → "Õpilane 01", kooli nimi → "Kool", klassi tunnus → "Klass", vanema nimi → "Vanem A", õpetaja nimi → "Õpetaja".
- **`[bracket]` PII** (emailid, isikukoodid, telefonid) ei lähe LLM-i kunagi — audit-funktsioon kontrollib enne iga LLM-päringut, lekke korral pipeline peatub + `AuditLog` alarm.

### Programm-aju vs projekti spec

- **`brain/static/`** = developer-edited sisu, mida agendid loevad runtime'is (õigusaktid, RÕK, pedagoogika, vea-taksonoomia)
- **`brain/dynamic-spec.md` + DB** = automaatselt täienev (`FeedbackPattern` mustrid, õpetaja-redigeeringute meta-andmestik)
- **`docs/`** = häki-projekti spetsifikatsioon (konstitutsioon, spec, prd, ehituslogi)
- **`lib/brain/`** = loader-kiht (static + dynamic agentidele)

Agendid kasutavad `lib/brain/index.ts`-i `loadBrain()`-i kaudu, ei loe ise faile.

## Visuaalne visioon

- **Mobiilis töötav veebirakendus** — õpetaja teeb pildid telefoniga ja saab seal ka ülevaatuse teha.
- **Üks ekraan korraga** — mitte dashboardi-tüüpi liides; õpetaja keskendub korraga ühe õpilase tööle.
- **Õpetaja-kesksed visuaalid** — suured nupud, selge eesti keel, vähe seadistust.
- **Eestikeelne kogu liides** — mitte ainult tagasiside, vaid ka süsteemi enda nupud, sõnumid, abi.
- **AI-transparency-mark** kuvatud iga AI-genereeritud sisu juures (`<AITransparencyMarker />`).

## Edge case'id ja riskid

- **OCR komistab käsitsi-tekstil** halvas valguses — UI peab pakkuma redigeerimisvõimalust, mitte saatma õpilastele räbalat tagasisidet.
- **Õpilane teeb mitu vea ühes lahenduses** — esimene/põhiline vea tüüp prioriteediks (otsus konstitutsiooni avatud küsimustes).
- **Lapsevanema nõusolek aegub keset analüüsi** — `ConsentGrant.endDate` kontroll **iga** AI-päringu eel; kui aegunud, AI ei käivitu, õpetaja saab teate.
- **Vercel timeout 4-agentlises pipeline'is** — `maxDuration = 60` kõikidel AI route'idel (vt `db-prep/03-vercel-maxduration.md`).
- **RÕK-viite hallutsinatsioon** — `qa-agent` peab valideerima viiteid `lib/brain/mathematics.ts` vastu enne kasutajale näitamist.

## Avatud küsimused

- **`assess-agent.ts` matemaatika-vea-taksonoomia praegune seis** — kas 5+1 on juba sees või füüsika-jäänuk?
- **Demo-režiim ilma logimata** — kas seadusele vastab? (Pildid public/demo'st avalikud, mitte tegelike õpilaste isikuandmed.) Triinilt kontroll.
- **Stopper kuvatud kõigile õpetajatele või ainult demo-režiimis?** — UX-otsus.
