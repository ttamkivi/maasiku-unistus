# Sprint 16 — Class 9C (3 students) + Validation Pipeline + Page Merging

## Context
Replace the old demo data (76 pages, 38 students in 9.B) with a clean 3-student demo in class 9.C. The test PDF (`kontrolltoo_9A_2024.pdf`) has 6 pages — 2 pages per student: **Liisa Tamm**, **Mari Kask**, **Anna Mägi**.

We also need to:
1. Show a **3-step validation pipeline** header on the batch-import page (scan → name match → consent check)
2. **Merge multiple pages per student** into one TestResult (currently creates one per page)
3. Clean up the old 76 duplicate TestResult records from production

**Test ID** (from the URL): `cmn4lmIzg006riz3elys2u17k`
**Production DB**: `libsql://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io`

**After every task, run `npx tsc --noEmit` to check for TypeScript errors. Fix any errors before moving to the next task.**

---

## Task 1: Create class 9C with 3 students from test PDF

Create and run a script `scripts/create-class-9c.mjs`:

The uploaded PDF (`kontrolltoo_9A_2024.pdf`) has exactly 3 students: **Liisa Tamm**, **Mari Kask**, **Anna Mägi**. Create class 9.C with only these 3 students. All 3 get parent consent.

```javascript
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.DATABASE_URL || 'libsql://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io',
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

function cuid() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `c${timestamp}${random}`;
}

async function main() {
  console.log('=== Sprint 16: Create class 9.C with 3 students ===\n');

  const testId = 'cmn4lmIzg006riz3elys2u17k';

  // Only 3 students — from the uploaded PDF kontrolltoo_9A_2024.pdf
  const names = ['Liisa Tamm', 'Mari Kask', 'Anna Mägi'];
  console.log(`Will create class 9.C with ${names.length} students: ${names.join(', ')}\n`);

  // Step 2: Find or create school
  let schoolResult = await client.execute("SELECT id FROM School LIMIT 1");
  let schoolId;
  if (schoolResult.rows.length === 0) {
    schoolId = cuid();
    await client.execute({
      sql: "INSERT INTO School (id, name, type, district) VALUES (?, 'Demo Kool', 'põhikool', 'Kesklinn')",
      args: [schoolId],
    });
    console.log('Created school: Demo Kool');
  } else {
    schoolId = schoolResult.rows[0].id;
    console.log(`Using existing school: ${schoolId}`);
  }

  // Step 3: Find the academic year 2025/26
  let yearResult = await client.execute(
    "SELECT id FROM AcademicYear WHERE label = '2025/26' AND schoolId IS NULL"
  );
  let academicYearId;
  if (yearResult.rows.length === 0) {
    academicYearId = 'ay_2025_26';
    await client.execute({
      sql: `INSERT INTO AcademicYear (id, schoolId, label, startDate, endDate, isActive)
            VALUES (?, NULL, '2025/26', '2025-09-01T00:00:00Z', '2026-08-31T23:59:59Z', 1)`,
      args: [academicYearId],
    });
    console.log('Created academic year 2025/26');
  } else {
    academicYearId = yearResult.rows[0].id;
    console.log(`Using existing academic year: ${academicYearId}`);
  }

  // Step 4: Create SchoolClass 9.C
  let classResult = await client.execute({
    sql: "SELECT id FROM SchoolClass WHERE schoolId = ? AND academicYearId = ? AND name = '9.C'",
    args: [schoolId, academicYearId],
  });
  let classId;
  if (classResult.rows.length === 0) {
    classId = cuid();
    await client.execute({
      sql: `INSERT INTO SchoolClass (id, schoolId, academicYearId, name, gradeLevel)
            VALUES (?, ?, ?, '9.C', 9)`,
      args: [classId, schoolId, academicYearId],
    });
    console.log('Created class 9.C');
  } else {
    classId = classResult.rows[0].id;
    console.log(`Class 9.C already exists: ${classId}`);
  }

  // Step 5: Create/update students and assign them to 9.C
  let created = 0;
  let updated = 0;

  for (const name of names) {
    const trimmed = String(name).trim();
    if (!trimmed) continue;

    const existingUser = await client.execute({
      sql: "SELECT id FROM User WHERE name = ? AND role = 'STUDENT'",
      args: [trimmed],
    });

    let userId;
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      await client.execute({
        sql: "UPDATE StudentProfile SET classId = ?, schoolId = ? WHERE userId = ?",
        args: [classId, schoolId, userId],
      });
      updated++;
    } else {
      userId = cuid();
      const email = `${trimmed.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')}@demo.opetajatagasiside.ee`;

      await client.execute({
        sql: `INSERT INTO User (id, email, name, role, onboardingCompleted, createdAt, updatedAt)
              VALUES (?, ?, ?, 'STUDENT', 0, datetime('now'), datetime('now'))`,
        args: [userId, email, trimmed],
      });

      const profileId = cuid();
      await client.execute({
        sql: `INSERT INTO StudentProfile (id, userId, schoolId, classId, isEligible)
              VALUES (?, ?, ?, ?, 1)`,
        args: [profileId, userId, schoolId, classId],
      });
      created++;
    }
  }

  console.log(`\nStudents: ${created} created, ${updated} moved to 9.C`);

  // Step 6: Update the test to point to class 9.C
  await client.execute({
    sql: "UPDATE Test SET classId = ? WHERE id = ?",
    args: [classId, testId],
  });
  console.log(`\nTest ${testId} updated to use class 9.C`);

  // Step 7: Verify
  const verification = await client.execute({
    sql: `SELECT COUNT(*) as count FROM StudentProfile WHERE classId = ?`,
    args: [classId],
  });
  console.log(`\nVerification: ${verification.rows[0].count} students in class 9.C`);

  console.log('\n=== Done! ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
```

Run it:
```bash
DATABASE_URL="libsql://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io" \
DATABASE_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQzNDY5MTUsImlkIjoiMDE5ZDFmNTAtZGIwMS03Y2IyLTllMGUtYjI0OTljMjBiNzY5IiwicmlkIjoiMjc5MmMxY2UtZmVjZS00NzNhLTk3MWEtYjQyODAwZDRhZjhmIn0.6Y41QrLuUo3_kyPFh07ZpRGMtzegO6GXWub6GQz9W-LsuXwxmSbcfC_UW7hE8Gv2PkHjssbjYC5kjqi7AfQcDQ" \
node scripts/create-class-9c.mjs
```

Report what happened: how many students found/created/moved.

---

## Task 2: Improve batch-import page header and validation flow

Edit `app/dashboard/tests/[id]/batch-import/page.tsx`.

### 2a. Add consent data to the roster fetch

The page currently fetches roster from `/api/tests/${testId}/roster`. We need consent status too.

First, update the `RosterStudent` interface to include consent:

```typescript
interface RosterStudent {
  id: string;
  name: string;
  hasConsent?: boolean; // true if parent has given active consent
}
```

### 2b. Create a new API endpoint for roster WITH consent

Create `app/api/tests/[id]/roster-with-consent/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getTeacherSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.teacherProfile) return null;
  return session;
}

