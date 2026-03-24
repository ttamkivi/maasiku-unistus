# Sprint 3: Pilot-Ready Hardening

## Context

Õpetaja Tagasiside is an AI feedback platform for Estonian schools. Sprints 1-2 built the core features. Sprint 3 (this file) hardens the app for the first real teacher pilot.

Read AGENTS.md first — this project uses Next.js 16 with breaking changes. Check `node_modules/next/dist/docs/` before writing any code.

## What's already done (DO NOT redo these):

Sprint 1-2 (all committed locally, 9 commits ahead of origin/main):
- Assignments/exercises hidden behind feature flags ✓
- PDF pipeline moved to client-side pdfjs-dist ✓
- Fuzzy student name matching ✓
- Bulk scan hero workflow ✓
- Sentry error tracking ✓
- AI feedback brain rebuilt with science-based assessment rules ✓
- PostHog product analytics ✓
- 38-student demo class seeded ✓
- Build & tests verified ✓

Today's Cowork session (changes are in the working tree, NOT YET COMMITTED):
- `/api/analyze` — added auth, consent check, Zod validation, image size limits, rate limiter cleanup ✓
- `/api/account/export` — fixed access control to check user.role ✓
- `/api/auth/login` — constant-time bcrypt comparison ✓
- Landing page + NavBar — "Registreeru" button added ✓
- NavBar — "Õpilased" → "Minu klass", "Nõusolekud" → "Lapsevanema load" ✓
- Create Test form — advanced fields collapsed behind toggle ✓
- Batch-import — empty roster warning + confirmation summary ✓
- Claude max_tokens increased from 8000 to 16000 ✓
- CSP + security headers added in next.config.ts ✓

## Your job

Complete the remaining hardening tasks below. After each task, commit with a descriptive message.

---

## Task 1: Commit today's working tree changes

The working tree has uncommitted changes from today's Cowork session (listed above). Commit them:

```bash
git add -A
git commit -m "Sprint 3: security hardening, UX improvements, CSP headers

- Add auth + consent check + Zod validation to /api/analyze
- Fix /api/account/export access control (check user.role)
- Fix login timing attack (constant-time bcrypt)
- Add Registreeru button to landing page hero + NavBar
- Rename nav items: Minu klass, Lapsevanema load
- Collapse advanced fields in Create Test form
- Add batch-import empty roster warning + confirmation summary
- Increase Claude max_tokens to 16000
- Add CSP, X-Frame-Options, Referrer-Policy headers"
```

---

## Task 2: Add password requirements to registration

In `app/auth/register/page.tsx`:

### 2a. Show password requirements below the password field
Add a small hint below the password input:
```
Vähemalt 8 tähemärki, sisaldagu vähemalt ühte numbrit
```
Style: fontSize 11, color #6b7280, marginTop 4px.

### 2b. Client-side validation
Before form submission, check:
- Password is at least 8 characters
- Password contains at least one digit
- Show inline error in Estonian if not met: "Parool peab olema vähemalt 8 tähemärki pikk ja sisaldama numbrit"

### 2c. Confirm password field
Add a "Parool uuesti" (Confirm password) field. Show error if passwords don't match: "Paroolid ei kattu"

---

## Task 3: Add breadcrumbs to test detail and result pages

Create a simple `Breadcrumb` component (inline in each page, no separate file needed).

### 3a. Test detail page (`app/dashboard/tests/[id]/page.tsx`)
Add breadcrumb at the top:
```
Kontrolltööd > [Test title]
```
Where "Kontrolltööd" links to `/dashboard/tests` and the test title is plain text.

### 3b. Test result detail page (`app/dashboard/tests/[id]/results/[resultId]/page.tsx`)
Add breadcrumb at the top:
```
Kontrolltööd > [Test title] > [Student name]
```
Where each segment links to the appropriate page.

### 3c. Batch import page (`app/dashboard/tests/[id]/batch-import/page.tsx`)
There's already a "← Tagasi kontrolltöö juurde" link. Replace it with a breadcrumb:
```
Kontrolltööd > [Test title] > Sisselugemine
```

