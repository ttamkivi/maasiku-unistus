# Sprint 4 — Fix Vercel Production Build

**Context:** Vercel deployment fails with `module-not-found` error. The Prisma client is not generated before `next build` runs. The import path `./lib/generated/prisma/client` does not exist at build time because `prisma generate` has not been run.

**Priority:** CRITICAL — blocks all deployment.

---

## Task 1: Add `prisma generate` to the build script

In `package.json`, change the build script from:

```json
"build": "next build",
```

to:

```json
"build": "prisma generate && next build",
```

This ensures the Prisma client is generated before Next.js tries to build.

---

## Task 2: Add `postinstall` hook for Prisma

Add a `postinstall` script to `package.json` so Prisma generates the client after `npm install` on any platform (Vercel, local, CI):

```json
"postinstall": "prisma generate"
```

---

## Task 3: Verify the build works locally

Run:

```bash
rm -rf node_modules/.prisma lib/generated
npm install
npm run build
```

All three commands must succeed without errors. Fix any issues that come up.

---

## Task 4: Check `.gitignore` includes generated Prisma files

Make sure `lib/generated/` and/or `.prisma/` are in `.gitignore` so generated files are never committed. Add them if missing.

---

## Task 5: Verify environment variable handling

The app uses `DATABASE_URL` for Turso in production. Check that `lib/db.ts` handles the case where:
- In development: `DATABASE_URL=file:./dev.db` (local SQLite)
- In production: `DATABASE_URL=libsql://...` (Turso)

If the LibSQL adapter does not support `file:` URLs, add a conditional that only uses the adapter when the URL starts with `libsql://`. Otherwise the local dev experience breaks.

---

## Task 6: Commit and push

Commit all changes with message: `fix: prisma generate in build for Vercel deployment`

Push to `origin main`.

---

## Done criteria

- `npm run build` succeeds locally with no errors
- `.gitignore` covers generated Prisma files
- All changes committed and pushed to GitHub