// GET /api/tests/[id]/roster-with-consent
// Returns student list with consent status for each student
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const session = await getTeacherSession(token);
    if (!session) return NextResponse.json({ error: 'Kehtetu sessioon' }, { status: 401 });

    const teacherProfile = session.user.teacherProfile!;
    const { id } = await params;

    const test = await db.test.findFirst({
      where: { id, teacherId: teacherProfile.id, deletedAt: null },
      select: { classId: true, subjectId: true },
    });
    if (!test) return NextResponse.json({ error: 'Testi ei leitud' }, { status: 404 });

    if (!test.classId) {
      return NextResponse.json({ students: [], consentStats: { total: 0, withConsent: 0, withoutConsent: 0 } });
    }

    const students = await db.studentProfile.findMany({
      where: { classId: test.classId },
      include: {
        user: { select: { id: true, name: true } },
        consentGrants: {
          where: {
            status: 'ACTIVE',
            // If test has a subject, check for that specific subject OR ALL_SUBJECTS scope
            ...(test.subjectId ? {
              OR: [
                { scope: 'ALL_SUBJECTS' },
                { scope: 'SPECIFIC_SUBJECT', subjectId: test.subjectId },
              ],
            } : {}),
          },
          take: 1, // we just need to know if at least one active grant exists
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    const result = students.map((s) => ({
      id: s.id,
      name: s.user.name,
      hasConsent: s.consentGrants.length > 0,
    }));

    const withConsent = result.filter(s => s.hasConsent).length;

    return NextResponse.json({
      students: result,
      consentStats: {
        total: result.length,
        withConsent,
        withoutConsent: result.length - withConsent,
      },
    });
  } catch (error) {
    console.error('GET /api/tests/[id]/roster-with-consent error:', error);
    return NextResponse.json({ error: 'Serveri viga' }, { status: 500 });
  }
}
```

### 2c. Update the batch-import page to use the new endpoint and show validation pipeline

In `app/dashboard/tests/[id]/batch-import/page.tsx`, make these changes:

**1) Add consent stats state:**

```typescript
const [consentStats, setConsentStats] = useState<{ total: number; withConsent: number; withoutConsent: number } | null>(null);
```

**2) Update the roster fetch (in the useEffect) to use the new endpoint:**

Replace the existing roster fetch:
```typescript
fetch(`/api/tests/${testId}/roster`)
  .then((r) => r.ok ? r.json() : { students: [] })
  .then((d: { students: RosterStudent[] }) => setRoster(d.students))
  .catch(() => {});
```

With:
```typescript
fetch(`/api/tests/${testId}/roster-with-consent`)
  .then((r) => r.ok ? r.json() : { students: [], consentStats: null })
  .then((d: { students: RosterStudent[]; consentStats: { total: number; withConsent: number; withoutConsent: number } | null }) => {
    setRoster(d.students);
    if (d.consentStats) setConsentStats(d.consentStats);
  })
  .catch(() => {});
```

**3) Replace the existing page header (h1 + description p tag) with a clear validation pipeline header:**

Replace this block (around lines 333-339):
```tsx
<h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
  Tulemuste sisselugemine ja töötlemine
</h1>
<p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, marginTop: 0 }}>
  Lae üles skannitud PDF — AI tuvastab iga lehe õpilase nime automaatselt.
  {roster.length > 0 && ` Klass: ${roster.length} õpilast registris.`}
