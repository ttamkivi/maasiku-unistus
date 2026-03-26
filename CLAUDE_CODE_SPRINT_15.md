# Sprint 15 — Teacher Yearly Configuration: School Year, Classes & Parallels

## Context
The onboarding wizard currently has 3 steps: Subjects → Students → Done.
We need to add school year tracking and a class/parallel picker so teachers can specify which classes they teach each year. This builds the foundation for a reusable test archive.

**PRD**: See `../prd-teacher-yearly-config-2026-03.md` for full product spec.

**Important**: After every task, run `npx tsc --noEmit` to check for TypeScript errors. Fix any errors before moving to the next task.

---

## Task 1: Add TeacherClassAssignment model to Prisma schema

Edit `prisma/schema.prisma`:

### 1a. Add the new model (put it after TeacherSubject):

```prisma
// Which classes a teacher teaches per subject per year.
// E.g., "Ms. Tamm teaches Füüsika to 9A, 9B, 10A in 2025/2026"
model TeacherClassAssignment {
  id              String  @id @default(cuid())
  teacherId       String
  subjectId       String
  academicYearId  String
  gradeLevel      Int     // 1-12
  parallel        String  // "A", "B", "C" etc.

  teacher      TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  subject      Subject        @relation(fields: [subjectId], references: [id])
  academicYear AcademicYear   @relation(fields: [academicYearId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([teacherId, subjectId, academicYearId, gradeLevel, parallel])
}
```

### 1b. Add the reverse relations to existing models:

In `TeacherProfile`, add:
```prisma
  classAssignments TeacherClassAssignment[]
```

In `Subject`, add:
```prisma
  classAssignments TeacherClassAssignment[]
```

In `AcademicYear`, add:
```prisma
  classAssignments TeacherClassAssignment[]
```

### 1c. Run prisma generate:
```bash
npx prisma generate
```

Do NOT run `prisma db push` — the production database uses Turso and needs manual ALTER TABLE statements. We'll handle that separately.

---

## Task 2: Create AcademicYear API + seeding endpoint

### 2a. Create helper: `lib/academic-year.ts`

```typescript
/**
 * Determines the current academic year label based on today's date.
 * Estonian school year: September 1 to August 31.
 * If today is Sep 2025 – Aug 2026, the label is "2025/26".
 */
export function getCurrentAcademicYearLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed: 0=Jan, 8=Sep

  // If September or later, school year starts this calendar year
  // If before September, school year started last calendar year
  const startYear = month >= 8 ? year : year - 1;
  const endYear = startYear + 1;
  const endShort = String(endYear).slice(-2);

  return `${startYear}/${endShort}`;
}

export function getAcademicYearDates(label: string): { startDate: Date; endDate: Date } {
  // Parse "2025/26" → startYear=2025
  const startYear = parseInt(label.split('/')[0], 10);
  return {
    startDate: new Date(`${startYear}-09-01T00:00:00Z`),
    endDate: new Date(`${startYear + 1}-08-31T23:59:59Z`),
  };
}
```

### 2b. Create API route: `app/api/academic-year/current/route.ts`

This endpoint returns the current academic year, creating it if it doesn't exist yet:

```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { getCurrentAcademicYearLabel, getAcademicYearDates } from '@/lib/academic-year';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const label = getCurrentAcademicYearLabel();

    // Find or create the system-wide academic year
    let academicYear = await db.academicYear.findFirst({
      where: { label, schoolId: null },
    });

    if (!academicYear) {
      const { startDate, endDate } = getAcademicYearDates(label);
      // Deactivate any previously active year
      await db.academicYear.updateMany({
        where: { schoolId: null, isActive: true },
        data: { isActive: false },
      });
      academicYear = await db.academicYear.create({
        data: {
          label,
          startDate,
          endDate,
          isActive: true,
          schoolId: null,
        },
      });
    }

    return NextResponse.json(academicYear);
  } catch (error) {
    console.error('GET /api/academic-year/current error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
```

---

## Task 3: Create Teacher Class Assignments API

