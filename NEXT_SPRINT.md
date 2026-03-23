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

## Task 7: Seed Realistic Demo Data for Teacher Testing

The current seed only creates schools, subjects, and admin users. A teacher testing the app needs a fully wired demo class. Seed the following in `lib/seed.ts`:

### 7a. Teacher account
- Email: `demo.opetaja@maasikuunistus.ee`, password: `Opetaja2024!`
- Role: `TEACHER`, name: `Demo Õpetaja`
- Create `TeacherProfile`, link to `Demo Kool` via `TeacherSchool`
- Link to subject `Füüsika` via `TeacherSubject`

### 7b. Academic year & class
- Create `AcademicYear`: label `2025/2026`, schoolId = Demo Kool, isActive = true, startDate 2025-09-01, endDate 2026-06-15
- Create `SchoolClass`: name `9.B`, gradeLevel 9, linked to Demo Kool + academic year, homroomTeacherId = the demo teacher

### 7c. 38 students with parents
Create 38 students with realistic Estonian names. For each student:
- Create a `User` with role `STUDENT`, email pattern: `eesnimi.perenimi@demo.maasikuunistus.ee`
- Create `StudentProfile` linked to Demo Kool and class 9.B
- Create a parent `ParentProfile` (can be unregistered — userId null, just email + name)
- Create `ParentStudentLink`

Use these 38 names (first + last):
1. Juhan Mets, 2. Mari Kask, 3. Peeter Tamm, 4. Liis Kuusk, 5. Rasmus Pärn,
6. Anna Saar, 7. Karl Lepp, 8. Kadri Vaher, 9. Martin Rebane, 10. Laura Ilves,
11. Siim Põld, 12. Hanna Järv, 13. Oliver Raud, 14. Emma Laur, 15. Markus Sepp,
16. Sofia Rand, 17. Kristjan Org, 18. Mia Kukk, 19. Robert Lill, 20. Helena Paju,
21. Andreas Mägi, 22. Grete Kivi, 23. Oskar Teder, 24. Nora Kallas, 25. Henrik Ots,
26. Liisa Pihl, 27. Mattias Roots, 28. Mirtel Nurm, 29. Daniel Valk, 30. Kertu Aas,
31. Sander Koppel, 32. Triin Luik, 33. Sten Tomson, 34. Hele Mitt, 35. Joosep Vahter,
36. Anette Pärg, 37. Taavi Rätsep, 38. Elina Hint

### 7d. Consent grants — 30 with, 8 without
- Students 1–30 get an ACTIVE consent grant for subject `Füüsika`, scoped to the academic year
- For each: create a `ConsentRequest` (status APPROVED) and a `ConsentGrant` (status ACTIVE, scope SPECIFIC_SUBJECT, subjectId = Füüsika)
- Students 31–38 (Sander, Triin, Sten, Hele, Joosep, Anette, Taavi, Elina) have NO consent — no ConsentRequest, no ConsentGrant
- This lets the teacher see what happens when consent is missing during AI analysis

### 7e. Sample test (optional but helpful)
- Create one `Test` for the demo teacher, subject Füüsika, class 9.B, title "Mehaanika kontrolltöö", status READY
- No test results yet — the teacher will upload scanned papers themselves

### Important notes
- Use `upsert` patterns (find by email or unique field) so the seed is idempotent
- Generate a unique `inviteToken` for each ConsentRequest (use `crypto.randomUUID()`)
- Set ConsentRequest.expiresAt to 1 year from now
- Parent names: use pattern "Ema/Isa [student last name]" (e.g., "Ema Mets" for Juhan Mets)
- Parent emails: `ema.perenimi@demo.maasikuunistus.ee`

## Task 8: Rebuild the AI Feedback Brain — Science-Based Grading & Assessment

The current AI prompt in `lib/claude.ts` works but lacks grounding in Estonian assessment standards and education science. This task rebuilds the system prompt so every piece of AI feedback follows research-backed best practices.

### Sources embedded in the new prompt

**1. Tallinna Reaalkool hindamisjuhend (TRK grading guide)**
- The official school grading framework that teachers actually use
- Stored at: `references/trk-hindamisjuhend.md`

**2. Aus, Arro & Malleus-Kotšegarov (2022) "Teaduspõhine vaade hindamisele"**
- Three top Estonian educational psychologists (Tallinn University / University of Tartu)
- Their key research-backed recommendations for how assessment should work

