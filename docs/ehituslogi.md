# Ehituslogi — Õpetaja Tagasiside (matemaatika eri-fookus)

## Kirjutamise reegel

Lisa siia ainult **otsused, avastused, kompromissid ja spec'i muutused**, mis aitavad järgmisel Codexi/Claude Code'i sessioonil aru saada, miks projekt on sellises seisus.

**Mis siia EI lähe:** üldine progress ("täna ehitasin"), TODOd, mõtted. Need käivad `prd.md`-sse või tiimi chati.

Vorm: `### YYYY-MM-DD (autor)` + 1-3 lause kanne, miks ja mida.

---

## Logi

### 2026-04-30 (taavi) — Sprint 19 plaanitud: Brain arhitektuur + PII tokenizer + OpenAI provider

- **Programm-aju formaalselt eraldatud häki-projekti dokumentidest.** Uus `brain/` top-level kaust (`static/legal`, `static/curriculum`, `static/pedagogy`, `static/assessment` + `dynamic-spec.md`). `docs/` jääb häki spec'i jaoks. `lib/brain/` muutub puhtaks loader-kihiks. Põhimõte 8 lisatud konstitutsioonisse.
- **PII tokeniseerimine standardiseeritud kihina** `lib/security/pii-tokenizer.ts`-s. Praegu agentide-vahel hajutatud anonümiseerimine tõstetakse üheks kohaks. `[bracket]` PII (emailid, isikukoodid, telefonid) ei lähe LLM-i — audit-safety-net peatab pipeline'i lekke korral. Põhimõte 9 lisatud konstitutsioonisse.
- **Multi-provider aktiveeritud häki ajaks.** `lib/ai-provider.ts` on juba multi-provider disainitud (Anthropic + OpenAI + Google), aga OpenAI dependency + tegelik kõnekood on TODO. Sprint 19 Faas 4.5 implementeerib selle. Häki ajal kasutame organisaatorite OpenAI krediiti läbi BYOK-arhitektuuri (`AIProviderConfig` per kool), mitte env-default'i muutes. See tugevdab pitch'i: "iga kool valib oma provideri ja kannab oma API-kulu".
- **Tokenizer on provider-agnostic** — sama kiht töötab Claude, OpenAI ja Gemini'ga, sest tokenize/detokenize tegutseb stringi-tasemel enne provider-spetsiifilist payload-pakkimist.
- **Mõju kasutaja-vaatele:** ükski. See on infra-uuendus, demo-funktsionaalsus säilib.
- **Sprint 19 detail:** `architecture/02-sprint-19-architecture-refactor.md` (Brain'is) sisaldab Faas 1-6 sammhaaval kava, eeldatav aeg 5-8 h.
- **Paralleelelu lubatud** — vana `lib/brain/*.ts` const-id jäävad esialgu shimm'idena (`export const X = loadStaticContent(...)`), peale Sprint 20-t kustutame.

### 2026-04-30 (taavi) — õpilase-arusaamise mõõdik lisatud

- **Edu kriteerium #7, kasutajalugu K11, mittefunktsionaalne nõue N8, häki-päeva nõue D7 lisatud.** Põhjus: Kristel Akermani feedback Eventornado discussion'is — meie esialgsed kriteeriumid mõõtsid ainult õpetaja-poolt (review-aeg, klassifikatsioon, RÕK-vaste). Kui AI tagasiside on õpetajale-mõistlik aga õpilasele segane, me ei lahendanud probleemi.
- **Kahekihiline lahendus:** (1) eval-set'is iga õpilane hindab oma tagasisidet skaalal "selge / keskmine / segane" pluss vabatext (= mass-mõõdik), (2) demo'l laupäeval üks külalis-õpilane Triin'i klassist annab vahetut hinnangut jürii ees (= näide-mõõdik). Esimene annab kvantiteedi, teine annab usaldusväärsuse.
- **Tiimi suurus jääb 4-liikmeliseks** (Taavi, Evelin, Marie, Triin) + 2 TBD. Õpilane on **demo-osaleja** (laupäeva pärastlõunal ~30-60 min), mitte tiimi-liige. Hoiab raami 3-5 sees ilma erandita.
- **D7 sõltuvus:** Triin peab oma klassist värbama ühe põnevil 9. klassi õpilase + vanema kirjaliku nõusoleku.

### 2026-04-30 (taavi) — spec-driven scaffold

- **Spec-driven scaffold lisatud Praktikali häki-template'i järgi.** AGENTS.md uuendatud (preserve nextjs-rules + lisa spec-driven workflow + projekt-spetsiifilised reeglid). Lisatud `docs/konstitutsioon.md`, `spec.md`, `prd.md`, `ehituslogi.md`. Filo-konventsioon: `ehituslogi.md` (mitte `log.md`) match'imaks Praktikali template'iga, et tiimi liikmed teiste häki tiimidega samas keeles räägivad.
- **Vea-taksonoomia lukustatud konstitutsioonis 5+1 kategooriasse:** mõiste / arvutus / märk / loogika / ühik / ei ole viga. Kui `assess-agent.ts` praegu kasutab teist taksonoomiat (näiteks füüsika-spetsiifilist), siis häki-eelne ülesanne on see matemaatikale kohandada. Triin valideerib enne reedet.
- **Tagasiside struktuur:** tugevused / arengukohad / järgmised sammud / märkmed õpetajale + RÕK-viide. Hindenumbrit ja klassi-võrdlust EI sisalda. Põhjus: pedagoogika uuringud näitavad, et õpilased ignoreerivad tagasisidet kui hinne on nähtav.
- **Skoop lukustatud 9. klassi matemaatikale.** Mitte 10.-12. klass, mitte teised ained, mitte õpilase iseteenindus. Põhjus: "kui matemaatika 9. klassis töötab, on tee teistesse selge" (submission), aga häki demo on lukustatud kitsale fookusele.
- **Demo-režiim häki uus ülesanne.** F7 PRD-s. Üks `/demo` route, eel-täidetud 4 päris õpilastööga `public/demo/kontrolltoo_9A_4_opilast.pdf`-st. Külalis-õpetaja saab läbi viia ilma logimata. **See on ainuke märkimisväärne uus kood, mida häki ajal ehitada — ülejäänu on tuuning.**
- **DB & infra eel-häki nädala plaan separaatselt:** vt Brain'is `db-prep/00-week-plan.md`. Kokku 4-6 h tööd üle viie ülesande. **Ei vaheta DB-mootorit.** Postgres migration runbook on ära kirjutatud kontingentsiplaaniks, mitte enne häkki täitmiseks.
- **AI provider strateegia:** Anthropic Claude jääb runtime'iks (toode jookseb sellel). Codex (häki ametlik tööriist + krediidid) kasutame ainult koodi-genereerimiseks, mitte runtime-AI vahetuseks. Põhjus: 5 nädalat tunutud Claude-pipeline'i ei ole mõtet 36 tunni eest lammutada.
- **Per-student API call on JUBA olemas** — `app/api/tests/[id]/bulk-analyze/route.ts` POST-i kommentaar ütleb otse: "Analyze a single result (called per-result from the client to show progress)". Niisiis Vercel timeout'i mure on lahendatud arhitektuuriliselt; jääb ainult `maxDuration = 60` lisamine route'i konfigi.
