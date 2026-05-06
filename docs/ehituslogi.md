# Ehituslogi — Õpetaja Tagasiside (matemaatika eri-fookus)

## Kirjutamise reegel

Lisa siia ainult **otsused, avastused, kompromissid ja spec'i muutused**, mis aitavad järgmisel Codexi/Claude Code'i sessioonil aru saada, miks projekt on sellises seisus.

**Mis siia EI lähe:** üldine progress ("täna ehitasin"), TODOd, mõtted. Need käivad `prd.md`-sse või tiimi chati.

Vorm: `### YYYY-MM-DD (autor)` + 1-3 lause kanne, miks ja mida.

---

## Logi

### 2026-04-30 (taavi)

- **Spec-driven scaffold lisatud Praktikali häki-template'i järgi.** AGENTS.md uuendatud (preserve nextjs-rules + lisa spec-driven workflow + projekt-spetsiifilised reeglid). Lisatud `docs/konstitutsioon.md`, `spec.md`, `prd.md`, `ehituslogi.md`. Filo-konventsioon: `ehituslogi.md` (mitte `log.md`) match'imaks Praktikali template'iga, et tiimi liikmed teiste häki tiimidega samas keeles räägivad.
- **Vea-taksonoomia lukustatud konstitutsioonis 5+1 kategooriasse:** mõiste / arvutus / märk / loogika / ühik / ei ole viga. Kui `assess-agent.ts` praegu kasutab teist taksonoomiat (näiteks füüsika-spetsiifilist), siis häki-eelne ülesanne on see matemaatikale kohandada. Triin valideerib enne reedet.
- **Tagasiside struktuur:** tugevused / arengukohad / järgmised sammud / märkmed õpetajale + RÕK-viide. Hindenumbrit ja klassi-võrdlust EI sisalda. Põhjus: pedagoogika uuringud näitavad, et õpilased ignoreerivad tagasisidet kui hinne on nähtav.
- **Skoop lukustatud 9. klassi matemaatikale.** Mitte 10.-12. klass, mitte teised ained, mitte õpilase iseteenindus. Põhjus: "kui matemaatika 9. klassis töötab, on tee teistesse selge" (submission), aga häki demo on lukustatud kitsale fookusele.
- **Demo-režiim häki uus ülesanne.** F7 PRD-s. Üks `/demo` route, eel-täidetud 4 päris õpilastööga `public/demo/kontrolltoo_9A_4_opilast.pdf`-st. Külalis-õpetaja saab läbi viia ilma logimata. **See on ainuke märkimisväärne uus kood, mida häki ajal ehitada — ülejäänu on tuuning.**
- **DB & infra eel-häki nädala plaan separaatselt:** vt Brain'is `db-prep/00-week-plan.md`. Kokku 4-6 h tööd üle viie ülesande. **Ei vaheta DB-mootorit.** Postgres migration runbook on ära kirjutatud kontingentsiplaaniks, mitte enne häkki täitmiseks.
- **AI provider strateegia:** Anthropic Claude jääb runtime'iks (toode jookseb sellel). Codex (häki ametlik tööriist + krediidid) kasutame ainult koodi-genereerimiseks, mitte runtime-AI vahetuseks. Põhjus: 5 nädalat tunutud Claude-pipeline'i ei ole mõtet 36 tunni eest lammutada.
- **Per-student API call on JUBA olemas** — `app/api/tests/[id]/bulk-analyze/route.ts` POST-i kommentaar ütleb otse: "Analyze a single result (called per-result from the client to show progress)". Niisiis Vercel timeout'i mure on lahendatud arhitektuuriliselt; jääb ainult `maxDuration = 60` lisamine route'i konfigi.