**3. International research consensus** (Guskey 2019, Koenka et al 2021, Hattie & Timperley 2007, Ryan & Deci 2020, Harks et al 2014, Knight & Cooper 2019)

### 8a. Create reference file `references/assessment-science.md`

Create a reference file that the AI system prompt can include (similar to how `lib/curriculum.ts` works). This file encodes the assessment science principles as rules the AI must follow. Contents:

```markdown
# Teaduspõhised hindamise ja tagasiside põhimõtted
# (Science-based assessment and feedback principles)

## Source: Aus, Arro & Malleus-Kotšegarov (2022), Guskey (2019), Koenka et al (2021),
## Hattie & Timperley (2007), Ryan & Deci (2020)

### Three distinct concepts — never confuse them:
1. HINDAMINE (assessment) = collecting info about where the student is in their learning
2. TAGASISIDESTAMINE (feedback) = giving the student actionable info to support their growth
3. HINDE PANEMINE (grading) = assigning a number/letter — this is the SMALLEST part

### The 12 feedback rules:

RULE 1: SEPARATE SCORES FROM FEEDBACK
- Never display the grade/score inside the detailed feedback text
- Scores go in `test_info.score` and `tasks[].points_earned` — they are NOT repeated in the narrative
- Research: students ignore written feedback when a grade is visible (Guskey 2019, Butler 1988)

RULE 2: MASTERY FRAMING, NEVER PERFORMANCE FRAMING
- Frame everything as "where you are on your learning journey" — NOT ranking or sorting
- NEVER compare to classmates, class average, or "what good students do"
- Use: "Sa oled õppimas..." (You are learning...) not "Sa said halvasti..." (You did poorly)
- Research: mastery framing reduces achievement gaps (Souchal et al 2014)

RULE 3: PROCESS OVER PERSON
- Give feedback at task-level and process-level, NOT self-level
- BAD: "Tubli!" (Good job!) or "Sa oled nõrk füüsikas" (You're weak in physics)
- GOOD: "See lahenduskäik näitab, et Sa mõistad jõu mõistet" (This solution shows you understand the concept of force)
- Research: self-level feedback harms motivation (Hattie & Timperley 2007)

RULE 4: ANSWER THE THREE QUESTIONS (Hattie & Timperley 2007)
Every feedback response MUST answer:
1. KUHU MA LÄHEN? (Where am I going?) — the learning goal
2. KUIDAS MUL LÄHEB? (How am I going?) — progress evidence from the actual test
3. MIDA EDASI? (Where to next?) — specific, actionable next steps

RULE 5: INFORMATIONAL, NOT CONTROLLING LANGUAGE
- Use curious, collaborative Estonian: "Pane tähele, et..." (Notice that...), "Proovi mõelda..." (Try thinking about...)
- NEVER use: "Sa pead..." (You must), "See on vale" (This is wrong), "Sa ei suutnud..." (You couldn't)
- Research: controlling language kills intrinsic motivation (Ryan & Deci 2020)

RULE 6: ALWAYS START FROM STRENGTH
- Even in a test with 20% score, identify what the student DID understand
- Name the specific competence demonstrated, however small
- This is not empty praise — it's accurate diagnostic information about what foundations exist
- Research: strengths-based feedback supports self-efficacy (Koenka et al 2021)

RULE 7: ERRORS ARE LEARNING DATA, NOT FAILURES
- Treat each mistake as diagnostic info: what misconception does this reveal?
- Classify errors: conceptual gap (väärarusaam), formula confusion, calculation error, unit error, incomplete reasoning, misread question
- Frame: "See viga näitab, et..." (This error shows that...) → "Järgmine samm oleks..." (The next step would be...)

RULE 8: CONNECT TO CURRICULUM JOURNEY
- Place THIS test in the broader learning arc: what was already covered, what builds on this
- Use the curriculum reference to show that today's struggle is tomorrow's foundation
- "See teema on aluseks järgmisele peatükile, kus..." (This topic is the foundation for the next chapter, where...)

RULE 9: MAKE IT PERSONALLY ACTIONABLE
- Every "mida parandada" item must include a CONCRETE next step the student can take TODAY
- Not: "Õpi valemeid paremini" (Learn formulas better)
- Yes: "Kirjuta Newtoni II seadus (F=ma) iga ülesande algusesse enne lahendamist" (Write Newton's 2nd law at the start of each problem before solving)

RULE 10: TEACHER NOTES ARE DIAGNOSTIC, NOT EVALUATIVE
- `markmed_opetajale` should help the teacher understand patterns, misconceptions, and what to focus on
- Include: which curriculum objectives are met/unmet, suggested differentiation
- Never include language that labels the student ("weak", "lazy", "talented")

RULE 11: NO COMPARISON, NO RANKING
- The AI must NEVER generate text comparing this student to others
- No percentiles, no "most students get this right", no "this is below average"
- Each student's feedback exists in isolation — about THEIR learning journey only

RULE 12: ACKNOWLEDGE UNCERTAINTY HONESTLY
- If handwriting is unclear: "[loetamatu]" — don't guess
- If the AI isn't sure about the student's reasoning: say "Tundub, et..." (It seems that...) not "Sa arvasid valesti" (You thought wrong)
- Honesty about AI limitations builds trust
```

