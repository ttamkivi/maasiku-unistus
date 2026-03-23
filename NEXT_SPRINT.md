# Sprint: Teacher-Ready MVP

## Context
Maasiku Unistus is an AI feedback platform for Estonian schools. The core test analysis pipeline works. This sprint focuses on getting the app ready for real teachers to use by: removing scope clutter, fixing the #1 production blocker, and making bulk scan the primary workflow.

Read AGENTS.md first — this project uses Next.js 16 with breaking changes. Check `node_modules/next/dist/docs/` before writing any code.

## Task 1: Hide Assignments & Exercises (scope reduction)

For the first pilot, teachers should ONLY see the test workflow. Hide assignments and exercises from the UI without deleting any code or database models.

### 1a. NavBar — hide nav items
In `components/NavBar.tsx`:
- Remove the `Harjutused` (exercises) nav link from ALL role menus (TEACHER lines ~41, ~48, ~76, and STUDENT)
- Remove the `Kodutööd` (assignments) nav link from ALL role menus (TEACHER lines ~42, ~49, ~77, and STUDENT)
- Keep the feature flag logic for exercises (it's already gated by `STUDENT_EXERCISES`) but also gate assignments behind a new feature flag `ASSIGNMENTS_ENABLED` (default false in `lib/features.ts`)

### 1b. Teacher dashboard — remove assignment/exercise cards
In `app/dashboard/teacher/page.tsx`:
- If there are cards or links to assignments/exercises, hide them (wrap in feature flag check, or simply remove from render)

### 1c. Student dashboard — hide exercises/assignments
In `app/dashboard/student/page.tsx`:
- Hide any links or sections related to exercises and assignments

### 1d. Landing page — simplify
In `app/page.tsx`:
- Remove the "Harjutused & kodutöö" use case card (the second card in the "Kaks kasutusviisi" section, lines ~238-268)
- Change the section title from "Kaks kasutusviisi" to something like "Kuidas see toimib?" and only show the test workflow
- In the student role card, remove bullet points about exercises/homework
- Keep the parent role card as-is (consent is still needed for tests)

### 1e. Add feature flag
In `lib/features.ts`, add `ASSIGNMENTS_ENABLED` to the feature flags list (default: false), similar to how `STUDENT_EXERCISES` already exists.

Do NOT delete any routes, API endpoints, database models, or components. Just hide from navigation and UI.

## Task 2: Fix PDF Pipeline for Production

The `batch-import` route uses Ghostscript to render PDF pages to JPEG. The path `/opt/homebrew/bin/gs` only works on macOS with Homebrew. On Vercel (Linux serverless), this crashes.

### Fix in `app/api/tests/[id]/batch-import/route.ts`:

Replace the Ghostscript-based `renderPdfWithGs()` with a pure-JS approach using `pdfjs-dist` (already in package.json). The app already has `public/pdf.worker.min.mjs`.

The new approach should:
1. Use `pdfjs-dist` to load the PDF buffer
2. Render each page to a canvas (use `canvas` npm package for Node.js, or render pages as PNG/JPEG)
3. Return base64-encoded images of each page

Since `pdfjs-dist` canvas rendering requires a canvas implementation in Node.js, consider one of these approaches (pick what works best):
- Option A: Use `pdfjs-dist` with `@napi-rs/canvas` or `canvas` package for server-side rendering
- Option B: Move PDF rendering to client-side — upload PDF, render pages in browser with pdfjs-dist (which has native canvas), then send page images to the API

**Option B is strongly preferred** because:
- No native dependencies to install on Vercel
- pdfjs-dist already works in the browser with its worker
- Client renders pages, then sends base64 images to the existing `identify` action
- The batch-import page (`app/dashboard/tests/[id]/batch-import/page.tsx`) already runs client-side

So the implementation should be:
1. In `batch-import/page.tsx`: after user selects PDF file, use pdfjs-dist to render all pages to canvas in the browser, convert each to JPEG base64
2. Send those base64 images to the existing `POST /api/tests/[id]/batch-import` with `action: "identify"` (this endpoint already accepts base64 page images)
3. Remove the `multipart/form-data` PDF upload branch and `renderPdfWithGs()` from the API route entirely
4. Remove the `GS_PATH` env var and Ghostscript dependency
5. Keep the `identify` and `confirm` actions in the API route as they are — they work fine

Test that this works with a 30-page PDF (typical class size).

## Task 3: Fuzzy Student Name Matching

When Claude identifies "Juhan M." from a scanned page, the teacher currently has to manually type/correct every name. This wastes time for 30 students.

### 3a. Load class roster
When the batch import page loads for a test, fetch the class roster:
- The test has a `classId` field linking to `SchoolClass`
- `SchoolClass` has `students` relation to `StudentProfile[]`
- Each `StudentProfile` has a `User` with `name`

Add an API endpoint or extend the existing test detail endpoint to return the student list for the test's class.

### 3b. Fuzzy match names
After Claude identifies names from scanned pages, run fuzzy matching against the class roster:

```
AI says: "Juhan M."
Class roster: ["Juhan Mets", "Mari Kask", "Peeter Tamm", ...]
Match: "Juhan Mets" (confidence: high)
```

Use a simple approach:
- Normalize: lowercase, trim, remove diacritics
- Try exact match first
- Then try: first name match + last initial match
- Then try: Levenshtein distance or substring match
- Return the best match with a confidence flag (high/medium/low/none)

### 3c. UI for name confirmation
In the batch-import page, show each page with:
- The AI-detected name
- The fuzzy-matched student from roster (if found) — pre-selected in a dropdown
- A dropdown of ALL class students for manual override
- Color coding: green = high confidence auto-match, yellow = medium, red = no match (manual needed)
- A "Confirm all" button that accepts all high-confidence matches at once

This should cut manual work from 30 names to ~5 corrections.

## Task 4: Make Bulk Scan the Hero Workflow

Currently, the teacher dashboard shows tests in a list and bulk scan is a secondary action. Flip this: make "Scan class papers" the primary action.

### 4a. Teacher dashboard prominence
In `app/dashboard/teacher/page.tsx`:
- Add a prominent hero card at the top: "Skaneeri klassi tööd" (Scan class papers) with a big action button
- This card should either:
  - Link to a test picker → then batch import
  - Or show recent tests with a "Skaneeri" button next to each

### 4b. Test detail page
In `app/dashboard/tests/[id]/page.tsx`:
- Make "Lae üles skaneeritud PDF" (Upload scanned PDF) the PRIMARY action button (currently it might be secondary to individual photo upload)
- The single-photo upload ("Lisa üks tulemus") can stay but should be visually secondary

### 4c. Happy path guidance
Add a simple step indicator or guidance text to the teacher dashboard:
1. "Loo kontrolltöö" (Create test) — if no tests exist
2. "Skaneeri tööd" (Scan papers) — if test exists but no results
3. "Vaata tagasisidet" (Review feedback) — if results exist in DRAFT status
4. "Jaga õpilastega" (Share with students) — if results are APPROVED

This can be a simple conditional banner at the top of the teacher dashboard, not a full wizard. Keep it lightweight.

## Task 5: Wire Up Sentry

`@sentry/nextjs` is already in package.json. Wire it up:

1. Create `sentry.client.config.ts` and `sentry.server.config.ts` in project root
2. Create `sentry.edge.config.ts` if needed for edge routes
3. Update `next.config.ts` to wrap with `withSentryConfig`
4. Read `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` from env (already in .env.example)
5. Add a global error boundary component or use Next.js `error.tsx` convention
6. Make sure the Sentry init is conditional: only initialize if DSN env var is set (so dev without Sentry still works)

Read the `node_modules/next/dist/docs/` for any Next.js 16 specific Sentry integration notes.

## Task 6: Run Tests and Verify

After all changes:
1. Run `npm run build` — must succeed with no errors
2. Run `npm run test` — all existing 71 tests must still pass
3. Run `npm run lint` — fix any issues
4. Verify the teacher dashboard only shows test-related navigation
5. Verify PDF upload works without Ghostscript (client-side rendering)

## Order of Operations

Do these in order, committing after each task:
1. Task 1 (hide assignments/exercises) — smallest, safest change
2. Task 5 (Sentry) — independent, no risk
3. Task 2 (fix PDF pipeline) — production blocker
4. Task 3 (fuzzy name matching) — depends on Task 2 working
5. Task 4 (hero workflow) — final polish
6. Task 6 (verify everything)
