# Sprint 17 — Simplify Flow for Prototype Testers

## Context
The app has too many pages, tabs, and steps for early prototype testing. We want to strip it down to the **core loop** that test teachers actually need:

1. **Upload test results** (PDF scan)
2. **Validate parent consents**
3. **Analyse** (AI generates feedback)
4. **Provide feedback** (teacher reviews & shares)

Everything else gets hidden — not deleted, just tucked behind a feature flag so we can switch it back on later.

**IMPORTANT: Do NOT delete any code. Only hide/skip UI elements. Use a single constant `PROTOTYPE_MODE = true` that we can flip to `false` later to restore everything.**

**After every task, run `npx tsc --noEmit` to check for TypeScript errors. Fix any errors before moving to the next task.**

---

## Task 1: Add prototype mode flag

Create a new file `lib/prototype-mode.ts`:

```typescript
/**
 * PROTOTYPE_MODE — when true, hides non-essential UI for early testers.
 * Set to false to restore full functionality.
 */
export const PROTOTYPE_MODE = true;
```

---

## Task 2: Simplify the navigation bar

Edit `components/NavBar.tsx`.

Import the flag at the top:
```typescript
import { PROTOTYPE_MODE } from '@/lib/prototype-mode';
```

Replace the current `TEACHER_TABS` constant with a dynamic version inside `getTabsForRole`:

In the `case 'TEACHER'` block, before building the tabs array, add prototype filtering:

```typescript
case 'TEACHER': {
  // In prototype mode, show only: Ülevaade, Kontrolltööd, Load (consents)
  const baseTabs = PROTOTYPE_MODE
    ? [
        { href: '/dashboard/teacher',  icon: '•', label: 'Ülevaade' },
        { href: '/dashboard/tests',    icon: '•', label: 'Kontrolltööd' },
        { href: '/dashboard/consents', icon: '•', label: 'Load' },
      ]
    : TEACHER_TABS;
  const tabs = [
    ...baseTabs,
    ...(exercisesEnabled && !PROTOTYPE_MODE ? [{ href: '/dashboard/exercises', icon: '📓', label: 'Harjutused' }] : []),
    ...(assignmentsEnabled && !PROTOTYPE_MODE ? [{ href: '/dashboard/assignments', icon: '📚', label: 'Kodutööd' }] : []),
  ];
  return tabs;
}
```

This hides: Klassid, Minu klass, Kutsu, Profiil, Harjutused, Kodutööd.
Keeps: Ülevaade (dashboard), Kontrolltööd (tests), Load (consents).

---

## Task 3: Skip onboarding for prototype testers

The 4-step onboarding (subjects → classes → students → done) is too much for a quick test. In prototype mode, auto-complete onboarding on first login so teachers land directly on the dashboard.

Edit `app/dashboard/onboarding/OnboardingWizard.tsx`.

Import the flag:
```typescript
import { PROTOTYPE_MODE } from '@/lib/prototype-mode';
```

At the very top of the component function (right after hooks), add:

```typescript
useEffect(() => {
  if (PROTOTYPE_MODE) {
    // Auto-complete onboarding in prototype mode — skip all steps
    fetch('/api/account/onboarding-complete', { method: 'PATCH' })
      .then(() => router.push('/dashboard/teacher'))
      .catch(() => {});
  }
}, []);
```

Also, in the teacher dashboard page (`app/dashboard/teacher/page.tsx`), find the incomplete onboarding banner (the yellow `!user.onboardingCompleted` block) and wrap it:

Find this pattern:
```tsx
{!user.onboardingCompleted && (
```

The whole banner block should be wrapped with an additional prototype check. Replace the condition with:
```tsx
{!user.onboardingCompleted && !PROTOTYPE_MODE && (
```

Import the flag at the top of the teacher dashboard file too. Since this is a server component, use:
```typescript
import { PROTOTYPE_MODE } from '@/lib/prototype-mode';
```

---

## Task 4: Simplify the teacher dashboard

Edit `app/dashboard/teacher/page.tsx`.

The current dashboard has too many sections. In prototype mode, keep only:
- The happy-path guidance banner (steps 1-4)
- The scannable tests hero section ("Skaneeri klassi tööd")
- The stats row (4 cards)
- The "Needs attention" card