Create `app/api/teacher/classes/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getTeacherProfile() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user.teacherProfile;
}

// GET — returns all class assignments for the teacher, optionally filtered by academicYearId
export async function GET(request: NextRequest) {
  try {
    const profile = await getTeacherProfile();
    if (!profile) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const yearId = request.nextUrl.searchParams.get('academicYearId');

    const assignments = await db.teacherClassAssignment.findMany({
      where: {
        teacherId: profile.id,
        ...(yearId ? { academicYearId: yearId } : {}),
      },
      include: { subject: true, academicYear: true },
      orderBy: [{ gradeLevel: 'asc' }, { parallel: 'asc' }],
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('GET /api/teacher/classes error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

// POST — bulk save class assignments for a given academic year
// Body: { academicYearId: string, assignments: Array<{ subjectId: string, gradeLevel: number, parallel: string }> }
export async function POST(request: NextRequest) {
  try {
    const profile = await getTeacherProfile();
    if (!profile) return NextResponse.json({ error: 'Autentimine nõutav' }, { status: 401 });

    const body = await request.json() as {
      academicYearId?: string;
      assignments?: Array<{ subjectId: string; gradeLevel: number; parallel: string }>;
    };

    if (!body.academicYearId || !Array.isArray(body.assignments)) {
      return NextResponse.json({ error: 'academicYearId ja assignments on kohustuslikud' }, { status: 400 });
    }

    // Validate academic year exists
    const year = await db.academicYear.findUnique({ where: { id: body.academicYearId } });
    if (!year) return NextResponse.json({ error: 'Õppeaastat ei leitud' }, { status: 400 });

    // Validate all subjects exist and belong to this teacher
    const teacherSubjects = await db.teacherSubject.findMany({
      where: { teacherId: profile.id },
    });
    const teacherSubjectIds = new Set(teacherSubjects.map((ts) => ts.subjectId));

    for (const a of body.assignments) {
      if (!teacherSubjectIds.has(a.subjectId)) {
        return NextResponse.json({ error: `Aine ${a.subjectId} ei ole sinu ainete hulgas` }, { status: 400 });
      }
      if (a.gradeLevel < 1 || a.gradeLevel > 12) {
        return NextResponse.json({ error: 'Klass peab olema 1-12' }, { status: 400 });
      }
      if (!a.parallel || a.parallel.length > 5) {
        return NextResponse.json({ error: 'Paralleel on kohustuslik' }, { status: 400 });
      }
    }

    // Delete existing assignments for this teacher + year, then re-create
    // This is a "replace all" approach — simpler than diffing
    await db.teacherClassAssignment.deleteMany({
      where: { teacherId: profile.id, academicYearId: body.academicYearId },
    });

    if (body.assignments.length > 0) {
      await db.teacherClassAssignment.createMany({
        data: body.assignments.map((a) => ({
          teacherId: profile.id,
          subjectId: a.subjectId,
          academicYearId: body.academicYearId,
          gradeLevel: a.gradeLevel,
          parallel: a.parallel,
        })),
      });
    }

    return NextResponse.json({ ok: true, count: body.assignments.length });
  } catch (error) {
    console.error('POST /api/teacher/classes error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
```

---

## Task 4: Update OnboardingWizard — Add Class Picker Step

Edit `app/dashboard/onboarding/OnboardingWizard.tsx`.

This is the biggest change. The wizard goes from 3 steps to 4 steps:
1. Ained (Subjects) — same as now
2. **Klassid (Classes)** — NEW
3. Õpilased (Students) — same as now
4. Lõpetamine (Done) — updated summary

### Key changes:

**a)** Change STEPS:
```typescript
const STEPS = ['Ained', 'Klassid', 'Õpilased', 'Lõpetamine'] as const;
```

**b)** Change step state type:
```typescript
const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
```

**c)** Add new state for academic year and class assignments:
```typescript
interface AcademicYear {
  id: string;
  label: string;
}

interface ClassAssignment {
  subjectId: string;
  gradeLevel: number;
  parallel: string;
}

// In the component:
const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
const [classAssignments, setClassAssignments] = useState<ClassAssignment[]>([]);
```

**d)** Fetch academic year on mount (add to existing useEffect or new one):
```typescript
useEffect(() => {
  fetch('/api/academic-year/current')
    .then((r) => r.json())
    .then((data) => { if (data.id) setAcademicYear(data); })
    .catch(() => {});
}, []);
```

**e)** After Step 0 (subjects selected), move to Step 1 (classes) instead of Step 1 (students).

