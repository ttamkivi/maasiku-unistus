# Sprint 14 — Get Kaisa's invite link for manual sharing

The email to kaisatamkivi@gmail.com was NOT delivered because Resend free plan only sends to the account owner's email. We need to find the invite token so Taavi can share the registration link manually.

## Task 1: Look up the invite token

```bash
cd /Users/$(whoami)/Documents/Teachers\ feedback/fyysika-tagasiside 2>/dev/null || cd fyysika-tagasiside 2>/dev/null || true
node -e "
const { createClient } = require('@libsql/client');
const client = createClient({
  url: 'libsql://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQzNDY5MTUsImlkIjoiMDE5ZDFmNTAtZGIwMS03Y2IyLTllMGUtYjI0OTljMjBiNzY5IiwicmlkIjoiMjc5MmMxY2UtZmVjZS00NzNhLTk3MWEtYjQyODAwZDRhZjhmIn0.6Y41QrLuUo3_kyPFh07ZpRGMtzegO6GXWub6GQz9W-LsuXwxmSbcfC_UW7hE8Gv2PkHjssbjYC5kjqi7AfQcDQ'
});
client.execute('SELECT token, email, name FROM InviteToken ORDER BY createdAt DESC LIMIT 5').then(r => {
  r.rows.forEach(row => {
    const link = 'https://fyysika-tagasiside.vercel.app/auth/register?invite=' + row.token + '&email=' + encodeURIComponent(row.email);
    console.log('Name:', row.name, '| Email:', row.email);
    console.log('Link:', link);
    console.log('---');
  });
  process.exit(0);
}).catch(e => { console.error('Error:', e); process.exit(1); });
"
```

## Task 2: Print the link clearly

After running Task 1, copy the link for kaisatamkivi@gmail.com and print it clearly so Taavi can share it via WhatsApp or any other channel.
