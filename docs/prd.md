# PRD — Õpetaja Tagasiside (matemaatika eri-fookus)

**Versioon:** v1.0 (häki-eelne)
**Seotud:** [konstitutsioon.md](./konstitutsioon.md), [spec.md](./spec.md), [ehituslogi.md](./ehituslogi.md)
**Reegel:** iga kord, kui Codex/Claude Code midagi valmis ehitab, uuendab ta selle faili staatust ja viidet failile. Ära ehita midagi, mida pole prd.md-s.

Staatuse legend: `[ ]` = ei ole · `[~]` = pooleli · `[x]` = valmis · `[!]` = blokeeritud

---

## Funktsionaalsed nõuded

### F1 — Sisestamine (skanee + tuvastamine)
- [x] **F1.1** Õpetaja saab üles laadida fotosid kontrolltööst (JPG/PNG/HEIC, kuni 8 fotot ühe õpilase kohta) — `app/api/analyze/route.ts`, `components/PhotoUploader.tsx`
- [x] **F1.2** Õpetaja saab üles laadida tervet PDF-i klassist (bulk scan) — `app/dashboard/tests/[id]/batch-import/page.tsx`, `app/api/tests/[id]/batch-import/route.ts`
- [x] **F1.3** Süsteem teeb OCR-i ja tuvastab küsimused + õpilase vastused — `lib/agents/digitalize-agent.ts`
- [x] **F1.4** Süsteem tuvastab õpilase nime ja teeb fuzzy match'i klassikaaslaste registriga — confidence flag (high/medium/low)
- [x] **F1.5** Õpetaja saab redigeerida nime või lahenduse teksti enne edasi liikumist
- [x] **F1.6** OCR töötab käsitsi-täidetud paberi peal, mitte ainult trükitud tekstil

### F2 — Analüüs ja vea klassifikatsioon
- [x] **F2.1** `assess-agent` võrdleb õpilase vastust rubric'u + answer key'ga — `lib/agents/assess-agent.ts`
- [~] **F2.2** Vea klassifikatsioon kasutab matemaatika 5+1 taksonoomiat (mõiste / arvutus / märk / loogika / ühik / ei ole viga). **STAATUS:** vajab kontrolli `assess-agent.ts` praeguse koodi vastu — kui seal on füüsika-spetsiifiline taksonoomia, häkiks tuleb seda matemaatikale tuunida.
- [x] **F2.3** Süsteem näitab konkreetset kohta lahenduses, kus viga tekkis
- [x] **F2.4** Õigete vastuste puhul märgib "ei ole viga" + kinnitavat tagasisidet

### F3 — Tagasiside genereerimine
- [x] **F3.1** `feedback-agent` koostab struktureeritud tagasiside (tugevused / arengukohad / järgmised sammud / märkmed õpetajale) — `lib/agents/feedback-agent.ts`
- [x] **F3.2** Eesti keeles + eesti matemaatikaterminoloogias
- [~] **F3.3** Iga tagasiside viitab konkreetsele RÕK-i punktile **matemaatikast** (`lib/brain/mathematics.ts`-st). **STAATUS:** vajab kontrolli, kas matemaatika RÕK-link genereerub samamoodi kui füüsika oma.
- [x] **F3.4** Tagasiside ei sisalda hindenumbrit ega klassi-võrdlust
- [x] **F3.5** Tagasiside on edasiviiv (sisaldab konkreetset järgmist sammu)

### F4 — QA pass
- [x] **F4.1** `qa-agent` valideerib tagasisidet (kvaliteet, RÕK-viite reaalsus, toon) — `lib/agents/qa-agent.ts`
- [x] **F4.2** QA skoor (0–100) salvestatakse `TestResult.qaScore`
- [x] **F4.3** QA log kirjeldab, mis paranduid tehti