### 8b. Create `lib/assessment-rules.ts`

Export the assessment science as a TypeScript constant (like `lib/curriculum.ts` does):

```typescript
// Auto-generated from references/assessment-science.md
// Source: Aus, Arro & Malleus-Kotšegarov (2022), Guskey (2019), Koenka et al (2021),
// Hattie & Timperley (2007), Ryan & Deci (2020)
export const ASSESSMENT_RULES = `...contents of assessment-science.md...`;
```

### 8c. Update `lib/claude.ts` system prompt

Rewrite `buildSystemPrompt()` to incorporate the assessment science. Key changes:

1. **Add `ASSESSMENT_RULES` import** and embed in the system prompt after the curriculum reference
2. **Restructure the JSON output** to align with the three questions:
   - Rename `mis_laks_hasti` → `tugevused` (strengths) — what the student demonstrably knows
   - Rename `mida_parandada` → `arengukohad` (development areas) — framed as growth, not deficit
   - Rename `uldine_muster` → `oppimise_hetkeseeis` (current learning state) — diagnostic, not judgmental
   - Keep `soovitused` but rename → `jargmised_sammud` (next steps) — must be concrete actions
   - Keep `pilk_ettepoole` → `oppeteekond` (learning journey) — connect to curriculum arc
   - Keep `markmed_opetajale` but add explicit guidance about diagnostic focus
   - Add new field: `opieesmark` — the learning objective this test assessed
3. **Add Estonian grading scale to the prompt** (from TRK hindamisjuhend):
   - For grades 5–9 (kümnepallisüsteem): 10=95-100%, 9=90-94%, 8=85-89%, 7=75-84%, 6=70-74%, 5=60-69%, 4=50-59%, 3=40-49%, 2=20-39%, 1=0-19%
   - For grades 5–9 (viiepalliline): väga hea=5, hea=4, rahuldav=3, puudulik=2, nõrk=1
   - The AI should detect if a score/percentage is visible and map to the correct scale, but NOT emphasise the grade in the feedback text
4. **Rewrite the CRITICAL RULES section** to embed the 12 assessment science rules
5. **Change tone instructions**: replace "Be specific — reference actual questions" with richer guidance about informational, mastery-oriented language
6. **Keep all existing functionality**: privacy placeholder, tasks array, resources, drawings

### 8d. Update `lib/types.ts` FeedbackData type

Update the TypeScript type to match the new JSON field names. Keep backward compatibility — accept both old and new field names during transition.

### Important implementation notes
- The system prompt will be longer — this is fine, it fits within claude-sonnet-4-6's context
- Test with the demo class data from Task 7 before shipping
- The teacher still reviews and can edit all AI feedback before sharing with students
- Store `references/assessment-science.md` in git so it can be updated as research evolves

## Order of Operations

Do these in order, committing after each task:
1. Task 1 (hide assignments/exercises) — smallest, safest change
2. Task 5 (Sentry) — independent, no risk
3. Task 2 (fix PDF pipeline) — production blocker
4. Task 3 (fuzzy name matching) — depends on Task 2 working
5. Task 4 (hero workflow) — final polish
6. Task 7 (seed demo data) — teacher needs this to test
7. Task 8 (AI feedback brain) — the core value proposition
8. Task 6 (verify everything)
