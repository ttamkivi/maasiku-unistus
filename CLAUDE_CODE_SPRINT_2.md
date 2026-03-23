# Sprint 2: Teacher-Ready Launch

## Context
Sprint 1 (NEXT_SPRINT.md Tasks 1-6, 8) is DONE — committed and verified.
The seed.ts has been rewritten with 38 students but the database hasn't been seeded yet.
Two remaining tasks: seed the demo data and add PostHog analytics.

## What's already done (DO NOT redo these):
- Task 1: Assignments/exercises hidden behind feature flags ✓
- Task 2: PDF pipeline moved to client-side pdfjs-dist ✓
- Task 3: Fuzzy student name matching ✓
- Task 4: Bulk scan hero workflow ✓
- Task 5: Sentry error tracking ✓
- Task 6: Build & tests verified ✓
- Task 8: AI feedback brain rebuilt with science-based assessment rules ✓
- assessment-rules.ts exists and is imported in claude.ts ✓
- references/assessment-science.md exists ✓

## Task A: Seed the demo database

The file `lib/seed.ts` is already fully written with:
- Demo teacher: demo.opetaja@maasikuunistus.ee / Opetaja2024!
- 38 students in class 9.B at Demo Kool
- 30 students with active parent consent for Füüsika
- 8 students WITHOUT consent (Sander Koppel through Elina Hint)
- Sample test: "Mehaanika kontrolltöö"

Steps:
1. Run `npx prisma db push` to ensure the schema is synced
2. Run `npm run seed` (or `npx tsx lib/seed.ts`)
3. Fix any runtime errors and re-run until seed completes successfully
4. Verify by querying: count of users with role STUDENT should be 38, ConsentGrant count should be 30
5. Commit any fixes to seed.ts

## Task B: Add PostHog product analytics

Read NEXT_SPRINT.md Task 9 for the full specification. Summary:

### B1. Install
```bash
npm install posthog-js posthog-js/react
```

Add to `.env.example`:
```
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

### B2. Create `components/PostHogProvider.tsx`
Client component that initialises PostHog with:
- `autocapture: true` (tracks all clicks/forms automatically)
- `session_recording` with `maskAllInputs: true` (GDPR)
- `persistence: 'memory'` (no cookies)
- Only initialises when NEXT_PUBLIC_POSTHOG_KEY env var is set

Wrap the root layout (`app/layout.tsx`) with this provider.

### B3. Identify users on login
After successful login, call `posthog.identify(user.id, { email, role, school })`.
On logout, call `posthog.reset()`.

### B4. Track key workflow events
Add `posthog.capture()` at these points:

**Server-side (use posthog-node or import posthog-js only in client components):**
- `test_created` — when a test is created
- `scan_uploaded` — when batch-import confirm action succeeds
- `ai_analysis_started` / `ai_analysis_completed` — in bulk-analyze route
- `ai_analysis_blocked_no_consent` — when consent check fails
- `feedback_approved` — in the approve route
- `feedback_edited` — when teacher saves edited feedback (include which sections changed)

**Client-side (in React components):**
- `feedback_reviewed` — when teacher opens a result detail page
- `student_name_corrected` — when teacher edits a detected name in batch-import UI

### B5. Update cookie consent
Add PostHog mention to `CookieConsent.tsx` text.

### B6. Commit
Commit all PostHog changes as one commit.

## Task C: Final verification

1. `npm run build` — must succeed with zero errors
2. `npm test` — all tests must pass
3. Start the dev server: `npm run dev`
4. Log in as `demo.opetaja@maasikuunistus.ee` / `Opetaja2024!`
5. Verify: teacher dashboard shows, class 9.B is visible, Mehaanika kontrolltöö test exists
6. Commit any fixes.

## Important notes
- Read AGENTS.md before writing any Next.js code — this is Next.js 16.2 with breaking changes
- Check `node_modules/next/dist/docs/` for API docs if unsure about any Next.js API
- PostHog client-side code must be in 'use client' components only
- Keep GDPR compliance: mask student data, use EU cloud, memory-only persistence
