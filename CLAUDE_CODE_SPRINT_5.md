# Sprint 5 — Deployment Verification & Cleanup

**Priority:** HIGH — must complete before Sprint 6
**Context:** The app is deployed at fyysika-tagasiside.vercel.app. The db.ts fix (commit a0438ee) adds DATABASE_AUTH_TOKEN to the Turso adapter. We need to verify the production database has tables and data, and that everything is deployed correctly.

## Tasks

### Task 1: Verify production database has tables
Run against production Turso (use the DATABASE_URL and DATABASE_AUTH_TOKEN from .env.local):
```bash
npx prisma db push
```
This is safe to run — it creates missing tables without dropping existing ones.

### Task 2: Seed production database
Run the seed script against production:
```bash
npx tsx lib/seed.ts
```
This uses upserts so it's safe to run multiple times. It creates:
- 2 schools (Tallinna Reaalkool, Demo Kool)
- 55+ subjects from Estonian national curriculum
- Admin user (admin@opetajatagasiside.ee / Admin2024!)
- Superadmin (taavi.tamkivi@gmail.com / Superadmin2024!)
- Demo teacher (demo.opetaja@opetajatagasiside.ee / Opetaja2024!)
- Academic year 2025/2026
- Class 9.B with 38 students, parents, and consent records
- Sample test "Mehaanika kontrolltöö"

### Task 3: Push latest code to GitHub
```bash
git push origin main
```
Ensure commit a0438ee (db.ts fix) is on GitHub.

### Task 4: Redeploy to Vercel
Either:
- Trigger redeploy from Vercel dashboard (if Git integration is connected), OR
- Run `npx vercel --prod`

### Task 5: Verify the live app
After deploy, verify:
1. Landing page loads at fyysika-tagasiside.vercel.app
2. Login works with demo.opetaja@opetajatagasiside.ee / Opetaja2024!
3. No "Serveriviga" errors

### Task 6: Set NEXT_PUBLIC_BASE_URL
In Vercel environment variables, ensure:
```
NEXT_PUBLIC_BASE_URL=https://fyysika-tagasiside.vercel.app
```

### Task 7: Clean up temp files
Delete the leftover temp file from the project root:
```bash
rm -f create-teacher-guide.js
```