Style: fontSize 13, color #6b7280, links are underlined. Separator ">" is color #d1d5db.

To get the test title, fetch from `/api/tests/[id]` or pass as a prop. If the page already fetches test data, use it. If not, add a small fetch.

---

## Task 4: Fix the `render()` canvas issue in pdfjs-dist

The batch-import PDF rendering at `app/dashboard/tests/[id]/batch-import/page.tsx` line ~151 uses:
```typescript
await page.render({ canvas, viewport: scaledViewport }).promise;
```

The `render()` method in modern pdfjs-dist requires `canvasContext`, not `canvas`:
```typescript
const ctx = canvas.getContext('2d');
await page.render({ canvasContext: ctx!, viewport: scaledViewport }).promise;
```

Check the current code and fix if needed. Also ensure:
- `canvas.width` and `canvas.height` are set before rendering (they are)
- The canvas is NOT added to the DOM (it shouldn't be — it's offscreen)

Test: upload a small PDF and verify pages render as JPEG thumbnails.

---

## Task 5: Add a "Tagasiside" (Feedback) button to the NavBar

Teachers need a way to report issues during the pilot.

### 5a. Add feedback button to NavBar
In `components/NavBar.tsx`, add a small feedback link visible to ALL logged-in users (all roles), positioned in the desktop nav before the logout button:

```tsx
<Link
  href="/dashboard/feedback"
  style={{
    fontSize: 12,
    color: '#6b7280',
    textDecoration: 'none',
    padding: '5px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 4,
  }}
>
  💬 Tagasiside
</Link>
```

Also add it to the mobile menu.

### 5b. Create feedback page (`app/dashboard/feedback/page.tsx`)
A simple client-side form:
- Textarea: "Mida soovid jagada?" (placeholder: "Mis töötab hästi? Mis on segane? Mis on puudu?")
- Radio buttons: "Tüüp" — Viga (bug), Ettepanek (suggestion), Kiitus (praise)
- Submit button: "Saada tagasiside"
- On submit: POST to `/api/feedback` (which already exists — it writes to a file or sends email)
- Show success message: "Aitäh! Sinu tagasiside on saadetud."

Track with PostHog:
```typescript
posthog.capture('feedback_submitted', { type: selectedType });
```

---

## Task 6: Improve error states in teacher dashboard

### 6a. Empty state for new teacher
In `app/dashboard/teacher/page.tsx`, when the teacher has zero tests, show a welcoming empty state instead of an empty list:

```
📋 Alusta oma esimese kontrolltööga

1. Loo kontrolltöö
2. Pildista või skaneeri õpilaste tööd
3. AI koostab tagasiside, Sina vaatad üle

[Loo esimene kontrolltöö →]  (link to /dashboard/tests/new)
```

### 6b. Loading state
If the dashboard data is loading, show a simple skeleton/loading indicator rather than an empty page. A simple centered spinner with "Laen andmeid..." text is sufficient.

---

## Task 7: Add login redirect after registration

Currently, after registration the user is... redirected where? Check `app/auth/register/page.tsx`:
- If registration succeeds, the user should be automatically logged in and redirected to `/dashboard/onboarding` (for teachers) or `/dashboard` (for others)
- The register API should return a session cookie (like login does), so the user doesn't have to log in separately after registering

Check `app/api/auth/register/route.ts`:
- After creating the user, call `createSession(user.id)` and set the `mu_session` cookie
- Return the user object in the response (like login does)

Update the client-side handler to redirect to `/dashboard/onboarding` after successful registration.

---

## Task 8: Make the onboarding wizard work end-to-end

Check `app/dashboard/onboarding/page.tsx` and `app/dashboard/onboarding/OnboardingWizard.tsx`:

### 8a. Verify the wizard steps work
The onboarding should guide the teacher through:
1. Select/confirm school
2. Select subject(s) they teach
3. Create or select a class
4. Import students (or skip for now)
5. Mark onboarding complete