**f)** The new Step 1 (Classes) UI should work like this:
- At the top, show the school year label: "Õppeaasta 2025/26" as a badge/label (not editable)
- For each selected subject, show a section with the subject name
- Under each subject, show a grid of checkboxes:
  - Rows: Grade levels (derive from the subject's `gradeLevels` string, e.g., "7-12" → show grades 7,8,9,10,11,12)
  - Columns: Parallels A, B, C (with an "+" button to add more if needed)
  - Each checkbox = one class assignment (e.g., checking "9" + "B" = 9B for that subject)
- The simplest approach: for each subject, show a list of available grade levels. For each grade level, show checkboxes for parallels A, B, C.

**Here's a concrete UI layout for the class picker:**

```
Õppeaasta 2025/26

─── FÜÜSIKA (7-12) ───
         A    B    C
  7. kl  [ ]  [ ]  [ ]
  8. kl  [ ]  [ ]  [ ]
  9. kl  [✓]  [✓]  [ ]
 10. kl  [✓]  [ ]  [ ]
 11. kl  [ ]  [ ]  [ ]
 12. kl  [ ]  [ ]  [ ]

─── KEEMIA (7-12) ───
         A    B    C
  7. kl  [ ]  [ ]  [ ]
  8. kl  [✓]  [✓]  [ ]
  ...
```

**g)** Function to parse gradeLevels string into array of numbers:
```typescript
function parseGradeLevels(gradeLevels: string): number[] {
  // Input: "7-12" or "1-6" or "7-9, 10-12"
  const result: number[] = [];
  const parts = gradeLevels.split(',').map(s => s.trim());
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) result.push(i);
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n)) result.push(n);
    }
  }
  return [...new Set(result)].sort((a, b) => a - b);
}
```

**h)** Default parallels state: `['A', 'B', 'C']` with an "Lisa paralleel +" button that adds next letter.

**i)** Toggle function for class assignments:
```typescript
function toggleAssignment(subjectId: string, gradeLevel: number, parallel: string) {
  setClassAssignments(prev => {
    const exists = prev.some(a =>
      a.subjectId === subjectId && a.gradeLevel === gradeLevel && a.parallel === parallel
    );
    if (exists) {
      return prev.filter(a =>
        !(a.subjectId === subjectId && a.gradeLevel === gradeLevel && a.parallel === parallel)
      );
    } else {
      return [...prev, { subjectId, gradeLevel, parallel }];
    }
  });
}
```

**j)** Save function when clicking "Next" on Step 1:
```typescript
async function handleSaveClasses() {
  if (!academicYear) {
    setError('Õppeaastat ei leitud');
    return;
  }
  if (classAssignments.length === 0) {
    setError('Vali vähemalt üks klass');
    return;
  }
  setLoading(true);
  setError(null);
  try {
    const res = await fetch('/api/teacher/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        academicYearId: academicYear.id,
        assignments: classAssignments,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Viga klasside salvestamisel');
    }
    setStep(2); // Move to students step
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Viga klasside salvestamisel');
  } finally {
    setLoading(false);
  }
}
```

**k)** Update all step references:
- What was step 1 (Students) becomes step 2
- What was step 2 (Done) becomes step 3
- The Done step should show both subjects AND class assignments in the summary

**l)** In the Done/summary step (now step 3), update the summary to show:
```
✓ Ained: Füüsika, Keemia
✓ Klassid: 9A, 9B, 10A (Füüsika), 8A, 8B (Keemia)
✓ Õppeaasta: 2025/26
→ Kontrolltöö saad luua töölaualt
```

