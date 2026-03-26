# Sprint 8 — Rebrand: "Õpetaja Tagasiside" → "Õpetaja Tagasiside" + Design Refresh

**Priority:** HIGH — must ship before pilot testers see the app
**Context:** "Õpetaja Tagasiside" was an internal placeholder. The product now serves ALL teachers (not just physics), helping them save 10+ hours/week on grading feedback. New name: **Õpetaja Tagasiside** (Teacher Feedback). Design refresh inspired by real.edu.ee — clean, institutional, trustworthy.

## Part A: Name & Text Rebrand

### Task 1: Global string replacement — brand name
Replace ALL occurrences across the entire codebase:

| Old | New |
|-----|-----|
| `Õpetaja Tagasiside` | `Õpetaja Tagasiside` |
| `opetajatagasiside` | `opetajatagasiside` |
| `Õpetaja Tagasiside` | `Õpetaja Tagasiside` |

This affects:
- `app/layout.tsx` metadata title
- `components/NavBar.tsx` logo text
- `app/page.tsx` hero heading and all references
- `app/auth/login/page.tsx` and `app/auth/register/page.tsx`
- `app/privacy/page.tsx` and `app/legal/page.tsx`
- `app/consent/[token]/page.tsx`
- `app/privacy/parent-letter/page.tsx`
- `lib/seed.ts` — demo email domains (change `opetajatagasiside.ee` → `opetajatagasiside.ee`)
- `app/api/send-email/route.ts` — from address display name
- `app/api/invites/route.ts` — invite email text
- All sprint/docs MD files (TEACHER_PILOT_GUIDE.md, SPRINT_PILOT_READY.md, etc.)

### Task 2: Session cookie names
Replace `mu_session` → `ot_session` and `mu_preview_role` → `ot_preview_role` across ALL files.
Use find-and-replace across the entire project. These appear in ~100 files.

### Task 3: Update metadata and SEO
In `app/layout.tsx`:
```typescript
export const metadata: Metadata = {
  title: 'Õpetaja Tagasiside',
  description: 'AI-põhine tagasiside platvorm õpetajatele — säästa igal nädalal tunde kontrolltööde tagasiside kirjutamiselt',
};
```

### Task 4: Update hero section positioning (app/page.tsx)
The hero needs to reflect ALL subjects, not just physics. Update these texts:

- Badge: `"Eesti kooli AI tööriist · prototüüp"` → `"AI-põhine tagasiside platvorm õpetajatele"`
- Heading: `"Õpetaja Tagasiside"` (already done by Task 1)
- Subheading: change to `"Säästa igal nädalal tunde. AI aitab sul anda igale õpilasele põhjalikku, personaalset tagasisidet — kõikides ainetes."`
- Keep the CTA buttons as-is

### Task 5: Update "How it works" section
In `app/page.tsx`, update the "Kuidas see toimib" section:
- Change the card heading from `"Klass kirjutab kontrolltöö"` to `"Pildista, analüüsi, jaga"`
- Update the description to be subject-agnostic: `"Õpetaja pildistab õpilaste töid. AI analüüsib iga tööd ainekava järgi ja koostab isikliku tagasiside. Õpetaja vaatab üle, kinnitab ja jagab."`

### Task 6: Update send-email from address
In `app/api/send-email/route.ts`:
- Change `'Füüsika Tagasiside <onboarding@resend.dev>'` → `'Õpetaja Tagasiside <onboarding@resend.dev>'`
- Change email subject template from `Füüsika tagasiside:` → `Õpetaja tagasiside:`

In `app/api/invites/route.ts`:
- Change `'Õpetaja Tagasiside <onboarding@resend.dev>'` → `'Õpetaja Tagasiside <onboarding@resend.dev>'`
- Update invite email text to reference "Õpetaja Tagasiside" and describe it as "AI-põhine tagasiside platvorm, mis aitab õpetajatel anda igale õpilasele personaalset tagasisidet minutitega"

## Part B: Design Refresh (real.edu.ee inspired)

