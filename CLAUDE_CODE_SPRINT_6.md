# Sprint 6 — Replace Free-Text Subject Input with Searchable Predefined List

**Priority:** MEDIUM — UX improvement for teacher onboarding
**Context:** The onboarding wizard (step 0) currently shows a free-text input where teachers type a subject name, which creates a new Subject record. This is wrong — subjects should come from the predefined Estonian national curriculum list that's already in the database (seeded by lib/seed.ts). Teachers should pick from this list, not invent new subjects.

## Current State

### Database — ALREADY CORRECT, no changes needed:
- `Subject` table exists with `id`, `name`, `category`, `gradeLevels`
- `TeacherSubject` join table exists with `teacherId` + `subjectId` (many-to-many)
- Seed file populates 55+ subjects grouped by category (loodusained, matemaatika, keel ja kirjandus, võõrkeeled, sotsiaalained, kunstiained, tehnoloogia, kehaline kasvatus)
- `GET /api/subjects` already returns all subjects ordered by name

### UI — NEEDS CHANGES:
- `app/dashboard/onboarding/OnboardingWizard.tsx` — Step 0 uses a free-text `<input>` for subject name
- `POST /api/subjects` creates a NEW subject — should instead LINK an existing subject to the teacher

## Tasks

### Task 1: Create a new API endpoint to link teacher to existing subject
Create `app/api/teacher/subjects/route.ts`:
- `POST` — accepts `{ subjectId: string }`, links the authenticated teacher to the subject via `TeacherSubject` join table
- `GET` — returns the current teacher's linked subjects (join Subject table for names)
- Authenticate via `mu_session` cookie (same pattern as other routes)
- Return 400 if subjectId is missing or subject doesn't exist
- Skip silently if the link already exists (don't error on duplicate)

### Task 2: Rewrite OnboardingWizard Step 0 to use a searchable dropdown
Replace the free-text input in `app/dashboard/onboarding/OnboardingWizard.tsx` step 0 with:

1. On mount, fetch `GET /api/subjects` to load all predefined subjects
2. Show a **searchable dropdown** (NOT a plain `<select>`, NOT free-text):
   - Text input that filters the subject list as you type
   - Dropdown panel below shows matching subjects, grouped by `category`
   - Category headers in the dropdown: "Loodusained", "Matemaatika", "Keel ja kirjandus", etc.
   - Each subject shows `name` and `gradeLevels` (e.g. "Füüsika — 7-12")
   - Clicking a subject selects it
   - Selected subject shows as a chip/tag below the input
   - Allow selecting MULTIPLE subjects (teachers often teach more than one)
3. The "Loo aine ja jätka →" button text changes to "Vali ained ja jätka →"
4. On submit, call `POST /api/teacher/subjects` for each selected subject
5. Step heading changes from "Loo oma esimene aine" to "Vali oma ained" (Choose your subjects)
6. Subheading changes to "Vali ained, mida õpetad. Saad hiljem rohkem aineid lisada."

### Task 3: Update summary in Step 2
In the "Kokkuvõte" section (step 2), instead of showing one subject name, show all selected subjects:
- "Ained: Füüsika, Keemia, Matemaatika"

### Task 4: Keep the existing POST /api/subjects working
Don't remove `POST /api/subjects` — it's used elsewhere. But the onboarding flow should NOT call it anymore.

### Task 5: Style requirements
- Use the existing design system (same colors, fonts, borders as current OnboardingWizard)
- Dropdown should have the cream background (#F8F3DA) with dark border (#DAD0A1)
- Category headers in the dropdown should be bold, smaller font, uppercase
- Selected subjects as chips with an × to remove
- Must work on mobile (dropdown should be scrollable, max-height ~300px)
- Keep the component in a single file (no separate components needed)
- Use inline styles (matching the existing pattern in OnboardingWizard.tsx)

### Task 6: Verify locally
1. Run `npx prisma db push` then `npx tsx lib/seed.ts` locally to ensure subjects exist
2. Start dev server: `npm run dev`
3. Navigate to `/dashboard/onboarding`
4. Verify: subjects load in dropdown, search works, multiple selection works
5. Verify: submitting creates TeacherSubject records (check with Prisma Studio: `npx prisma studio`)

### Task 7: Commit and push
```bash
git add -A
git commit -m "feat: replace free-text subject input with searchable predefined list from curriculum"
git push origin main
```