### F5 — Õpetaja ülevaatus ja kinnitamine
- [x] **F5.1** Õpetaja näeb ühel ekraanil: foto + tuvastatud lahendus + AI vea-klassifikatsioon + AI tagasiside mustand + RÕK-viide + QA skoor
- [x] **F5.2** Õpetaja saab tagasisidet redigeerida (vabatekst)
- [x] **F5.3** Õpetaja saab tagasiside ühe klõpsuga kinnitada (`status` → APPROVED)
- [x] **F5.4** Õpetaja saab tagasiside tagasilükata
- [ ] **F5.5** Süsteem mõõdab ja kuvab õpetajale ülevaatuse aja sekundites — **HÄKI ÜLESANNE.** UI tasandil stopper algab AI-mustandi näitamisest, lõpeb kinnituse klõpsust. Salvestus → `TestResult` (lisada uus väli `reviewSeconds`)?
- [x] **F5.6** Õpetaja saab töid läbi vaadata järjest

### F6 — Klassi kokkuvõte
- [x] **F6.1** Pärast kõikide tööde ülevaatust näeb õpetaja klassi vea-mustreid
- [x] **F6.2** Õpetaja näeb, milliseid RÕK-i punkte korrata järgmises tunnis

### F7 — Demo-režiim (HÄKI UUS)
- [ ] **F7.1** `/demo` route, eel-täidetud 4 päris 9.A klassi kontrolltööga (`public/demo/kontrolltoo_9A_4_opilast.pdf`)
- [ ] **F7.2** Demo-režiim näitab keskmist ülevaatuse aega sekundites reaalajas (jürii vaade)
- [ ] **F7.3** Külalis-õpetaja saab demo läbi viia ilma logimiseta või demo-kontoga
- [ ] **F7.4** "Reset demo" nupp, et iga žürii liige saaks alustada puhta seisuga
- [ ] **F7.5** Demo lukustatud matemaatika ainele, 9. klass

### F9 — Õpilaste reaalsete nõuete täitmine (peale 2026-05-08 tiimi user research'i)

Õpilaste juba kogutud küsimustiku põhjal on neli konkreetset nõuet, mis vajavad kas uut agenti või laienemist olemasolevale.

#### F9.1 — Pattern-detector pipeline-samm (UUS AGENT)
- [ ] **F9.1.1** Uus moodul `lib/agents/pattern-detector.ts` — võtab `assess-agent` outputi (kõik küsimused) ja leiab korduvad vead (sama vea-tüüp ≥ 2 küsimuses)
- [ ] **F9.1.2** Tagastab `ErrorPattern[]` koos: vea-tüüp, esinemiste-arv, mõjutatud küsimuste numbrid, näide, soovitus
- [ ] **F9.1.3** Integreerimine `orchestrator.ts`-s: jookseb `assess-agent` ja `feedback-agent` vahel
- [ ] **F9.1.4** `feedback-agent` saab `ErrorPattern[]` kontekstina, kasutab töö-lõpu kokkuvõttes

#### F9.2 — End-of-test summary feedback'is
- [ ] **F9.2.1** `feedback-agent` output-skeem laienenud `testSummary` väljaga (vt `spec.md` F3 cross-question osa)
- [ ] **F9.2.2** UI kuvab kokkuvõtte **enne** per-question tagasiside (lugemis-järjekorras esimene)
- [ ] **F9.2.3** Kokkuvõte sisaldab: 2-3 tugevust, top 3 korduvat viga + parandus, top 3 järgmist sammu RÕK-koodidega, üks lause julgustust

#### F9.3 — Per-subquestion rubric explanation
- [ ] **F9.3.1** `assess-agent` parsib `Test.rubric` alapunktideks (kui rubric on struktureeritud); kui pole, loob iga küsimusele üldise rubric-tõlgenduse
- [ ] **F9.3.2** `feedback-agent` lisab iga küsimuse tagasisidesse **"Hindamisjuhendi tõlgendus"** sektsiooni: ✓/✗ punktide kaupa
- [ ] **F9.3.3** UI kuvab seda tagasiside-ekraanil eraldi väljana (collapsible)

#### F9.4 — Eval-loop: AI vs õpetaja-tagasiside võrdlus (DEMO-VARA)

Tiim on kogunud **~25 anonüümitud "õpetaja lahendatud" PDF-i** = gold standard. Eval-loop mõõdab AI täpsust selle vastu.