</p>
```

With this new validation pipeline header:

```tsx
<h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2832', marginBottom: 12 }}>
  Tulemuste sisselugemine ja valideerimine
</h1>

{/* Validation pipeline steps */}
<div style={{
  display: 'flex',
  gap: 0,
  marginBottom: 24,
  background: '#F8F3DA',
  border: '1.5px solid #DAD0A1',
  overflow: 'hidden',
}}>
  {/* Step 1: Scan */}
  <div style={{
    flex: 1,
    padding: '12px 16px',
    borderRight: '1.5px solid #DAD0A1',
    background: phase === 'rendering' || phase === 'identifying' ? '#1C2832' : phase === 'review' || phase === 'confirming' || phase === 'done' ? '#dcfce7' : '#F8F3DA',
  }}>
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      color: phase === 'rendering' || phase === 'identifying' ? '#F8F3DA' : phase === 'review' || phase === 'confirming' || phase === 'done' ? '#15803d' : '#6b7280',
      marginBottom: 4,
    }}>
      {(phase === 'review' || phase === 'confirming' || phase === 'done') ? '✓ ' : '1. '}Skaneerimine
    </div>
    <div style={{
      fontSize: 12,
      color: phase === 'rendering' || phase === 'identifying' ? '#DAD0A1' : phase === 'review' || phase === 'confirming' || phase === 'done' ? '#166534' : '#6b7280',
    }}>
      PDF → AI tuvastab nimed
    </div>
  </div>

  {/* Step 2: Name matching */}
  <div style={{
    flex: 1,
    padding: '12px 16px',
    borderRight: '1.5px solid #DAD0A1',
    background: phase === 'review' ? '#1C2832' : phase === 'confirming' || phase === 'done' ? '#dcfce7' : '#F8F3DA',
  }}>
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      color: phase === 'review' ? '#F8F3DA' : phase === 'confirming' || phase === 'done' ? '#15803d' : '#6b7280',
      marginBottom: 4,
    }}>
      {(phase === 'confirming' || phase === 'done') ? '✓ ' : '2. '}Nimede valideerimine
    </div>
    <div style={{
      fontSize: 12,
      color: phase === 'review' ? '#DAD0A1' : phase === 'confirming' || phase === 'done' ? '#166534' : '#6b7280',
    }}>
      Sobita klassi nimekirjaga
      {roster.length > 0 && ` (${roster.length} õpilast)`}
    </div>
  </div>

  {/* Step 3: Consent check */}
  <div style={{
    flex: 1,
    padding: '12px 16px',
    background: phase === 'confirming' ? '#1C2832' : phase === 'done' ? '#dcfce7' : '#F8F3DA',
  }}>
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      color: phase === 'confirming' ? '#F8F3DA' : phase === 'done' ? '#15803d' : '#6b7280',
      marginBottom: 4,
    }}>
      {phase === 'done' ? '✓ ' : '3. '}Nõusoleku kontroll
    </div>
    <div style={{
      fontSize: 12,
      color: phase === 'confirming' ? '#DAD0A1' : phase === 'done' ? '#166534' : '#6b7280',
    }}>
      Lapsevanema nõusolek
      {consentStats && ` (${consentStats.withConsent}/${consentStats.total} olemas)`}
    </div>
  </div>