**Hide in prototype mode:**
- The pipeline grid (6 columns of test statuses)
- The invite colleague banner
- The audit log section
- The results by subject section

Import the flag (if not already):
```typescript
import { PROTOTYPE_MODE } from '@/lib/prototype-mode';
```

Find the **pipeline grid** section. It should be a section with a header like "Töövoog" or containing the `PIPELINE_STATUSES` rendering loop. Wrap the entire pipeline grid in:
```tsx
{!PROTOTYPE_MODE && (
  // ... pipeline grid code ...
)}
```

Find the **invite colleague banner**. It's a div with text like "Kutsu kolleeg" or a link to `/dashboard/invites`. Wrap it:
```tsx
{!PROTOTYPE_MODE && (
  // ... invite banner ...
)}
```

Find the **audit log** section (the one rendering `auditLogs`). Wrap it:
```tsx
{!PROTOTYPE_MODE && (
  // ... audit log section ...
)}
```

Find the **results by subject** section (the one rendering `subjectStats`). Wrap it:
```tsx
{!PROTOTYPE_MODE && (
  // ... subject stats section ...
)}
```

The dashboard should now show just: guidance banner → scan hero → 4 stat cards → needs attention items.

---

## Task 5: Simplify the test creation form

Edit `app/dashboard/tests/new/page.tsx`.

Import the flag:
```typescript
import { PROTOTYPE_MODE } from '@/lib/prototype-mode';
```

In prototype mode, hide the advanced section entirely (notes, rubric, answer key) — teachers don't need those for initial testing.

Find the advanced toggle section (the collapsible area with `showAdvanced`). Wrap it:
```tsx
{!PROTOTYPE_MODE && (
  // ... advanced toggle button + collapsible content ...
)}
```

Also simplify: the Topic field is optional and adds clutter. Wrap it too:
```tsx
{!PROTOTYPE_MODE && (
  // ... topic input field ...
)}
```

So the new test form in prototype mode only shows: Title, Grade, Subject, Planned date + Create button.

---

## Task 6: Simplify the test detail page

Edit `app/dashboard/tests/[id]/page.tsx`.

Import the flag:
```typescript
import { PROTOTYPE_MODE } from '@/lib/prototype-mode';
```

**Hide in prototype mode:**

1. The 6-step lifecycle visual (PREPARING → COMPLETE). It's complex and not needed for prototype — the teacher just needs to upload, analyse, review. Find the lifecycle `<div>` and wrap it:
```tsx
{!PROTOTYPE_MODE && (
  // ... lifecycle visual ...
)}
```

2. The "Advance status" button (`TestAdvanceButton`). Wrap it:
```tsx
{!PROTOTYPE_MODE && canAdvance && nextStatus && (
```

3. The Notes, Rubric, and Answer Key display sections. Wrap each:
```tsx
{!PROTOTYPE_MODE && test.notes && (
```
```tsx
{!PROTOTYPE_MODE && test.rubric && (
```
```tsx
{!PROTOTYPE_MODE && test.answerKey && (
```

4. The "+ Lisa üks tulemus" (add single result) button. In prototype, we only want PDF batch upload. Find the Link to `results/new` and wrap it:
```tsx
{!PROTOTYPE_MODE && (
  <Link href={`/dashboard/tests/${test.id}/results/new`} ...>
    + Lisa üks tulemus
  </Link>
)}
```

**Keep visible:**
- Header (title, subject, grade, date, status badge)
- Stats card (student count, average, shared, pending)
- "Lae üles skannitud PDF" button
- "Nõusolekud" (consent check) button
- "Analüüsi kõik" bulk analyze button
- Student results table/list

---

## Task 7: Simplify the batch-import review cards

Edit `app/dashboard/tests/[id]/batch-import/page.tsx`.

Import the flag:
```typescript
import { PROTOTYPE_MODE } from '@/lib/prototype-mode';
```

In prototype mode with only 3 students, the individual page thumbnails are noisy. When a student has multiple pages, show a **collapsed card** (student name + page count + confidence badge) instead of expanding every page image.

