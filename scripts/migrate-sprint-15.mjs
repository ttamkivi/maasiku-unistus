import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.DATABASE_URL || 'libsql://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io',
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function migrate() {
  console.log('Sprint 15 migration: Creating TeacherClassAssignment table + AcademicYear seed...');

  // 1. Create TeacherClassAssignment table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "TeacherClassAssignment" (
      "id" TEXT PRIMARY KEY,
      "teacherId" TEXT NOT NULL,
      "subjectId" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL,
      "gradeLevel" INTEGER NOT NULL,
      "parallel" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE,
      FOREIGN KEY ("subjectId") REFERENCES "Subject"("id"),
      FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id")
    )
  `);
  console.log('  TeacherClassAssignment table created');

  // 2. Create unique index
  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS "TeacherClassAssignment_unique"
    ON "TeacherClassAssignment"("teacherId", "subjectId", "academicYearId", "gradeLevel", "parallel")
  `);
  console.log('  Unique index created');

  // 3. Seed the current academic year (2025/26) if not exists
  const existing = await client.execute(
    "SELECT id FROM AcademicYear WHERE label = '2025/26' AND schoolId IS NULL"
  );

  if (existing.rows.length === 0) {
    const id = 'ay_2025_26';
    await client.execute({
      sql: `INSERT INTO AcademicYear (id, schoolId, label, startDate, endDate, isActive)
            VALUES (?, NULL, '2025/26', '2025-09-01T00:00:00Z', '2026-08-31T23:59:59Z', 1)`,
      args: [id],
    });
    console.log('  Academic year 2025/26 seeded');
  } else {
    console.log('  Academic year 2025/26 already exists');
  }

  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