</div>
```

**4) In the review phase, add consent indicators to each student card.**

In the card section (inside the grid where each assignment card is rendered), after the confidence badge (the `{roster.length > 0 && (` block around line 504-512), add a consent badge:

Find the part where the confidence badge is rendered inside the card image area and add after it:

```tsx
{/* Consent badge - show when student is matched */}
{a.matchedStudentId && (() => {
  const student = roster.find(s => s.id === a.matchedStudentId);
  if (!student) return null;
  return (
    <span style={{
      position: 'absolute', bottom: 6, right: 6,
      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
      ...(student.hasConsent
        ? { background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }
        : { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }),
    }}>
      {student.hasConsent ? '✓ Nõusolek' : '⚠ Nõusolek puudub'}
    </span>
  );
})()}
```

**5) Update the confirmation summary (around line 563-575) to include consent info:**

After the existing stats (Kindlad, Kahtlased, Leidmata, Välja jäetud), add a consent summary row:

```tsx
{consentStats && (
  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#15803d', marginTop: 8 }}>
    <span style={{ fontWeight: 600 }}>Nõusolek:</span>
    <span style={{ color: '#15803d' }}>Olemas: <strong>{(() => {
      const matched = assignments.filter(a => a.include && a.matchedStudentId);
      return matched.filter(a => roster.find(s => s.id === a.matchedStudentId)?.hasConsent).length;
    })()}</strong></span>
    <span style={{ color: '#92400e' }}>Puudub: <strong>{(() => {
      const matched = assignments.filter(a => a.include && a.matchedStudentId);
      return matched.filter(a => {
        const student = roster.find(s => s.id === a.matchedStudentId);
        return student && !student.hasConsent;
      }).length;
    })()}</strong></span>
    <span style={{ color: '#6b7280' }}>Sobitamata: <strong>{assignments.filter(a => a.include && !a.matchedStudentId).length}</strong></span>
  </div>
)}
```

---

## Task 3: Merge multiple pages per student into one TestResult

Right now every PDF page creates a separate TestResult record. So "Liisa Pihl" with 2 pages becomes 2 results. We need to group consecutive pages by the same student into ONE TestResult with multiple photos.

### 3a. Update the confirm API to accept multiple photos per student

Edit `app/api/tests/[id]/batch-import/route.ts`.

Change the confirm action's `assignments` type to accept an array of photos per student:

Replace the current confirm block (the `if (action === 'confirm')` section) with:

```typescript
    // ── CONFIRM: create TestResult records ──
    // Each assignment = one student. photos = array of base64 JPEGs (one per page).
    if (action === 'confirm') {
      const { assignments } = body as {
        assignments: Array<{
          studentName: string;
          studentId?: string | null; // matched roster student ID
          photos: string[]; // array of base64 JPEG images (one per page)
          storageMode?: string;
        }>;
      };

      if (!assignments || assignments.length === 0) {
        return NextResponse.json({ error: 'Ühtegi tulemust pole' }, { status: 400 });
      }

      const created = await Promise.all(
        assignments.map(async (a, studentIdx) => {
          // Upload all photos for this student
          const photoRecords = await Promise.all(
            a.photos.map(async (photo, pageIdx) => {
              const blobResult = await uploadPhotoToBlob(
                photo,
                `batch-${Date.now()}-s${studentIdx}-p${pageIdx}.jpg`
              );
              return blobResult
                ? { storageMode: 'blob', storageKey: blobResult.url, base64Data: null as string | null }
                : { storageMode: 'local_only', base64Data: photo };
            })
          );

          return db.testResult.create({
            data: {
              testId: id,
              studentName: a.studentName.trim(),
              studentId: a.studentId || null,
              status: 'UPLOADED',
              storageMode: photoRecords.some(p => p.storageMode === 'blob') ? 'blob' : 'local_only',
              uploadedAt: new Date(),
              photos: {
                create: photoRecords,
              },
            },
            select: { id: true, studentName: true },
          });
        })
      );

      captureServerEvent(session.user.id, 'scan_uploaded', { testId: id, count: created.length });
      return NextResponse.json({ created }, { status: 201 });
    }
```

### 3b. Update the frontend to group pages by student before confirm

In `app/dashboard/tests/[id]/batch-import/page.tsx`, replace the `handleConfirm` function.

The current version sends one entry per page. The new version groups consecutive pages by `confirmedName`, merging them into one entry with multiple photos.

Replace the existing `handleConfirm` function (around line 283) with:

```typescript
  const handleConfirm = async () => {
    const included = assignments.filter((a) => a.include && a.confirmedName.trim());
    if (included.length === 0) {
      setError('Ükski leht pole kaasatud');
      return;
    }

    // Group pages by student name — merge consecutive pages with the same confirmedName
    // into one student entry with multiple photos
    const grouped: Array<{
      studentName: string;
      studentId: string | null;
      photos: string[];
    }> = [];

    for (const a of included) {
      const name = a.confirmedName.trim();
      const lastGroup = grouped[grouped.length - 1];

      if (lastGroup && lastGroup.studentName === name) {
        // Same student as previous page — add to existing group
        lastGroup.photos.push(a.imageB64);
      } else {
        // New student (or same name but non-consecutive — treated as same student)
        // Check if this name already has a group (handles non-consecutive pages)
        const existingGroup = grouped.find(g => g.studentName === name);
        if (existingGroup) {
          existingGroup.photos.push(a.imageB64);
        } else {
          grouped.push({
            studentName: name,
            studentId: a.matchedStudentId,
            photos: [a.imageB64],
          });
        }
      }
    }

    setPhase('confirming');
    setError(null);

    try {
      const res = await fetch(`/api/tests/${testId}/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          assignments: grouped,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Loomine ebaõnnestus');
      }

      setPhase('done');
      setTimeout(() => router.push(`/dashboard/tests/${testId}`), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viga loomisel');
      setPhase('review');
    }
  };
```

### 3c. Update the review summary to show student count vs page count

In the review phase, update the summary line (around line 422-425) that shows page/inclusion counts to also show the grouped student count:

Find this line:
```tsx
<strong>{assignments.length}</strong> lehte · {includedCount} kaasatakse
```

Replace with:
```tsx
<strong>{assignments.length}</strong> lehte · {includedCount} kaasatakse · <strong>{(() => {
  const names = new Set(assignments.filter(a => a.include && a.confirmedName.trim()).map(a => a.confirmedName.trim()));
  return names.size;
})()}</strong> õpilast
```

### 3d. Update the confirm button text to show student count instead of page count

Find the confirm button (around line 594):
```tsx
Kinnita ja loo {includedCount} tulemust
```

Replace with:
```tsx
Kinnita ja loo {(() => {
  const names = new Set(assignments.filter(a => a.include && a.confirmedName.trim()).map(a => a.confirmedName.trim()));
  return names.size;
})()} õpilase tulemused ({includedCount} lehte)
```

---

## Task 4: Also delete existing duplicate TestResult records from production

The user already confirmed one batch that created 76 separate TestResult records (one per page). We need to clean those up. The confirm happened earlier so there are existing records.

Create and run `scripts/cleanup-duplicate-results.mjs`:

```javascript
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.DATABASE_URL || 'libsql://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io',
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function main() {
  const testId = 'cmn4lmIzg006riz3elys2u17k';

  // Check how many TestResult records exist for this test
  const results = await client.execute({
    sql: 'SELECT id, studentName, status FROM TestResult WHERE testId = ? ORDER BY studentName',
    args: [testId],
  });

  console.log(`Found ${results.rows.length} TestResult records for test ${testId}`);

  if (results.rows.length === 0) {
    console.log('No records to clean up.');
    process.exit(0);
  }

  // Show the duplicates
  const counts = {};
  for (const r of results.rows) {
    const name = r.studentName || '(unnamed)';
    counts[name] = (counts[name] || 0) + 1;
  }

  console.log('\nStudent name counts:');
  for (const [name, count] of Object.entries(counts)) {
    console.log(`  ${name}: ${count} records${count > 1 ? ' (DUPLICATE)' : ''}`);
  }

  // Delete ALL existing test results for this test (the user will re-scan)
  // Also delete associated WorkPhoto records first (FK constraint)
  const resultIds = results.rows.map(r => r.id);

  for (const rid of resultIds) {
    await client.execute({ sql: 'DELETE FROM WorkPhoto WHERE testResultId = ?', args: [rid] });
  }
  console.log(`\nDeleted WorkPhoto records for ${resultIds.length} test results`);

  await client.execute({ sql: 'DELETE FROM TestResult WHERE testId = ?', args: [testId] });
  console.log(`Deleted ${resultIds.length} TestResult records`);

  // Verify
  const check = await client.execute({
    sql: 'SELECT COUNT(*) as count FROM TestResult WHERE testId = ?',
    args: [testId],
  });
  console.log(`\nVerification: ${check.rows[0].count} TestResult records remaining`);
  console.log('\nDone! The teacher can now re-upload the PDF and results will be grouped by student.');
  process.exit(0);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
```

Run it:
```bash
DATABASE_URL="libsql://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io" \
DATABASE_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQzNDY5MTUsImlkIjoiMDE5ZDFmNTAtZGIwMS03Y2IyLTllMGUtYjI0OTljMjBiNzY5IiwicmlkIjoiMjc5MmMxY2UtZmVjZS00NzNhLTk3MWEtYjQyODAwZDRhZjhmIn0.6Y41QrLuUo3_kyPFh07ZpRGMtzegO6GXWub6GQz9W-LsuXwxmSbcfC_UW7hE8Gv2PkHjssbjYC5kjqi7AfQcDQ" \
node scripts/cleanup-duplicate-results.mjs
```

---

## Task 5: Verify TypeScript + build

```bash
npx tsc --noEmit
npm run build
```

Fix any errors before continuing.

---

## Task 6: Commit, push, and deploy

```bash
git add -A
git commit -m "feat: class 9C with 3 students, validation pipeline, page merging

- Create class 9.C with 3 demo students (Liisa Tamm, Mari Kask, Anna Mägi)
- Link test to class 9.C for clean name matching
- Add /api/tests/[id]/roster-with-consent endpoint (parent consent status)
- Redesign batch-import header as 3-step validation pipeline:
  1. Skaneerimine (PDF → AI name detection)
  2. Nimede valideerimine (match against class roster)
  3. Nõusoleku kontroll (parent consent check)
- Merge multiple PDF pages per student into one TestResult with multiple photos
- Show consent badges on each student card
- Clean up old duplicate TestResult records from production

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push origin main
npx vercel --prod
```

---

## What this achieves

1. **Clean 3-student demo**: Class 9.C with only Liisa Tamm, Mari Kask, Anna Mägi — matches the 6-page test PDF perfectly
2. **3-step validation pipeline** header: Scan → Name match → Consent check (with progress highlighting)
3. **Page merging**: Multiple PDF pages per student become ONE TestResult with multiple photos (no more duplicates)
4. **Consent badges**: Each student card shows green ✓ or yellow ⚠ for parent consent status
5. **Consent summary**: Confirmation step shows consent breakdown before final submission
6. **Clean production data**: Old 76 duplicate TestResult records removed
