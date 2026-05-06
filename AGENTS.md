<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Projekti kontekst

See on **Õpetaja Tagasiside** — AI-põhine tagasiside-platvorm Eesti koolidele. Pilot-ready füüsika tagasiside aprillist 2026. Mais 2026 osaleme **Presidendi haridushäkatonil** matemaatika eri-fookuses (8.–9. mai, Tallinn), kus eesmärk on demonstreerida matemaatika 9. klassi tagasisidet päris õpilastööde peal koos õpetaja-ülevaatuse mõõdikuga (1 minut).

Praegune tehniline alus:
- **Next.js 16 + React 19 + TypeScript** (App Router; ära kasuta `pages/`)
- **Anthropic Claude SDK** AI mootorina (4-agentline pipeline: digitalize → assess → feedback → qa)
- **Prisma + LibSQL/Turso** andmebaas (40+ mudelit, 19+ migrationi)
- **Vercel** hosting (regioon `cdg1`, Sentry + PostHog instrumented)
- **Eesti eID + email/password** autentimine; **lapsevanema nõusolek** kohustuslik enne mis tahes õpilase AI-analüüsi.

## Knowledge base

Enne mis tahes koodimuudatust loe vajadusel neid faile:

- `docs/konstitutsioon.md` — **MIKS** me seda ehitame, kelle jaoks, mis on edu kriteeriumid.
- `docs/spec.md` — **MIDA** lahendus kasutaja vaates teeb (kasutajalood + mida lahendus EI tee).
- `docs/prd.md` — **kontrollitav nõuete nimekiri** koos staatusega; iga lõpetatud nõue saab `[x]`.
- `docs/ehituslogi.md` — **otsuste päevik**; iga oluline arhitektuuri-, skoobi- või kompromissi-otsus saab siia rea.

Kui ükski neist on ebaselge või vastuolus tegeliku koodiga, **küsi enne ehitamist** või uuenda spec'i.

## Mitu agentti, üks tõde

Selles projektis töötavad paralleelselt:

