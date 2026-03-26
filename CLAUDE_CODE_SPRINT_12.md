# Sprint 12 — Push schema to PRODUCTION Turso database

The InviteToken table doesn't exist in the production Turso database. Previous `prisma db push` ran against local SQLite instead of production.

## Task 1: Push schema to production Turso

Run this exact command with the production Turso credentials:

```bash
DATABASE_URL="libsql://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io" DATABASE_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQzNDY5MTUsImlkIjoiMDE5ZDFmNTAtZGIwMS03Y2IyLTllMGUtYjI0OTljMjBiNzY5IiwicmlkIjoiMjc5MmMxY2UtZmVjZS00NzNhLTk3MWEtYjQyODAwZDRhZjhmIn0.6Y41QrLuUo3_kyPFh07ZpRGMtzegO6GXWub6GQz9W-LsuXwxmSbcfC_UW7hE8Gv2PkHjssbjYC5kjqi7AfQcDQ" npx prisma db push
```

This will sync the Prisma schema (including InviteToken and any other missing tables) to the production Turso database.

## Task 2: Verify

After pushing, test the endpoint:

```bash
curl -s https://fyysika-tagasiside.vercel.app/api/invites | head -c 200
```

If the table exists now, this should return `{"error":"Autentimine nõutav"}` (401) instead of `{"error":"Serveriviga"}` (500).
