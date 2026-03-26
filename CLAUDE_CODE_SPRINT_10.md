# Sprint 10 — Commit invite fix + deploy everything

The code changes are ALREADY MADE. You just need to commit, push, and deploy.

## Task 1: Remove stale git lock file (if exists)
```bash
rm -f .git/index.lock
```

## Task 2: Commit the invite fix
```bash
git add app/api/invites/route.ts app/dashboard/invites/page.tsx
git commit -m "fix: invite works even when email sending fails

- Save invite to database first, try email after
- If Resend fails (e.g. free plan limit), still return success with invite URL
- UI shows copyable registration link when email can't be sent
- Teacher can share the link manually via WhatsApp/email"
```

## Task 3: Push to GitHub
```bash
git push origin main
```

## Task 4: Deploy to Vercel production
```bash
npx vercel --prod
```
If asked to link to a project, select the existing `fyysika-tagasiside` project.

## Task 5: Verify deployment
After deploy completes, confirm the production URL is live by checking the output URL.
