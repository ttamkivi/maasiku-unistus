# Sprint 9 — QA Bug Fixes

**Priority:** HIGH — must fix before pilot testers see the app
**Context:** QA testing of the live app at fyysika-tagasiside.vercel.app revealed Estonian grammar bugs, leftover old branding references, and minor issues. All fixes are text replacements — no logic changes.

## Bug 1: Estonian grammar — login page "Tagasisidese"

**File:** `app/auth/login/page.tsx` line 56
**Current:** `Tere tulemast Õpetaja Tagasisidese`
**Fix:** `Tere tulemast!`
**Why:** "Tagasisidese" is grammatically incorrect Estonian (illative case doesn't work with this brand name). Simplest fix: just say "Tere tulemast!" (Welcome!) without the brand name.

## Bug 2: Estonian grammar — register page "Tagasisideega"

**File:** `app/auth/register/page.tsx` line 120
**Current:** `Liitu Õpetaja Tagasisideega`
**Fix:** `Liitu Õpetaja Tagasiside platvormiga`
**Why:** "Tagasisideega" is incorrect comitative case. Using "platvormiga" (with the platform) is natural Estonian.

## Bug 3: Estonian grammar — "Tagasisidee" in privacy, legal, parent-letter pages

Replace ALL occurrences of `Õpetaja Tagasisidee` with `Õpetaja Tagasiside` in these files:

- `app/privacy/page.tsx` (line 42): `Õpetaja Tagasisidee teenuse` → `Õpetaja Tagasiside teenuse`
- `app/legal/page.tsx` (line 68): `Õpetaja Tagasisidee teenuse` → `Õpetaja Tagasiside teenuse`
- `app/legal/page.tsx` (line 89): `Õpetaja Tagasisidee kasutamisega` → `Õpetaja Tagasiside kasutamisega`
- `app/privacy/parent-letter/page.tsx` (line 82): `Õpetaja Tagasisidee süsteemi` → `Õpetaja Tagasiside süsteemi`
- `app/privacy/parent-letter/page.tsx` (line 135): `Õpetaja Tagasisidee AI-süsteemi` → `Õpetaja Tagasiside AI-süsteemi`

**Why:** The genitive of "Tagasiside" in Estonian is "Tagasiside" (unchanged), not "Tagasisidee".

## Bug 4: Old branding — "maasiku-unistus" references in 3 files

### File: `app/privacy/parent-letter/page.tsx`
- Line 73: Replace `maasiku-unistus.vercel.app` → `fyysika-tagasiside.vercel.app`
- Line 117: Replace `maasiku-unistus.vercel.app/dashboard/parent` → `fyysika-tagasiside.vercel.app/dashboard/parent`
- Line 160: Replace `maasiku-unistus.vercel.app/privacy` → `fyysika-tagasiside.vercel.app/privacy` and `maasiku-unistus.ee` → `opetajatagasiside.ee` (if present)

### File: `app/api/consent/request/route.ts`
- Line 44: Replace `maasiku-unistus.vercel.app/dashboard/parent` → `fyysika-tagasiside.vercel.app/dashboard/parent`
- Line 73: Replace `noreply@maasiku-unistus.ee` → `onboarding@resend.dev` (use same pattern as send-email route)
- Also replace `'Õpetaja Tagasiside <noreply@maasiku-unistus.ee>'` → `'Õpetaja Tagasiside <onboarding@resend.dev>'`

### File: `app/api/account/export/route.ts`
- Line 141: Replace `maasiku-unistus-andmed` → `opetaja-tagasiside-andmed` in the filename

## Bug 5: OÜ Susilaane reference

Not a bug per se — just noting that the privacy/legal pages reference "OÜ Susilaane" as the company. Taavi should verify this is correct.

## Verify & Deploy

### Task 6: Build locally
```bash
npm run build
```

### Task 7: Commit and push
```bash
git add -A
git commit -m "fix: Estonian grammar corrections and remove old maasiku-unistus branding references"
git push origin main
```

### Task 8: Deploy
```bash
npx vercel --prod
```