### Task 7: Color palette update
The current palette (#1C2832 dark, #F8F3DA cream, #DAD0A1 gold) is already very close to real.edu.ee. Keep it, but make these refinements:

- **Background**: Keep `#fff` for main content area, but section backgrounds use a warmer cream `#FAF8F0` (slightly lighter than current #F8F3DA)
- **Accent color**: Add a subtle blue-teal `#2B6B8A` for interactive elements (links, active states) — this differentiates from the school site while staying in the education palette
- **Success green**: Keep `#16a34a` / `#22c55e`
- **All other colors stay the same**

Apply these in: `app/page.tsx`, `app/layout.tsx`, `components/NavBar.tsx`, onboarding wizard, and dashboard pages.

### Task 8: Replace emoji icons with clean SVG line icons
real.edu.ee uses clean line-art icons, not emojis. Replace emojis throughout:

In `app/page.tsx` "How AI works" section, replace the emoji icons (📷 🤖 📝 🔒) with simple inline SVG line icons. Use `<svg>` elements with `stroke="#1C2832"`, `strokeWidth="1.5"`, `fill="none"`, size 32x32. Design them as:
- Camera icon (for photo upload)
- Brain/sparkle icon (for AI analysis)
- Document/pen icon (for feedback)
- Shield/lock icon (for privacy)

In `components/NavBar.tsx` TEACHER_TABS, replace emoji icons with text-only labels (remove the icon property entirely, or use simple Unicode characters like `→` or `•`). The real.edu.ee nav uses text-only navigation.

In the "How it works" steps, replace the 📋 emoji with a clean SVG clipboard icon.

In the role cards (Õpetajale, Õpilasele, Lapsevanemale), replace 🧑‍🏫 🎓 👨‍👩‍👧 emojis with clean SVG icons.

### Task 9: Add subtle wavy line decorations
real.edu.ee uses repeating wavy SVG lines as section dividers. Add a reusable WaveDivider component:

```tsx
function WaveDivider({ color = '#DAD0A1', opacity = 0.3 }: { color?: string; opacity?: number }) {
  return (
    <div style={{ width: '100%', overflow: 'hidden', lineHeight: 0, opacity }}>
      <svg viewBox="0 0 1200 40" preserveAspectRatio="none" style={{ width: '100%', height: 40 }}>
        <path d="M0,20 C150,40 350,0 600,20 C850,40 1050,0 1200,20 L1200,40 L0,40 Z" fill={color} />
      </svg>
    </div>
  );
}
```

Use it between major sections on the landing page (after hero, between "how it works" and role cards, before footer CTA).

### Task 10: Typography refinement
real.edu.ee uses uppercase section headers with wide letter-spacing. Apply this to `app/page.tsx`:
- Section sub-labels (like "Kuidas see toimib?", "Rollid") → `textTransform: 'uppercase'`, `letterSpacing: '0.12em'` (these already exist but verify consistency)
- Main section headings → Keep as-is (bold, larger)
- The "POPULAARSED VALIKUD" style from real.edu.ee = wide letter-spacing, uppercase, large size — use this for section titles

### Task 11: Footer update
In `app/layout.tsx`, update the footer:
- Change `"© 2026 Õpetaja Tagasiside"` → `"© 2026 Õpetaja Tagasiside"`
- Add a subtle wavy line above the footer
- Keep the dark background (#1C2832) and light text — matches real.edu.ee footer exactly

## Part C: Verify & Deploy

### Task 12: Build locally and verify
```bash
npm run build
```
Fix any TypeScript or build errors from the rename.

### Task 13: Verify visually
Start `npm run dev` and check:
1. Landing page — new name, updated hero, no emojis, wavy dividers
2. Login page — says "Õpetaja Tagasiside"
3. NavBar — shows "Õpetaja Tagasiside" as logo, text-only nav labels
4. Onboarding — no "Õpetaja Tagasiside" anywhere
5. Invite email — references "Õpetaja Tagasiside"
6. Footer — updated copyright

### Task 14: Commit and push
```bash
git add -A
git commit -m "rebrand: Õpetaja Tagasiside → Õpetaja Tagasiside + design refresh inspired by real.edu.ee"
git push origin main
```

### Task 15: Deploy
```bash
npx vercel --prod
```