If any step is broken or has TODO placeholders, fix it. Each step should save data via API and advance to the next.

### 8b. Mark onboarding complete
After the last step, call `POST /api/account/onboarding-complete` and redirect to `/dashboard/teacher`.

### 8c. Redirect incomplete onboarding
In `app/dashboard/teacher/page.tsx`, if the user's `onboardingCompleted` is false, show a banner at the top:
```
Seadistamine on pooleli. [Lõpeta seadistus →]  (link to /dashboard/onboarding)
```

---

## Task 9: Add session token security improvement

In `app/api/auth/login/route.ts`, the session token is created with `crypto.randomUUID()` (line ~63). This produces a UUID v4 with 122 bits of entropy. For a session token handling student data, use the stronger method from `lib/auth.ts`:

Replace:
```typescript
const token = crypto.randomUUID();
```
With:
```typescript
import { createSession } from '@/lib/auth';
// ... then replace the manual session creation with:
const token = await createSession(user.id);
```

This uses `crypto.getRandomValues(new Uint8Array(32))` (256 bits) and the existing `createSession` function already creates the DB record and sets expiry. Remove the manual `db.session.create` call that follows.

Do the same in `app/api/auth/register/route.ts` if it creates sessions manually.

---

## Task 10: Write tests for the new security logic

Add tests in `__tests__/api/analyze.test.ts`:

### 10a. Auth tests
- Test that unauthenticated request returns 401
- Test that student role returns 403
- Test that teacher role with valid session passes auth

### 10b. Validation tests
- Test that missing `klass` returns 400
- Test that empty `images` array returns 400
- Test that > 8 images returns 400

### 10c. Consent tests (can be mocked)
- Test that analysis with a testResultId checks consent
- Test that missing consent returns 403 with Estonian error message

Use the existing test patterns from `__tests__/api/auth/login.test.ts` for structure.

---

## Task 11: Run full verification

After all tasks:

```bash
npm run build          # Must succeed with zero errors
npm run test           # All tests must pass (existing + new)
npm run lint           # Fix any lint issues
npx prisma db push     # Ensure schema is synced
npm run seed           # Re-seed demo data (idempotent)
```

Verify manually:
- [ ] Landing page shows "Registreeru" and "Logi sisse" for anonymous users
- [ ] Registration creates account and redirects to onboarding
- [ ] Teacher nav shows: Ülevaade, Kontrolltööd, Minu klass, Lapsevanema load, Profiil
- [ ] Create Test form: only 4 fields visible, advanced behind toggle
- [ ] Empty teacher dashboard shows welcome state
- [ ] Feedback button visible in nav

---

## Order of Operations

1. Task 1 (commit existing changes) — clean slate
2. Task 9 (session token fix) — security, no dependencies
3. Task 2 (registration password requirements) — small, independent
4. Task 7 (auto-login after register) — depends on Task 9
5. Task 8 (onboarding wizard) — depends on Task 7
6. Task 6 (dashboard empty/loading states) — independent
7. Task 3 (breadcrumbs) — UI polish
8. Task 4 (pdfjs-dist canvas fix) — bug fix
9. Task 5 (feedback button) — feature
10. Task 10 (tests) — after all code changes
11. Task 11 (verification) — always last

Commit after each task with a descriptive message.

---

## Tech Notes

- This project uses Next.js 16 App Router. Check `node_modules/next/dist/docs/` for breaking changes.
- Database: Prisma with LibSQL adapter (SQLite). Run `npx prisma db push` after schema changes.
- Auth: Custom session-based auth using `mu_session` cookie. See `lib/auth.ts`.
- PostHog: Import from `posthog-js` in client components. Capture events with `posthog.capture('event_name', { ...props })`.
- All UI text must be in Estonian.
- Tailwind CSS is available but most components use inline styles — follow the existing pattern.
- The `lib/generated/prisma/client` path is where Prisma types are imported from.
