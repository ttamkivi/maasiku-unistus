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
