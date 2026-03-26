# Sprint 7 — Invite Colleague to Join

**Priority:** HIGH — needed for early adopter distribution
**Context:** Teachers should be able to invite other teachers to try the platform. The `InviteToken` model already exists in the Prisma schema. Resend is configured for email sending (see `app/api/send-email/route.ts` for the existing pattern). The from address is `onboarding@resend.dev`.

## What we're building

A simple "Kutsu kolleeg" (Invite colleague) flow:
1. A button in the teacher dashboard navbar area or dashboard page
2. A modal/page where teacher enters colleague's name + email
3. Backend creates an `InviteToken`, sends an email via Resend with a signup link
4. The invited person clicks the link, lands on the registration page with their email pre-filled
5. Teacher can see a list of invites they've sent and their status

## Tasks

### Task 1: Create the invite API endpoint

Create `app/api/invites/route.ts`:

**POST** — Create and send an invite:
- Authenticate via `mu_session` cookie (same pattern as all other routes)
- Only allow `TEACHER`, `SCHOOL_ADMIN`, `SUPERADMIN` roles
- Accept `{ name: string, email: string }`
- Validate: email is required, valid format; name is required
- Check if email is already registered (User table) — if so, return friendly error "See kasutaja on juba registreeritud"
- Check if there's already a pending (unused, non-expired) invite for this email — if so, return friendly error "Kutse on juba saadetud sellele e-postile"
- Create `InviteToken` record:
  - `email`: the invitee's email
  - `role`: `TEACHER` (default — we're inviting colleagues)
  - `token`: use `crypto.randomUUID()`
  - `createdBy`: current user's ID
  - `expiresAt`: 7 days from now
  - `usedAt`: null
- Send email via Resend:
  - `from`: `'Õpetaja Tagasiside <onboarding@resend.dev>'`
  - `to`: invitee email
  - `subject`: `'{inviterName} kutsub sind Õpetaja Tagasisidet proovima'`
  - `html`: A simple Estonian email (see template below)
- Return `{ success: true, invite: { id, email, name, createdAt, expiresAt } }`

**GET** — List invites sent by current teacher:
- Return all `InviteToken` records where `createdBy` = current user ID
- Order by `createdAt` DESC
- Include status info: pending (usedAt null, not expired), used (usedAt set), expired (expiresAt < now)

**Email HTML template** (keep it simple, inline styles):
```html
<div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1C2832; font-size: 20px;">Tere, {name}!</h2>
  <p style="color: #374151; font-size: 15px; line-height: 1.6;">
    {inviterName} kutsub sind proovima <strong>Õpetaja Tagasisidet</strong> — AI-põhist tagasiside platvormi,
    mis aitab õpetajatel kontrolltööde tagasisidet kiiremini ja põhjalikumalt anda.
  </p>
  <p style="color: #374151; font-size: 15px; line-height: 1.6;">
    Registreeru ja proovi tasuta:
  </p>
  <a href="{baseUrl}/auth/register?invite={token}&email={email}"
     style="display: inline-block; background: #1C2832; color: #F8F3DA; padding: 12px 24px;
            text-decoration: none; font-weight: 700; font-size: 15px; margin: 16px 0;">
    Loo konto →
  </a>
  <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
    See kutse kehtib 7 päeva. Kui sa ei soovi liituda, ignoreeri seda kirja.
  </p>
</div>
```

Use `process.env.NEXT_PUBLIC_BASE_URL` for `{baseUrl}`. If not set, fall back to `'https://fyysika-tagasiside.vercel.app'`.

### Task 2: Update registration page to accept invite token

Modify `app/auth/register/page.tsx`:
- Read `invite` and `email` query params from the URL
- If `invite` param is present:
  - Pre-fill the email field with the `email` param
  - Make the email field read-only (grey background)
  - Show a friendly message at top: "Sind kutsuti liituma! Loo konto allpool."
- When the registration form is submitted with an invite token:
  - Pass `inviteToken` in the POST body to `/api/auth/register`
- Update `app/api/auth/register/route.ts`:
  - If `inviteToken` is provided in the body:
    - Look up the `InviteToken` record by `token`
    - Verify it's not expired and not already used
    - If valid: set `usedAt = new Date()` after creating the user
    - If invalid/expired: ignore silently (still allow registration, just don't mark the token as used)

### Task 3: Create invite page/modal for teachers

Create `app/dashboard/invites/page.tsx` — a full page (not a modal, simpler to build):

**Top section — Send invite form:**
- Heading: "Kutsu kolleeg"
- Subheading: "Kutsu teine õpetaja Õpetaja Tagasisidet proovima"
- Two fields: Nimi (name) + E-post (email)
- Button: "Saada kutse →"
- Success message after sending: "Kutse saadetud aadressile {email}!"
- Use the app's existing design system (cream background #F8F3DA, dark text #1C2832, border #DAD0A1)

**Bottom section — Sent invites list:**
- Heading: "Saadetud kutsed"
- Table/list showing: name, email, sent date, status badge
- Status badges:
  - "Ootel" (pending) — yellow badge
  - "Registreerunud" (used) — green badge
  - "Aegunud" (expired) — grey badge
- If no invites yet, show: "Sa pole veel ühtegi kutset saatnud."

This page should be a `'use client'` component that fetches from the API.

### Task 4: Add invite link to navigation

In `components/NavBar.tsx`, add an "Kutsu" tab to the teacher navigation:
- Add to `TEACHER_TABS` array: `{ href: '/dashboard/invites', icon: '✉️', label: 'Kutsu' }`
- Place it after 'Lapsevanema load' (consents) and before 'Profiil'

### Task 5: Also add invite CTA to teacher dashboard

In `app/dashboard/teacher/page.tsx`, add a card/banner near the top of the page:
- Background: #F8F3DA with border #DAD0A1
- Text: "Kutsu kolleeg proovima" with a brief description
- Button/link to `/dashboard/invites`
- Keep it subtle — one line, not too prominent

### Task 6: Verify and test locally

1. Start dev server: `npm run dev`
2. Log in as demo teacher (demo.opetaja@opetajatagasiside.ee / Opetaja2024!)
3. Navigate to `/dashboard/invites`
4. Try sending an invite (use any email — it will go through Resend)
5. Verify the invite appears in the sent list
6. Verify the registration link works: `/auth/register?invite={token}&email={email}`
7. Check the NavBar shows the "Kutsu" tab

### Task 7: Commit and push

```bash
git add -A
git commit -m "feat: add invite colleague functionality for early adopter distribution"
git push origin main
```

### Task 8: Deploy

```bash
npx vercel --prod
```
