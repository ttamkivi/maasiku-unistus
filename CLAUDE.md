@AGENTS.md

# CLAUDE.md — Claude Code-spetsiifilised juhised

Kõik üldised reeglid on `AGENTS.md`-s. See fail sisaldab ainult **Claude Code-spetsiifilisi** lisajuhiseid.

## Mille jaoks Claude Code on parem kui Codex

1. **Multi-step debug** — kui OCR komistab käsitsi-tekstil ja vaja jälgida prompt → response → kustutust kuni tüüpilise vea allikani.
2. **Suuremad refaktorid** — kui matemaatika port nõuab struktuurilist ümberkorraldamist üle mitme faili.
3. **Test-run + verify** — kui vaja eval-set'i läbi ajada (`npm run test`) ja vaadata, kus AI eksib.
4. **Spec-haldus** — `prd.md` staatuste uuendamine, `ehituslogi.md` ridade lisamine, `spec.md` täpsustamine.
5. **File-ops** — Brain'ist (`~/Brain/taavi-personal/civic-and-side/Presidendi-Haridushakaton-2026/`) repo-sse sünkimine, mitme faili korraga muutmine.

Kasuta Codexit selleks, mille jaoks see on häki ajal mõeldud: kiire feature-generation, üks user story korraga, organisaatorite sandbox'is.

## Sünkroonimine teiste agenttidega

- **Commit'i tihti.** Iga lõpetatud rida `prd.md`-st = commit. See hoiab Codexi ja Cowork'i samas faasis.
- **Ära unusta `ehituslogi.md`-d.** Kui teed otsuse, mille teine agent võib hiljem näha "ootamatult", logi see kohe.
- **Kui tunned, et midagi on Codex'iga konfliktis** — vaata `git log`, viimast `prd.md` staatust, ja `ehituslogi.md` viimaseid kandeid. Kui pole selge, peatu ja küsi tiimilt.

## Kuidas anda Claude Code'ile head käsku

Hea käsk:

> "Loe `docs/konstitutsioon.md`, `docs/spec.md`, `docs/prd.md`, `docs/ehituslogi.md`. Seejärel debug'i F2.2 (vea klassifikatsioon) — eval-set'is jookseb 12-st 4 valesti. Vaata, kus pipeline'is täpsus kaob, ja paku 2–3 hüpoteesi. Ära veel paranda, esmalt diagnoos."

Halb käsk:

> "Tee see asi tööle."

(Halba käsku ärgu Claude Code täidetagi — küsi täpsemat.)
