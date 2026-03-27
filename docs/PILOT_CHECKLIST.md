# Õpetaja Tagasiside — Pilootprojekti Tegevuskava

## Pre-launch checklist (enne pilootiga alustamist)

### Tehniline valmisolek
- [ ] Käivita andmebaasi migratsioonid: `npx prisma migrate deploy`
- [ ] Verifitseeri, et Vercel deployment töötab: https://fyysika-tagasiside.vercel.app
- [ ] Kontrolli, et demo konto töötab: demo.opetaja@opetajatagasiside.ee
- [ ] Käivita bias test enne pilooti: `npx tsx scripts/run-bias-test.ts`
- [ ] Kontrolli API key limiite (Anthropic konto)

### Compliance
- [x] DPIA (andmekaitse mõjuhinnang) — valmis
- [x] Privaatsuspoliitika (/privacy)
- [x] Kasutustingimused (/legal)
- [x] Lapsevanema nõusolekukiri (/privacy/parent-letter)
- [x] AI läbipaistvusmärgised kõikidel AI väljunditel
- [ ] Nõusoleku voog: õpetaja aktsepteerib ToS enne kasutamist
- [ ] Lapsevanema nõusolek enne õpilaste andmete töötlemist

### Sisulised ettevalmistused
- [ ] Lepi kokku 2-3 pilootõpetajat (füüsika, 8.-9. klass)
- [ ] Valmista ette lühike juhend: kuidas fotosid teha, laadida, vaadata tagasisidet
- [ ] Kooskõlasta kooliga andmetöötluse alus (GDPR)

---

## Piloodi läbiviimise plaan

### Nädal 1: Onboarding
1. Loo igale õpetajale konto (TEACHER roll)
2. Lisa nende kool süsteemi (SCHOOL_ADMIN konfiguratsiooni kaudu)
3. Seadista AI pakkuja (Anthropic Claude Sonnet) kooli tasemel
4. Näita ette demo: testi foto → AI tagasiside → vaatamine/muutmine → jagamine
5. Jaga lühijuhendit

### Nädal 2-3: Aktiivne testimine
1. Igal õpetajal min 3 kontrolltööd (à 10-15 õpilast)
2. Kogu tagasisidet:
   - Kas AI hindamine on täpne? (skoor)
   - Kas tagasiside tekst on asjakohane? (sisu)
   - Kas tagasiside toon on sobilik? (toon)
   - Mida oleks vaja muuta/lisada? (UX)
3. Jälgi AI kasutust /api/statistics kaudu
4. Käivita domain-qa audit vähemalt 2x piloodiperioodi jooksul

### Nädal 4: Kokkuvõte
1. Intervjueeri iga õpetajat (15 min)
2. Koosta kokkuvõte: mis töötab, mis ei tööta, mida tahavad
3. Prioriteeri tagasiside → roadmap uuendus
4. Otsusta: kas laiendada pilooti?

---

## Edu mõõdikud

| Mõõdik | Sihtmärk | Kuidas mõõta |
|--------|----------|--------------|
| Õpetajate arv | ≥ 2 aktiivset | Kasutusstatistika |
| Kontrolltöid analüüsitud | ≥ 10 | db.test.count |
| Õpilaste tulemusi | ≥ 50 | db.testResult.count |
| AI hinnangu täpsus | ≥ 80% kokkulangevus õpetaja hinnanguga | Manuaalne kontroll |
| Õpetaja ajakulu vähenemine | ≥ 30% | Intervjuud |
| NPS õpetajate seas | ≥ 7/10 | Intervjuud |

---

## Tagasiside kogumise kanalid

1. **In-app tagasiside** — FeedbackWidget (juba olemas) → UserFeedback tabel
2. **Intervjuud** — 15 min iga õpetajaga nädalas 2 ja 4
3. **Analüütiline** — AI kasutusstatistika, vigade arv, QA skoorid

---

## Riskid ja maandamine

| Risk | Tõenäosus | Maandamine |
|------|-----------|------------|
| AI annab vale hinde | Kõrge | QA pass 2 + õpetaja ülevaatus enne jagamist |
| Foto kvaliteet halb | Keskmine | Juhend hea foto tegemiseks + veateated |
| Õpetaja ei kasuta | Keskmine | Isiklik onboarding + nädalane check-in |
| GDPR probleem | Madal | DPIA tehtud, nõusoleku voog olemas |
| API kulud ootamatult kõrged | Madal | Usage limits per teacher + curriculum trimming (93% kokkuhoid) |
