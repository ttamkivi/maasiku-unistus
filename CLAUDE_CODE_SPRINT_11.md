# Sprint 11 — Push InviteToken table to production database

The `/api/invites` endpoint returns 500 because the `InviteToken` table doesn't exist in the production Turso database. The model was added to the Prisma schema in Sprint 7 but `prisma db push` was never run against production.

## Task 1: Check environment variables

Look at `.env` or `.env.local` for `DATABASE_URL` and `DATABASE_AUTH_TOKEN`. The production Turso URL should look like `libsql://something.turso.io`.

If the .env file has the production Turso URL, just run:

```bash
npx prisma db push
```

If it has a local SQLite URL, you need to temporarily set the Turso production URL. Get the values from Vercel:

```bash
npx vercel env pull .env.production.local
```

Then run with the production env:

```bash
DATABASE_URL="<turso_url>" DATABASE_AUTH_TOKEN="<turso_token>" npx prisma db push
```

Replace `<turso_url>` and `<turso_token>` with the actual values from Vercel env vars.

## Task 2: Verify

After pushing, verify the table exists by checking if the invite page works at:
https://fyysika-tagasiside.vercel.app/dashboard/invites

The page should load without "Serveriviga" and show "Sa pole veel ühtegi kutset saatnud."
