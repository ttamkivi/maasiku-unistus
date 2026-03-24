# Sprint: Pilot-Ready | March 24-28, 2026

**Goal:** A real physics teacher can register, create a test, scan student papers, review AI feedback, and share it with students — safely and without confusion.

**Status:** Code-complete but NOT pilot-ready. Four audits (QA, UX, Security, Domain QA) found 19 critical/high issues.

---

## Audit Scores

| Area | Score | Verdict |
|------|-------|---------|
| QA (bugs & validation) | 5 CRITICAL, 6 HIGH | NOT READY |
| UX (teacher journey) | Needs Work | 5 must-fix items |
| Security (auth & data) | 4 CRITICAL, 6 HIGH | NOT READY |
| Domain QA (AI feedback) | 8.5/10 | Ready with safeguards |

---

## Phase 1: CRITICAL FIXES (must do before any real user)

### Security — Day 1

| # | Task | Size | File |
|---|------|------|------|
| S1 | Add authentication to `/api/analyze` | S | app/api/analyze/route.ts |
| S2 | Add consent check to `/api/analyze` before AI processing | S | app/api/analyze/route.ts |
| S3 | Add Zod validation to `/api/analyze` inputs | S | app/api/analyze/route.ts |
| S4 | Fix `/api/account/export` broken access control (user can export other users' data) | S | app/api/account/export/route.ts |
| S5 | Rotate ANTHROPIC_API_KEY and CRON_SECRET (committed to .env.local in git history) | S | .env.local + GitHub |
| S6 | Fix login timing attack (early return for non-existent emails) | S | app/api/auth/login/route.ts |

### QA — Day 1

| # | Task | Size | File |
|---|------|------|------|
| Q1 | Add error handling for Claude API failures (return Estonian error message) | S | app/api/analyze/route.ts |
| Q2 | Validate base64 image size in batch-import (prevent DoS) | S | app/api/tests/[id]/batch-import/route.ts |
| Q3 | Fix consent-check merge action (show which records merge before confirming) | M | app/api/tests/[id]/consent-check/route.ts |

---

## Phase 2: UX MUST-FIXES (Day 2)

| # | Task | Size | File |
|---|------|------|------|
| U1 | Add "Registreeru" button prominently on landing page hero | S | app/page.tsx |
| U2 | Add "Pole kontot? Registreeru" link on login page | S | app/auth/login/page.tsx |
| U3 | Simplify Create Test form — hide rubric/answer key in collapsible "Advanced" section | M | app/dashboard/tests/new/page.tsx |
| U4 | Rename nav items: "Õpilased" → "Minu klass", "Nõusolekud" → "Lapsevanema load" | S | components/NavBar.tsx |
| U5 | Add breadcrumbs to test detail and result pages | M | app/dashboard/tests/[id]/, results/ |
| U6 | Add summary before batch-import confirm: "Kindlad: X, Kahtlased: Y, Leidmata: Z" | S | app/dashboard/tests/[id]/batch-import/page.tsx |

---

## Phase 3: HIGH-PRIORITY POLISH (Day 3)

| # | Task | Size | File |
|---|------|------|------|
| H1 | Increase Claude max_tokens from 8000 to 16000 (feedback truncation risk) | S | lib/claude.ts |
| H2 | Add password requirements display on registration | S | app/auth/register/page.tsx |
| H3 | Add Content-Security-Policy headers | M | next.config.ts or middleware.ts |
| H4 | Fix rate limiter: add cleanup interval, per-session tracking | M | app/api/analyze/route.ts |
| H5 | Add empty roster state to batch-import ("No roster found, fill names manually") | S | app/dashboard/tests/[id]/batch-import/page.tsx |

---

## Phase 4: DEPLOYMENT (Day 4)

### Pre-deployment checklist

- [ ] Push 9 unpushed commits to GitHub
- [ ] Rotate secrets: generate new ANTHROPIC_API_KEY and CRON_SECRET
- [ ] Create Vercel project, connect to `ttamkivi/maasiku-unistus`
- [ ] Set environment variables on Vercel:
  - `ANTHROPIC_API_KEY` (new key)
  - `RESEND_API_KEY` (sign up at resend.com)
  - `NEXT_PUBLIC_BASE_URL` (your Vercel URL)
  - `CRON_SECRET` (new secret)
  - `DATABASE_URL` (Turso or LibSQL cloud)
  - `NEXT_PUBLIC_POSTHOG_KEY` (sign up at eu.posthog.com — free)
  - `NEXT_PUBLIC_POSTHOG_HOST` = `https://eu.i.posthog.com`
  - `SENTRY_DSN` (optional, sign up at sentry.io)
- [ ] Run database migration on production
- [ ] Run seed script for demo data
- [ ] Verify build succeeds on Vercel
- [ ] Smoke test: register → create test → batch import → review → share

### Post-deployment

- [ ] Test email delivery (consent request, password reset)
- [ ] Verify PostHog receives events
- [ ] Test on mobile (iPhone Safari, Android Chrome)
- [ ] Test with real scanned PDF of student papers

---

## Phase 5: TEACHER PILOT (Day 5+)

### Onboarding the first tester

1. Share app URL + demo credentials
2. Walk them through: Register → Onboarding → Create Test → Scan PDF → Review AI Feedback → Share
3. Collect feedback after first use session
4. Monitor PostHog funnel for drop-off points

### Known limitations to communicate

- Only physics tests supported (other subjects coming later)
- Assignments/exercises hidden (Phase 2 feature)
- eID authentication uses demo endpoints (production SK credentials needed for launch)
- AI feedback requires teacher review before sharing — AI can make physics errors
- Email delivery may be slow on Resend free tier (100/day limit)

---

## Total Effort Estimate

| Phase | Days | Confidence |
|-------|------|------------|
| Phase 1: Critical fixes | 1 day | High |
| Phase 2: UX must-fixes | 1 day | High |
| Phase 3: Polish | 1 day | Medium |
| Phase 4: Deployment | 0.5 day | High |
| Phase 5: Pilot start | Day 5 | — |

**Aggressive target: Teacher testing by Friday March 28.**

---

## What we're NOT doing this sprint

- New features (assignments, exercises)
- Production eID integration (expensive, needs contract)
- Multi-subject support
- Full test suite expansion
- i18n / multi-language
- Custom domain / branding