- **Codex** — häki ajal põhi-feature-build (organisaatorite ametlik tööriist + krediidid)
- **Claude Code** — multi-step debug, refaktorid, spec-haldus, file-ops
- **Cowork (Brain'is)** — kommunikatsioon, dokumentatsioon, väline kontekst

Kõigi kolme jaoks on **üks tõe-allikas: `docs/` kaustas elavad spec-failid**. Kui sa neid uuendad, uuendad need kõigi jaoks. Kui sa neid ignoreerid, lähevad agentid lahku.

## Spec-driven tööloogika

Töö käib kolmes faasis (Praktikali häki-template'i järgi):

1. **Defineeri** — täpsusta probleem, sihtrühm, kontekst, põhimõtted ja edu kriteeriumid (`konstitutsioon.md`).
2. **Spetsifitseeri** — kirjelda kasutajalood, funktsionaalsus, piirangud ja mida lahendus EI tee (`spec.md` + `prd.md`).
3. **Ehita** — realiseeri **üks** kasutajalugu või PRD nõue korraga.

Ära hüppa otse ehitusse, kui knowledge base ei anna piisavat konteksti.

## Codexi / Claude Code'i tööpõhimõtted

- **Loe knowledge base esmalt.** Iga uue session'i alguses: `cat docs/konstitutsioon.md docs/spec.md docs/prd.md docs/ehituslogi.md`.
- **Üks PRD nõue korraga.** Mitte "ehita kogu süsteem". Võta üks rida `prd.md`-st, ehita see, uuenda staatus, alles seejärel edasi.
- **Enne uue funktsionaalsuse ehitamist kontrolli `prd.md`.** Kui rida on `[x]`, ära ehita uuesti. Kui rida pole olemas, lisa esmalt rida prd.md-sse, alles siis ehita.
- **Pärast iga ehitamist uuenda `prd.md`** ja vajadusel `ehituslogi.md`.
- **Spec on elav.** Kui ehitamise käigus selgub midagi uut, ära lisa kohe koodi. Esmalt uuenda `spec.md` (ja vajadusel `prd.md`), alles seejärel ehita.
- **Kui kasutaja palub midagi, mis läheb spec'iga vastuollu**, too vastuolu selgelt välja ja küsi kinnitust enne ehitamist.
- **Hoia kood lihtsana.** See on prototüüp-toode, mitte enterprise süsteem. Eelista lihtsamat lahendust keerukama arhitektuuri ees.

## Domeen-spetsiifilised reeglid

- **Eestikeelne UI** — kogu kasutajaliides, sõnumid, abitekstid eesti keeles. Inglise keel ainult tehnilises koodis (kommentaarid, muutujanimed).
- **Õpilane = anonüümne enne AI-d.** Õpilase pärisnimi asendatakse koodiga (Õpilane 01, Õpilane 02 ...) **enne** Claude'i kõnet. Vaata `lib/agents/digitalize-agent.ts`.
- **Lapsevanema nõusolek on hard-gate.** Mitte ühelegi õpilasele AI-analüüsi käivitada ilma `ConsentGrant.status = ACTIVE` valiidsuseta antud õppeaastale ja ainele. Vaata `lib/consent.ts`.
- **Pildid kustutatud peale kinnitust.** `WorkPhoto.base64Data` nullitakse kui `TestResult.status` läheb APPROVED/SHARED'i. GDPR-cron töötab `/api/cron/cleanup` igal öösel kell 03:00.
- **Hindeid ei näita õpilasele.** Tagasiside sisaldab tugevusi, arengukohti, järgmisi samme, RÕK-i viidet. Hinde-numbrit ei ole, klassi-võrdlust ei ole. (Teadlik valik, uuringutele tuginev.)
- **AI on transparency-marked.** Iga kasutajale nähtav AI-genereeritud sisu peab olema märgistatud (vaata `components/AITransparencyMarker.tsx`).

## Vea-kategooriad (matemaatika)

Vea klassifikatsioon `assess-agent.ts`-s peab kasutama neid 5+1 kategooriat:

1. **mõisteviga** — õpilane ei mõista mõistet (nt segab algebra ja geomeetria definitsioone)
2. **arvutusviga** — kontseptsioon õige, aga arvutuses eksis (nt 5 × 7 = 32)
3. **märgiviga** — pluss/miinus, suurem/väiksem segadus
4. **loogikaviga** — õige etapid, vale tuletus
5. **ühiku viga** — mõõtühikud läinud sassi (cm vs m, sek vs min)
6. **ei ole viga** — vastus on õige (saab kinnitavat tagasisidet)

Ära leiuta uusi kategooriaid ilma `docs/spec.md` punkti 2 uuendamata.

## RÕK-viited peavad olema reaalsed

`lib/brain/mathematics.ts` sisaldab 7-9. klassi + gümnaasiumi matemaatika ainekava. Iga AI-genereeritud tagasiside peab viitama **olemasolevale** punktile sealt. Lihtsam jätta tagasiside RÕK-viideta kui hallutsineerida — kui Claude ei ole kindel, kirjuta `[RÕK-viide kontrollida]` ja jäta tiimile käsitsi täpsustada.

## PRD reegel

`docs/prd.md` on projekti tööjärjekord. Iga nõue peab olema **konkreetne ja kontrollitav**:

- `[ ] F1: Õpetaja saab laadida üles foto käsitsi täidetud kontrolltööst`
- `[x] F2: Süsteem teeb OCR-i käsitsi-vastusele — `lib/agents/digitalize-agent.ts`
- `[ ] N1: Liides töötab mobiilis alates 360px laiusest`

Pärast iga valmis ehitatud nõuet märgi `[x]` ja lisa viide seotud failile.

## Definition of Done

Muudatus on valmis ainult siis, kui:

- See vastab `docs/spec.md` kirjeldatud kasutajaloole või PRD nõudele.
- `docs/prd.md` staatus on uuendatud.
- Olulised otsused/kompromissid on `docs/ehituslogi.md`-s.
- `npm run build` ja `npm run test` mõlemad rohelised.
- Kasutajale nähtav käitumine ei lähe vastuollu konstitutsiooni edu kriteeriumidega.
- Codex/Claude Code on kasutajalt küsinud, kas tulemus vastab ootusele, ja saanud kinnituse.

Kui kasutaja ei kinnita, käsitle tagasisidet uue iteratsioonina: uuenda spec'i / PRD-d / ehituslogi ning jätka.

## Kui kontekst on puudulik

Kui dokumentatsioon puudub või on liiga üldine, **ära leiuta vaikimisi kogu toodet valmis**. Küsi täpsustust või paku minimaalne järgmine dokumenteerimissamm.

## Mida sa EI tee

- Ei tee sammu, mida `prd.md` ei nõua. Hea idee → küsi tiimilt → lisa rida prd.md-sse → ehita.
- Ei laienda skoopi. `spec.md` punkt "Mida lahendus EI tee" on lukus.
- Ei salvesta õpilasandmeid püsivalt.
- Ei käi teise agendi (Codex vs Claude Code) sama failiga "võistu". Vaata `git log` enne kui hakka redigeerima.
- Ei kustuta `CLAUDE_CODE_SPRINT_*.md` ajalugu — see on projekti tehnoloogiline arhiiv.