### Styling:
- Use the same `card` style as other steps
- Checkbox grid: use CSS grid or a table with consistent column widths
- Grade labels: "7. kl", "8. kl" etc.
- Parallel headers: "A", "B", "C" centered above columns
- Checked state: same dark green (#22c55e) as other checkmarks in the app
- Academic year badge: cream background (#F8F3DA) with dark text, shown at the top of the step

---

## Task 5: Add "Minu klassid" settings page

Create `app/dashboard/classes/page.tsx` — a page where teachers can adjust their class assignments after onboarding.

This page should:
1. Fetch current academic year from `/api/academic-year/current`
2. Fetch teacher's subjects from `/api/teacher/subjects`
3. Fetch existing class assignments from `/api/teacher/classes?academicYearId=...`
4. Show the same grid UI as the onboarding step 2, pre-populated with existing assignments
5. Have a "Salvesta" (Save) button that POSTs to `/api/teacher/classes`
6. Show success/error feedback
7. Style: same card-based layout as onboarding

---

## Task 6: Add "Klassid" nav link to teacher dashboard

Edit the teacher navigation (look for nav items like "Kontrolltööd", "Load", "Kutsu" etc.) and add a "Klassid" link that goes to `/dashboard/classes`.

Place it logically — after "Minu klass" if that exists, or after "Kontrolltööd".

---

## Task 7: Migrate production database

**IMPORTANT**: Since we use Turso (libsql), we CANNOT use `prisma db push`. We must run ALTER TABLE statements directly.

Create a one-time migration script `scripts/migrate-sprint-15.mjs`:

```javascript
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.DATABASE_URL || 'libsql://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io',
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function migrate() {
  console.log('Sprint 15 migration: Creating TeacherClassAssignment table + AcademicYear seed...');

  // 1. Create TeacherClassAssignment table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS TeacherClassAssignment (
      id TEXT PRIMARY KEY,
      teacherId TEXT NOT NULL,
      subjectId TEXT NOT NULL,
      academicYearId TEXT NOT NULL,
      gradeLevel INTEGER NOT NULL,
      parallel TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacherId) REFERENCES TeacherProfile(id) ON DELETE CASCADE,
      FOREIGN KEY (subjectId) REFERENCES Subject(id),
      FOREIGN KEY (academicYearId) REFERENCES AcademicYear(id)
    )
  `);
  console.log('✓ TeacherClassAssignment table created');

  // 2. Create unique index
  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS TeacherClassAssignment_unique
    ON TeacherClassAssignment(teacherId, subjectId, academicYearId, gradeLevel, parallel)
  `);
  console.log('✓ Unique index created');

  // 3. Seed the current academic year (2025/26) if not exists
  const existing = await client.execute(
    "SELECT id FROM AcademicYear WHERE label = '2025/26' AND schoolId IS NULL"
  );

  if (existing.rows.length === 0) {
    const id = 'ay_2025_26'; // deterministic ID for easy reference
    await client.execute({
      sql: `INSERT INTO AcademicYear (id, schoolId, label, startDate, endDate, isActive)
            VALUES (?, NULL, '2025/26', '2025-09-01T00:00:00Z', '2026-08-31T23:59:59Z', 1)`,
      args: [id],
    });
    console.log('✓ Academic year 2025/26 seeded');
  } else {
    console.log('✓ Academic year 2025/26 already exists');
  }

  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

Run it:
```bash
node scripts/migrate-sprint-15.mjs
```

---

## Task 8: Verify everything works

1. Run `npx tsc --noEmit` — must pass with no errors
2. Run `npm run build` — must succeed
3. Test locally with `npm run dev`:
   - Go to `/dashboard/onboarding` — should see 4-step wizard
   - Step 1: select a subject
   - Step 2: see the class grid, check some boxes, click next
   - Step 3: students (same as before)
   - Step 4: summary should show subjects AND classes
4. Test `/dashboard/classes` page — should show same grid, pre-populated

---

## Task 9: Commit, push, and deploy

```bash
git add -A
git commit -m "feat: add school year + class/parallel picker to onboarding

- Add TeacherClassAssignment model to Prisma schema
- Create academic year helper + auto-detect current year
- Create /api/academic-year/current endpoint
- Create /api/teacher/classes endpoint (GET + bulk POST)
- Extend onboarding wizard: 3 steps → 4 steps with class grid picker
- Add /dashboard/classes settings page for adjusting classes anytime
- Add 'Klassid' nav link to teacher dashboard
- Add production migration script for Turso

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push origin main
npx vercel --prod
```

After deploy, run the migration script against production:
```bash
DATABASE_URL="libsql://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io" \
DATABASE_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQzNDY5MTUsImlkIjoiMDE5ZDFmNTAtZGIwMS03Y2IyLTllMGUtYjI0OTljMjBiNzY5IiwicmlkIjoiMjc5MmMxY2UtZmVjZS00NzNhLTk3MWEtYjQyODAwZDRhZjhmIn0.6Y41QrLuUo3_kyPFh07ZpRGMtzegO6GXWub6GQz9W-LsuXwxmSbcfC_UW7hE8Gv2PkHjssbjYC5kjqi7AfQcDQ" \
node scripts/migrate-sprint-15.mjs
```