Find the review phase grid where assignment cards are rendered. In the card rendering section, when PROTOTYPE_MODE is true, show a simpler layout:

After the existing card grid opening, add a prototype-mode alternative:

```tsx
{PROTOTYPE_MODE ? (
  /* Compact prototype view: one row per student, not per page */
  (() => {
    // Group assignments by confirmed name
    const studentGroups: Record<string, typeof assignments> = {};
    for (const a of assignments) {
      const name = a.confirmedName.trim() || a.proposedName || `Leht ${a.index + 1}`;
      if (!studentGroups[name]) studentGroups[name] = [];
      studentGroups[name].push(a);
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries(studentGroups).map(([name, pages]) => {
          const first = pages[0];
          const allIncluded = pages.every(p => p.include);
          const matchedStudent = first.matchedStudentId ? roster.find(s => s.id === first.matchedStudentId) : null;

          return (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#fff', border: '1.5px solid #DAD0A1', padding: '12px 16px',
            }}>
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={allIncluded}
                onChange={(e) => {
                  setAssignments(prev => prev.map(a =>
                    (a.confirmedName.trim() || a.proposedName) === name
                      ? { ...a, include: e.target.checked }
                      : a
                  ));
                }}
                style={{ width: 18, height: 18 }}
              />

              {/* Student name */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1C2832' }}>{name}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{pages.length} lehte</div>
              </div>

              {/* Confidence badge */}
              {first.confidence && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                  ...(first.confidence === 'high'
                    ? { background: '#dcfce7', color: '#15803d' }
                    : first.confidence === 'medium'
                    ? { background: '#fef9c3', color: '#854d0e' }
                    : { background: '#fee2e2', color: '#991b1b' }),
                }}>
                  {first.confidence === 'high' ? 'Kindel' : first.confidence === 'medium' ? 'Umbkaudne' : 'Kahtlane'}
                </span>
              )}

              {/* Consent badge */}
              {matchedStudent && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                  ...(matchedStudent.hasConsent
                    ? { background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }
                    : { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }),
                }}>
                  {matchedStudent.hasConsent ? '✓ Nõusolek' : '⚠ Puudub'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  })()
) : (
  /* Full view: existing card grid with page thumbnails */
```

And close the ternary after the existing card grid:
```tsx
)}
```

This way the prototype shows a clean list: ☑ Liisa Tamm (2 lehte) [Kindel] [✓ Nõusolek], instead of 6 individual page cards.

---

## Task 8: Verify TypeScript + build

```bash
npx tsc --noEmit
npm run build
```

Fix any errors before continuing.

---

## Task 9: Commit, push, and deploy

```bash
git add -A
git commit -m "feat: prototype mode — simplify flow for test users

- Add PROTOTYPE_MODE flag (lib/prototype-mode.ts)
- Simplify navbar: only Ülevaade, Kontrolltööd, Load
- Auto-skip onboarding wizard in prototype mode
- Dashboard: hide pipeline grid, audit log, subject stats, invite banner
- Test creation: hide topic, notes, rubric, answer key fields
- Test detail: hide lifecycle, status advance, single-result add
- Batch-import: compact student list (one row per student, not per page)
- All code preserved — set PROTOTYPE_MODE = false to restore

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push origin main
npx vercel --prod
```

---

## What this achieves

The prototype tester now sees a **4-step flow**:

1. **Ülevaade** (dashboard) → See guidance: "Create test → Scan → Review → Share"
2. **Kontrolltööd** → Create a test (just title + grade + subject + date) → Upload PDF
3. **Load** → Check parent consents
4. **Test detail** → "Analüüsi kõik" → Review AI feedback → Approve & share

**Hidden (restorable by setting `PROTOTYPE_MODE = false`):**
- Onboarding wizard (auto-skipped)
- Nav tabs: Klassid, Minu klass, Kutsu, Profiil
- Dashboard sections: pipeline grid, audit log, subject stats, invite banner
- Test form: topic, notes, rubric, answer key
- Test detail: lifecycle visual, status advance button, single-result add
- Batch-import: per-page card grid (replaced with compact student list)
