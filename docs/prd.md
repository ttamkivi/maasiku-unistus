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
- [x] **N5.2** `maxDuration = 60` kõigil AI route'idel — `app/api/{analyze,tests/[id]/{batch-import,auto-import,bulk-analyze,rubric-upload},tests/generate,materials/generate,assignments/[id]/submit,cron/cleanup}/route.ts`
- [x] **N5.3** Liides töötab mobiilis (laius ≥ 360 px)

### N6 — Andmebaasi skaala
- [x] **N6.1** Hot-path indeksid lisatud TestResult, ConsentGrant, ConsentRequest, Test, WorkPhoto, ScanBatchPage + 16 muu mudeli FK-väljadele (54 indeksit kokku) — `prisma/schema.prisma`. **Prod'is jooksuta `npx prisma migrate deploy` peale env varide seadistust.**
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
- [x] **N11.1** OpenAI on implementeeritud läbi natiivse `fetch()` (mitte SDK-na) — pole eraldi dependency vaja, töötab juba `lib/ai-provider.ts` `callAI()` switch'is.
- [x] **N11.2** OpenAI branch `callAI()`-s — `lib/ai-provider.ts:298+`. Toetab Vision (base64 pildid → `image_url` data-URI). Anthropic'u `ContentBlockParam` formaat → OpenAI Chat Completions formaat konversioon sees.
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

## Eel-häki ettevalmistus (tehtud 2026-05-07)

- [x] **P1** OpenAI provider (envariga `AI_DEFAULT_PROVIDER=openai` aktiveeritav) — `lib/ai-provider.ts` system default env-driven
- [x] **P2** `maxDuration = 60` 9 AI-route'il
- [x] **P3** Schema indeksid (54 lisatud) — vajab `prisma migrate deploy` prod'is
- [ ] **P4** Vercel env vars seadistatud: `OPENAI_API_KEY`, `AI_DEFAULT_PROVIDER=openai` *(Taavi käes)*
- [ ] **P5** Vercel deploy + smoke test prod'is *(Taavi käes)*
- [ ] **P6** `prisma migrate deploy` jooksutatud prod-DB peal *(Taavi käes pärast deploy'd)*
