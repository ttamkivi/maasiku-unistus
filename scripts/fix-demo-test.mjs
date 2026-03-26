import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.DATABASE_URL || 'libsql://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io',
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

function cuid() {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 10);
  return `c${ts}${rnd}`;
}

async function main() {
  console.log('=== Fix demo: link ALL tests to class 9.C + add consent ===\n');

  // 1. Find class 9.C
  const classResult = await client.execute("SELECT id FROM SchoolClass WHERE name = '9.C' LIMIT 1");
  if (classResult.rows.length === 0) {
    console.error('Class 9.C not found! Run fix-class-9c.mjs first.');
    process.exit(1);
  }
  const classId = classResult.rows[0].id;
  console.log(`Class 9.C: ${classId}`);

  // 2. Link ALL tests (that don't have a class) to 9.C
  const tests = await client.execute("SELECT id, title, classId FROM Test WHERE deletedAt IS NULL");
  console.log(`\nFound ${tests.rows.length} tests:`);
  for (const t of tests.rows) {
    console.log(`  - ${t.title} (classId: ${t.classId || 'NONE'})`);
    if (!t.classId || t.classId !== classId) {
      await client.execute({ sql: 'UPDATE Test SET classId = ? WHERE id = ?', args: [classId, t.id] });
      console.log(`    → Linked to 9.C`);
    }
  }

  // 3. Get the 3 students in 9.C
  const students = await client.execute({
    sql: `SELECT sp.id as profileId, sp.userId, u.name
          FROM StudentProfile sp JOIN User u ON u.id = sp.userId
          WHERE sp.classId = ?`,
    args: [classId],
  });
  console.log(`\nStudents in 9.C: ${students.rows.length}`);
  for (const s of students.rows) {
    console.log(`  - ${s.name} (profileId: ${s.profileId})`);
  }

  // 4. Create parent users + consent for each student
  const teacherResult = await client.execute(
    "SELECT tp.id as teacherId FROM TeacherProfile tp LIMIT 1"
  );
  const teacherId = teacherResult.rows[0]?.teacherId;
  console.log(`\nTeacher profile: ${teacherId}`);

  // Find a subject linked to teacher
  const subjectResult = await client.execute({
    sql: "SELECT subjectId FROM TeacherSubject WHERE teacherId = ? LIMIT 1",
    args: [teacherId],
  });
  const subjectId = subjectResult.rows[0]?.subjectId || null;

  for (const student of students.rows) {
    const name = String(student.name);
    const profileId = String(student.profileId);
    const userId = String(student.userId);

    // Check if consent already exists
    const existing = await client.execute({
      sql: "SELECT id FROM ConsentGrant WHERE studentId = ? AND status = 'ACTIVE'",
      args: [profileId],
    });

    if (existing.rows.length > 0) {
      console.log(`  ✓ ${name} already has active consent`);
      continue;
    }

    // Create a parent user
    const parentId = cuid();
    const parentEmail = `parent.${name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')}@demo.opetajatagasiside.ee`;

    // Check if parent already exists
    const existingParent = await client.execute({
      sql: "SELECT id FROM User WHERE email = ?",
      args: [parentEmail],
    });

    let actualParentId;
    if (existingParent.rows.length > 0) {
      actualParentId = existingParent.rows[0].id;
    } else {
      actualParentId = parentId;
      await client.execute({
        sql: `INSERT INTO User (id, email, name, role, onboardingCompleted, createdAt, updatedAt)
              VALUES (?, ?, ?, 'PARENT', 1, datetime('now'), datetime('now'))`,
        args: [actualParentId, parentEmail, `${name} vanem`],
      });
    }

    // Create a ParentProfile if needed
    const existingProfile = await client.execute({
      sql: "SELECT id FROM ParentProfile WHERE userId = ?",
      args: [actualParentId],
    });
    let parentProfileId;
    if (existingProfile.rows.length > 0) {
      parentProfileId = existingProfile.rows[0].id;
    } else {
      parentProfileId = cuid();
      await client.execute({
        sql: `INSERT INTO ParentProfile (id, userId, email, name) VALUES (?, ?, ?, ?)`,
        args: [parentProfileId, actualParentId, parentEmail, `${name} vanem`],
      });
    }

    // Create a ConsentRequest (required FK for ConsentGrant)
    const requestId = cuid();
    const inviteToken = cuid();
    await client.execute({
      sql: `INSERT INTO ConsentRequest (id, requestedById, studentId, parentProfileId, parentEmail, inviteToken, status, sentAt, expiresAt, respondedAt)
            VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', datetime('now'), datetime('now', '+1 year'), datetime('now'))`,
      args: [requestId, teacherId, profileId, parentProfileId, parentEmail, inviteToken],
    });

    // Create consent grant
    const consentId = cuid();
    await client.execute({
      sql: `INSERT INTO ConsentGrant (id, requestId, studentId, parentId, scope, status, startDate, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, 'ALL_SUBJECTS', 'ACTIVE', datetime('now'), datetime('now'), datetime('now'))`,
      args: [consentId, requestId, profileId, parentProfileId],
    });
    console.log(`  + Created consent for ${name}`);
  }

  // 5. Also make students eligible
  await client.execute({
    sql: "UPDATE StudentProfile SET isEligible = 1 WHERE classId = ?",
    args: [classId],
  });

  // 6. Verify
  console.log('\n=== Verification ===');
  const verifyTests = await client.execute("SELECT id, title, classId FROM Test WHERE deletedAt IS NULL");
  for (const t of verifyTests.rows) {
    console.log(`Test "${t.title}" → classId: ${t.classId}`);
  }

  const verifyConsent = await client.execute({
    sql: `SELECT u.name, cg.status, cg.scope
          FROM ConsentGrant cg
          JOIN StudentProfile sp ON sp.id = cg.studentId
          JOIN User u ON u.id = sp.userId
          WHERE sp.classId = ?`,
    args: [classId],
  });
  console.log(`\nConsent records:`);
  for (const c of verifyConsent.rows) {
    console.log(`  ✓ ${c.name}: ${c.status} (${c.scope})`);
  }

  console.log('\n=== Done! Reload the batch-import page and re-upload the PDF ===');
  process.exit(0);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
