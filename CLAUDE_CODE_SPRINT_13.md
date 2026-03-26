# Sprint 13 — Add missing 'name' column to InviteToken table in production

The Vercel logs show: `SQLite input error: no such column: main.InviteToken.name`

The InviteToken table exists in production Turso but is missing the `name` column (it was added to the Prisma schema after the table was first created).

## Task 1: Add the missing column via Turso CLI or HTTP API

Use the Turso HTTP API to add the column. Run this curl command:

```bash
curl -X POST "https://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io" \
  -H "Authorization: Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQzNDY5MTUsImlkIjoiMDE5ZDFmNTAtZGIwMS03Y2IyLTllMGUtYjI0OTljMjBiNzY5IiwicmlkIjoiMjc5MmMxY2UtZmVjZS00NzNhLTk3MWEtYjQyODAwZDRhZjhmIn0.6Y41QrLuUo3_kyPFh07ZpRGMtzegO6GXWub6GQz9W-LsuXwxmSbcfC_UW7hE8Gv2PkHjssbjYC5kjqi7AfQcDQ" \
  -H "Content-Type: application/json" \
  -d '{"statements": ["ALTER TABLE InviteToken ADD COLUMN name TEXT NOT NULL DEFAULT '\'''\''"]}'
```

If the Turso HTTP API format doesn't work, try this alternative format:

```bash
curl -X POST "https://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io/v2/pipeline" \
  -H "Authorization: Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQzNDY5MTUsImlkIjoiMDE5ZDFmNTAtZGIwMS03Y2IyLTllMGUtYjI0OTljMjBiNzY5IiwicmlkIjoiMjc5MmMxY2UtZmVjZS00NzNhLTk3MWEtYjQyODAwZDRhZjhmIn0.6Y41QrLuUo3_kyPFh07ZpRGMtzegO6GXWub6GQz9W-LsuXwxmSbcfC_UW7hE8Gv2PkHjssbjYC5kjqi7AfQcDQ" \
  -H "Content-Type: application/json" \
  -d '{"requests": [{"type": "execute", "stmt": {"sql": "ALTER TABLE InviteToken ADD COLUMN name TEXT NOT NULL DEFAULT '\''\'\''"}}, {"type": "close"}]}'
```

If curl approaches don't work, try installing turso CLI and running:

```bash
npx turso db shell maasiku-prod --location aws-eu-west-1 "ALTER TABLE InviteToken ADD COLUMN name TEXT NOT NULL DEFAULT ''"
```

Or use a Node.js script:

```bash
node -e "
const { createClient } = require('@libsql/client');
const client = createClient({
  url: 'libsql://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQzNDY5MTUsImlkIjoiMDE5ZDFmNTAtZGIwMS03Y2IyLTllMGUtYjI0OTljMjBiNzY5IiwicmlkIjoiMjc5MmMxY2UtZmVjZS00NzNhLTk3MWEtYjQyODAwZDRhZjhmIn0.6Y41QrLuUo3_kyPFh07ZpRGMtzegO6GXWub6GQz9W-LsuXwxmSbcfC_UW7hE8Gv2PkHjssbjYC5kjqi7AfQcDQ'
});
client.execute(\"ALTER TABLE InviteToken ADD COLUMN name TEXT NOT NULL DEFAULT ''\").then(r => { console.log('Success:', r); process.exit(0); }).catch(e => { console.error('Error:', e); process.exit(1); });
"
```

## Task 2: Verify the column exists

```bash
node -e "
const { createClient } = require('@libsql/client');
const client = createClient({
  url: 'libsql://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQzNDY5MTUsImlkIjoiMDE5ZDFmNTAtZGIwMS03Y2IyLTllMGUtYjI0OTljMjBiNzY5IiwicmlkIjoiMjc5MmMxY2UtZmVjZS00NzNhLTk3MWEtYjQyODAwZDRhZjhmIn0.6Y41QrLuUo3_kyPFh07ZpRGMtzegO6GXWub6GQz9W-LsuXwxmSbcfC_UW7hE8Gv2PkHjssbjYC5kjqi7AfQcDQ'
});
client.execute('PRAGMA table_info(InviteToken)').then(r => { console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); }).catch(e => { console.error('Error:', e); process.exit(1); });
"
```

This should show the `name` column in the list.

## Task 3: Test the invite endpoint

```bash
curl -s https://fyysika-tagasiside.vercel.app/api/invites
```

Should return `{"error":"Autentimine nõutav"}` (401) instead of 500.