- [ ] **F9.4.1** Skript `scripts/eval-against-teacher-feedback.ts` — käib läbi gold-standard PDF-id
- [ ] **F9.4.2** Iga PDF: ekstraheerib õpilase töö (vision LLM) + õpetaja tagasiside (vision LLM)
- [ ] **F9.4.3** Käivitab sama tööd ilma õpetaja-osata 4-agent pipeline'i läbi
- [ ] **F9.4.4** Võrdleb 3 mõõtikul: vea-klassifikatsiooni täpsus, tagasiside semantiline vastavus (LLM võrdlus), punktide täpsus
- [ ] **F9.4.5** Output JSON `eval-results.json` + dashboard `app/admin/eval/page.tsx`
- [ ] **F9.4.6** Pitch deck'is konkreetne arv: "AI klassifitseeris vea õigesti X%-l 25-st päris õpetaja-hinnatud tööst"

#### F9.5 — Ainekava-FYI loader (3 allikat ühte FYI tausta)

**Triin & Evelin tagasiside 2026-05-08:** Ainekaart on liiga üldine, hindamise sihtmärk ON tühi kontrolltöö + juhend (rubric), MITTE Ainekaart. Niisiis F9.5 muudatus: kõik 3 ainekava-allikat (RÕK + TRK + koolipõhine Ainekaart) lähevad **ühte FYI taustakonteksti**, mille AI saab kontekstina (mitte assessment target'ina). Hindamise tegelik sihtmärk on `Test.rubric` (vt F9.8).

##### F9.5a — Koolipõhine Ainekaart (per kursus) — peamine assessment-target

- [ ] **F9.5a.1** `lib/brain/ainekaardid/` kaust + `Ainekaart` interface (kursus, valdkond, pealkiri, õpitulemused, tagasisidemeetodid)
- [ ] **F9.5a.2** `loadAinekaart(kursus: string): Ainekaart` + `findAinekaartByTopic(teema: string): Ainekaart | null`
- [ ] **F9.5a.3** `assess-agent` saab Ainekaardi konteksti, hindab iga küsimust **õpitulemuste vastu** (mitte ainult "õige/vale")
- [ ] **F9.5a.4** 3 Ainekaarti (kursus 11/12/13) konverteeritud markdownisse + struktureeritud JSON-iks

##### F9.5b — TRK ainekava (referends) — pedagoogiline taustakontekst

Tallinna Reaalkooli matemaatika ainekava on **referendina** AI-prompti sees. Kõik koolide Ainekaardid (#2) on TRK + RÕK põhjal koostatud, niisiis AI peab teadma ka TRK detailset käsitlust, et oleks pedagoogiliselt sügav.

- [ ] **F9.5b.1** Konverteeri 3 TRK PDF-i (`TRK_matemaatika_gymn`, `TRK_matemaatika_III`, `TRK_matemaatika_valik`) → markdown vision-LLM-iga
- [ ] **F9.5b.2** Salvesta `brain/static/ainekava/trk-{gymn,iii,valik}.md`
- [ ] **F9.5b.3** `loadTRKAinekava(kategooria: 'gymn' | 'iii' | 'valik'): string` loader
- [ ] **F9.5b.4** Agendi-prompt sisaldab kursuse-spetsiifilist TRK-osa kui taustakonteksti (sektsioon "Pedagoogiline raam: TRK ainekava")

##### F9.5c — Riiklik ainekava (RÕK) — kõige kõrgem raam

- [ ] **F9.5c.1** Konverteeri `Eesti matemaatika ainekava gümnaasiumile.pdf` → markdown
- [ ] **F9.5c.2** Salvesta `brain/static/ainekava/riiklik-rõk-gymn.md`
- [ ] **F9.5c.3** `loadRiiklikRÕK(): string` loader
- [ ] **F9.5c.4** Agendi-prompt sisaldab RÕK-i lühikokkuvõtet kui kõige kõrgemat raami

##### F9.5d — FYI taust integratsioon (mitte assessment target!)

- [ ] **F9.5d.1** `loadBrain(subject, kursus, testType)` agregeerib **kõik kolm allikat ühte FYI sektsiooni**: RÕK + TRK + koolipõhine Ainekaart
- [ ] **F9.5d.2** Promptis selge eraldus: "## FYI: pedagoogiline taust (ÄRA HINDA SELLE VASTU)" sisaldab ainekava-osi. Allpool: "## ASSESSMENT TARGET: Test rubric + answerKey + solutionKey" — AI hindab **selle** vastu.
- [ ] **F9.5d.3** Salvesta `brain/static/ainekava-fyi/` (uus kaust nimi reflectib FYI staatust) — `riiklik-rõk-gymn.md`, `trk-{gymn,iii,valik}.md`, `ainekaart-{11,12,13}.md`

#### F9.8 — Töö-tüüp (KT vs JT) andmete struktuuris ja AI tonis

Tiimi tühjad KT'd-kausta (#3) sisaldavad nii **KT** (Kontrolltöö = regulaarne) kui **JT** (Järeltöö = kordamis/järeltöö) versioone. JT tähendab, et õpilane teeb uuesti — biased valim "hädas" suunas — AI tagasiside peab olema **rohkem julgustav ja mustri-fokuseeritud**.

##### F9.8.1 — DB schema laiendus

- [ ] **F9.8.1.1** Lisa `Test` mudelisse uus väli: `testType: TestType` (enum `KT | JT`, default `KT`)
- [ ] **F9.8.1.2** Migration `20260508_add_test_type` — `Prisma migrate dev --name add_test_type`
- [ ] **F9.8.1.3** Lisa `Test.kursus: String?` väli (formaat "11.1", "12.1", "13.2", jne) — siduda Ainekaart-loaderiga (F9.5a)
- [ ] **F9.8.1.4** Lisa `Test.solutionKey: String?` väli (õpetaja-kinnitatud lahendused, vrdl `answerKey` mis on lihtsam) — kasutame `13.2 KT_Integraal_lahendused.docx` formaadis seed'i jaoks

##### F9.8.2 — `feedback-agent` toon kohandus

- [ ] **F9.8.2.1** `feedback-agent` system-prompti lisada `testType` muutuja
- [ ] **F9.8.2.2** Kui `testType=JT`:
  - Toon: **rohkem julgustav** ("Eelmisel korral X, vaata kuidas sa nüüd hakkama said")
  - Fookus: **mustri-arengule** üle eelmise korra (kui andmed olemas)
  - Töö-lõpu kokkuvõte sisaldab "arengu-näitajat" (kui võrreldavad andmed olemas)
- [ ] **F9.8.2.3** Kui `testType=KT`:
  - Toon: neutraalne, faktipõhine
  - Fookus: õpitulemuse-saavutamise hindamine
  - Töö-lõpu kokkuvõte: tugevused + arengukohad ilma võrdluse muu tööga

##### F9.8.3 — Tühjad KT'd impordi seed-skript

- [ ] **F9.8.3.1** `scripts/seed-tühjad-ktd.ts` — loeb kausta `3. Tühjad KT'd ...` 5 docx-i
- [ ] **F9.8.3.2** Iga docx jaoks: parsib (a) testType (failinimest: KT vs JT), (b) kursuse (failinimest: 11.1, 12.1, 13.1, 13.2), (c) küsimused + punktid, (d) õpetaja-lahendused (kui lahendustega-versioon olemas)
- [ ] **F9.8.3.3** Loob DB `Test` records'id Demo Kooli alla (status PREPARING)

#### F9.7 — Hindamis-kriteeriumite hierarhia: FYI taust + 3 aktiivset tasandit

**Uuendus peale Triin & Evelin tagasisidet 2026-05-08:** algne 4-tasandiline mudel hierarhia tasand 1 oli "Õpitulemused (Ainekaart)" — see EI OLE hindamise alus. Seda kasutatakse FYI taustakonteksti jaoks, aga hindamine algab tasandilt 2 (rubric). Niisiis F9.7 ümber struktureeritud:

##### FYI taust (kontekst, mitte assessment target)

- [ ] **F9.7.0** AI prompti pannakse selgelt eristatuna sektsioon `## FYI: pedagoogiline taust (ÄRA HINDA SELLE VASTU)`, mis sisaldab F9.5d kogutud ainekava-osi (RÕK + TRK + Ainekaart). AI mõistab konteksti, aga hindab tasandilt 1 alates.

##### Tasand 1 (PRIMARY) — Test rubric + answerKey + testType + solutionKey

- [ ] **F9.7.1** `Test.rubric` (string või struktureeritud JSON), `Test.answerKey`, `Test.testType`, `Test.solutionKey` peavad olema **parsitavad per küsimus**. Kui rubric on vaba-tekstiline, lisada `RubricParser` skill, mis loob `RubricCriterion[]` struktuuri.
- [ ] **F9.7.2** `assess-agent` saab kõik need väljad system-prompti — see on **PEAMINE** hindamise alus.

##### Tasand 2 — Per-subquestion criteria

- [ ] **F9.7.3** Iga küsimuse jaoks `RubricCriterion[]` koos `(meetod, seadistus, arvutus, ühik)` või rubricust parsitud spetsiifilised. Vaikimisi rakendub kui rubricu parsing ebaõnnestub.

##### Tasand 3 — Vea-taksonoomia

- [ ] **F9.7.4** `assess-agent` klassifitseerib **iga ebatäidetud kriteeriumi** ühte 5+1-st (mitte ainult küsimust tervikuna). Üks küsimus võib sisaldada mitut viga, igaüks oma tüübiga.

##### Promptis selge järjekord

- [ ] **F9.7.5** `feedback-agent` system-prompt'is selge instruktsioon: "FYI tausta kasutad konteksti jaoks — ei hinda selle vastu. Hindamine algab tasand 1 (rubric) — kõnni läbi tasand 1 → tasand 2 → tasand 3 järjest iga küsimuse kohta."
- [ ] **F9.7.6** `qa-agent` valideerib, et tagasiside on **rubric-järgne, mitte Ainekaardi-järgne** (kui AI viitab "õpitulemustele" hindamis-otsuses, see on viga — õpitulemused on FYI, mitte hindamise alus).

#### F9.9 — Few-shot example retrieval süsteem (õpetaja-näidete in-context learning)

**Kontekst:** folder #6 (õpetaja-kinnitatud tagasisided, ~25 PDF) on praegu spec'is ainult eval-loop'i jaoks (F9.4). Aga need on **kullaga väärt** ka kui few-shot examples — kui tuleb sisse sarnane küsimus (sama kursus, sama teema), AI saab in-context'is näha, **kuidas päris õpetaja sarnase ülesande tagasisidet kirjutas**.

See on Sprint 19.5 sisu, ~3-4 h täiendavat tööd. **Demo-väärtus on suur:** pitch'is saame öelda "AI ei õpi mitte staatilistest reeglitest, vaid 25-st päris õpetaja-tagasisidest selle kursuse raames".

##### F9.9.1 — Gold-standard PDF-ide ekstraktimine (jätkab F9.4-st)

- [ ] **F9.9.1.1** F9.4 setup'i raames ekstraheeritakse iga PDF strukteeritud JSON-iks (`brain/eval/extracted/<pdf-id>.json`)
- [ ] **F9.9.1.2** Iga JSON-i lisatakse metadata: `{kursus: '11.1', teema: 'Vektor ruumis', testType: 'JT', küsimustePõhi: [...], errorPatterns: [...]}` — see on retrieval'i jaoks
- [ ] **F9.9.1.3** Loo `brain/eval/index.json` (üks fail), mis sisaldab kõigi PDF-ide kokkuvõtet (id, kursus, teema, võtmesõnad, vea-tüübid) — kiire retrieval ilma kõigi JSON-ide lugemiseta

##### F9.9.2 — Sarnasuse-mootor (kerge, mitte ML-il)

Häki-tasandil pole vaja vector embeddings — kerge keyword + match piisab.

- [ ] **F9.9.2.1** `lib/brain/example-retrieval.ts` — `findSimilarExamples(kursus, teema, vea-tüüp): Example[]`
- [ ] **F9.9.2.2** Sarnasus-skoor (0-1):
  - Sama kursus (nt mõlemad 11.1) → +0.5
  - Sama teema (substring match teema-tekstis) → +0.3
  - Sama vea-tüüp (kui juba teada) → +0.2
- [ ] **F9.9.2.3** Tagastab top-3 kõrgeima skooriga näiteid

##### F9.9.3 — Integreerimine `feedback-agent`-i

- [ ] **F9.9.3.1** Pärast `assess-agent` tulemust (vea-tüübid teada), kutsu `findSimilarExamples()` iga küsimuse kohta
- [ ] **F9.9.3.2** Lisa `feedback-agent` prompti uus sektsioon `## SARNASED NÄITED: päris õpetaja-tagasisided`:
  ```
  ## SARNASED NÄITED: päris õpetaja-tagasisided

  Allpool on 3 näidet sellest, kuidas päris õpetaja sarnase
  ülesande tagasisidet kirjutas. Õpi nendelt **stiili, tooni
  ja struktuuri** — mitte sisu (sina lahendad teist ülesannet).

  ### Näide 1 (kursus 11.1, teema "Vektor ruumis", vea-tüüp: arvutusviga)
  Õpilase lahendus: ...
  Õpetaja tagasiside: ...

  ### Näide 2 ...
  ### Näide 3 ...
  ```
- [ ] **F9.9.3.3** `feedback-agent` system-prompti instruktsioon: "Jäljenda näidete **stiili, tooni, struktuuri** — aga mitte sisu (su sisu peab olema õpilase enda töö kohta)."

##### F9.9.4 — Demo-pitch'i argument

- [ ] **F9.9.4.1** Pitch slaid #X: "AI õpib päris õpetajatelt, mitte staatilistest reeglitest. Iga tagasisidega vaatab AI 3 sarnaseimat eelmist-õpetaja-tagasisidet ja jäljendab nende stiili."
- [ ] **F9.9.4.2** Reaalne arv pitch'i jaoks: "Häki ajal kogusime 25 õpetaja-tagasisidet — see on AI in-context training corpus."

##### F9.9.5 — Privaatsus

- [ ] **F9.9.5.1** Few-shot näidete õpilase-andmed peavad olema **anonümiseeritud enne LLM-i** (kasuta sama PII tokenizer'it kui pipeline'i sees, vt F9 PII osa)
- [ ] **F9.9.5.2** Few-shot näidetes õpetaja nimi → "Õpetaja", kooli nimi → "Kool"
- [ ] **F9.9.5.3** Audit: iga retrieval'i logitakse `AuditLog`-i (mis näiteid kasutatud, mis päringu jaoks)

#### F9.6 — Eesti õigusruum loader (pitch-vara)

Tiim on koostanud `õigusruum 2026.docx` = 7 Eesti seaduse analüüs kontrolltöö-konteksti jaoks.

- [ ] **F9.6.1** `brain/static/legal/eesti-õigusruum.md` — struktureeritud kokkuvõte:
  - Põhikooli- ja gümnaasiumiseadus (kool **võib** säilitada)
  - Arhiiviseadus (kool **võib** arhiveerida)
  - Autoriõiguse seadus + § 39 põhiseaduses
  - Lastekaitseseadus
  - Tsiviilseadustiku üldosa seadus
  - Võlaõigusseadus
  - Tööstusomandi õiguskorralduse aluste seadus
- [ ] **F9.6.2** `lib/brain/static-loader.ts` `loadLegalContext()` laeb seda + edastab agentidele system-prompti
- [ ] **F9.6.3** Pitch deck'i slaid #5 või #6: "Eesti õigusruumis korralikult istutatud — meie tehniline lahendus järgib 7 konkreetse seaduse nõudeid"

### F8 — Pitch-tugi (häki materjalid, mitte koodi)
- [ ] **F8.1** Pitch deck eesti keeles, 10–15 slaidi (vt Brain `db-prep/05-pitch-deck-note.md` slaid-fragmendid)
- [ ] **F8.2** "Enne häkki vs häki ajal" demarkatsiooni slaid (kohustuslik korraldajate poolt)
- [ ] **F8.3** Eestikeelse õppe ülemineku slaid (žürii kriteerium #1)
- [ ] **F8.4** Häki-järgne plaan (testimine ≥ 2 institutsioonis: Audentes + Praktikali partnerkool)

## Mittefunktsionaalsed nõuded

### N1 — Keel ja terminoloogia
- [x] **N1.1** Kogu kasutajaliides eesti keeles
- [x] **N1.2** Tagasiside terminoloogia järgib RÕK-i sõnavara
- [x] **N1.3** Süsteemi-sõnumid ja vea-tekstid eesti keeles

### N2 — Õppekava-seos
- [x] **N2.1** Matemaatika RÕK-andmestik `lib/brain/mathematics.ts`-s
- [x] **N2.2** Iga RÕK-viide on tegelikult olemas (`qa-agent` valideerib hallutsinatsiooni vastu)

### N3 — Privaatsus ja andmekaitse
- [x] **N3.1** Õpilase nimi anonümiseeritakse (Õpilane 01...) **enne** AI-päringut
- [x] **N3.2** Lapsevanema nõusolek hard-gate iga AI-analüüsi ees (`hasAIConsent`-i kontroll)
- [x] **N3.3** Pildid kustutatakse peale õpetaja kinnitust (cron `/api/cron/cleanup` 03:00, retention rules `lib/audit.ts`)
- [x] **N3.4** AuditLog säilitab AI-tegevused 90 päeva
- [x] **N3.5** AI-andmete saatmine ainult Anthropic API-le, mitte kolmandatele osapooltele
- [x] **N3.6** AI-genereeritud sisu märgistatud `AITransparencyMarker` komponendiga

### N4 — Inimese-üle-vaatus (EU AI Act Art. 14)
- [x] **N4.1** Õpilasele jõuab tagasiside ALLES PÄRAST õpetaja kinnitust
- [x] **N4.2** Süsteem teavitab kasutajat, et tegemist on AI-genereeritud mustandiga

### N5 — Jõudlus
- [x] **N5.1** Per-õpilase analüüs (mitte batch-sünk) — `app/api/tests/[id]/bulk-analyze/route.ts` POST kutsutud client'i poolt iga õpilase kohta eraldi
- [ ] **N5.2** `maxDuration = 60` kõigil AI route'idel — vt `db-prep/03-vercel-maxduration.md`
- [x] **N5.3** Liides töötab mobiilis (laius ≥ 360 px)

### N6 — Andmebaasi skaala
- [ ] **N6.1** Hot-path indeksid lisatud TestResult, ConsentGrant, ConsentRequest, Test, WorkPhoto, ScanBatchPage mudelitele — vt `db-prep/01-add-indexes-sprint.md`
- [ ] **N6.2** Turso prod verifitseeritud + proovi-restore tehtud — vt `db-prep/02-turso-verification.md`
- [ ] **N6.3** Postgres migration runbook olemas (kontingentsiplaan) — vt `db-prep/04-postgres-migration-runbook.md` ✅ valmis

### N7 — Häki-spetsiifilised
- [ ] **N7.1** Matemaatika feature flag aktiveeritud `lib/features.ts`-s + UI näeb matemaatikat aine-valikus
- [ ] **N7.2** Vähemalt 5 matemaatika-spetsiifilist `FeedbackPattern` kannet seedil (häki-eelne tuuning)
- [ ] **N7.3** Demo-konto + demo-klassi seed (4 päris õpilastööd `public/demo/`-s)
- [ ] **N7.4** Stopper-protokoll dokumenteeritud (kuidas mõõdame 1-min ülevaatuse aega)

### N8 — Õpilase-arusaamise hindamine (lisatud peale Kristel Akermani feedback'i)
- [ ] **N8.1** Eval-set'is iga õpilane, kes lahendab 4 kontrolltööd, hindab pärast oma AI+õpetaja kinnitatud tagasisidet skaalal "selge / keskmine / segane" + vabateksti märkused
- [ ] **N8.2** Hindamis-vorm on lihtne (paber või Google Form, õpilane teeb 2-3 min iga tagasiside kohta)
- [ ] **N8.3** Tulemused agregeeritud: protsent "selge", protsent "keskmine", protsent "segane" + vabateksti väljavõtted
- [ ] **N8.4** Sihteesmärk: ≥ 70% hinnatud "selge" või "keskmine"; mediaan ≥ "selge" (= konstitutsiooni edu kriteerium #7)

### N9 — Programm-aju arhitektuur (Sprint 19)
- [ ] **N9.1** `brain/` top-level kaust loodud koos `static/` (legal, curriculum, pedagogy, assessment) + `dynamic-spec.md` + `README.md`-d
- [ ] **N9.2** `lib/brain/static-loader.ts` loeb sisu `brain/static/`-st (markdown-failidest)
- [ ] **N9.3** `lib/brain/dynamic-loader.ts` agregeerib DB-st (`FeedbackPattern`, `TestResult` statistika), cache TTL 10 min
- [ ] **N9.4** Olemasolevate `lib/brain/*.ts` const-stringide migratsioon → `brain/static/**.md` (vähemalt matemaatika ainekava, vea-taksonoomia, pedagoogika)
- [ ] **N9.5** `loadBrain()` API agentidele ei muutu — sisu allikas erineb, kasutus jääb identseks
- [ ] **N9.6** `references/` puhastatud duplikaatidest peale migratsiooni
- [ ] **N9.7** Test suite: `loadBrain('mathematics', '9')` tagastab oodatud sisu ilma errorita

### N10 — PII tokeniseerimine (Sprint 19)
- [ ] **N10.1** `lib/security/pii-tokenizer.ts` olemas: `tokenize()`, `detokenize()`, `auditForBracketPII()` API
- [ ] **N10.2** Test suite ≥ 8 testi (basic, multiple students, substring collision, diacritics, bracket PII detection, round-trip, cross-session isolation)
- [ ] **N10.3** `lib/agents/orchestrator.ts` integreerib tokenize'mise digitalize ↔ assess vahel
- [ ] **N10.4** Detokenize käib pärast qa-agent'i, enne salvestust DB-sse
- [ ] **N10.5** `auditForBracketPII()` kutsutud enne iga LLM-päringut; lekke korral pipeline peatub + `AuditLog` event
- [ ] **N10.6** Tokeniseerimine **provider-agnostic** (testitud Anthropic + OpenAI mock'idega)

### N11 — Multi-provider aktivatsioon häkiks (Sprint 19, Faas 4.5)
- [ ] **N11.1** `npm install openai` lisatud + package.json'is
- [ ] **N11.2** `lib/ai-provider.ts` `callAI()` switch'i lisatud OpenAI provider-branch (sõnumid + Vision tugi)
- [ ] **N11.3** `OPENAI_HACKATHON_KEY` Vercel env varidesse seatud (häki organisaatorite krediit)
- [ ] **N11.4** Demo-kooli `AIProviderConfig` DB-kanne loodud `provider: 'openai'`, `model: 'gpt-4o'`, `isDefault: true`
- [ ] **N11.5** Fallback Claude'ile: kui OpenAI 5xx või rate-limit, automaatselt anthropic-le tagasi + `AuditLog: AI_PROVIDER_FALLBACK`
- [ ] **N11.6** Smoke test: üks päring `/demo` route-i kaudu, provider-väli logist = "openai", PII tokenizer audit log on tühi

## Häki-päeva nõuded (lukustatud reedel)

- [ ] **D1** Konstitutsioon, spec, prd, ehituslogi tiimiga läbi vaadatud, kõigi liikmete poolt kinnitatud
- [ ] **D2** Codex paigaldatud + AGENTS.md tunneb sisu (test prompt: "loe knowledge base ja ütle, kus on F5.5")
- [ ] **D3** Claude Code paigaldatud + sama
- [ ] **D4** WhatsApp grupp toimib, kõigil tiimiliikmetel telefonis
- [ ] **D5** Triin + Evelin + sinu poja klass kogunud kokku ≥ 50 päris matemaatika kontrolltöö lahendust
- [ ] **D6** Triin + Evelin kirjutanud reference feedback ≥ 20 lahendusele (gold standard tuunimiseks)
- [ ] **D7** Demo-õpilane (Triin'i klassist) kinnitanud osalemise + vanema kirjalik nõusolek olemas. Tuleb laupäeva pärastlõunale (demo osa, ~30-60 min). Roll: jürii ees lühike tagasiside "kas see oleks mu jaoks arusaadav".

## Valmis märkimise reegel

Nõue märgitakse `[x]` ainult siis, kui see on:
- Ehitatud (kood olemas)
- Kontrollitud (`npm run test` läbiv)
- Vajadusel seotud failidega märgistatud (`F2.1 — lib/agents/assess-agent.ts`)
- Tiimi-kinnitatud (vajadusel demo'dud või õpetajale näidatud)
