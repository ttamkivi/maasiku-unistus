import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.DATABASE_URL || 'libsql://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io',
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function main() {
  console.log('=== Fix class 9.C: keep only 3 students ===\n');

  const KEEP_NAMES = ['Liisa Tamm', 'Mari Kask', 'Anna Mägi'];

  // Find class 9.C
  const classResult = await client.execute(
    "SELECT id FROM SchoolClass WHERE name = '9.C' LIMIT 1"
  );
  if (classResult.rows.length === 0) {
    console.error('Class 9.C not found!');
    process.exit(1);
  }
  const classId = classResult.rows[0].id;
  console.log(`Found class 9.C: ${classId}`);

  // Get all students in 9.C
  const students = await client.execute({
    sql: `SELECT sp.id as profileId, sp.userId, u.name
          FROM StudentProfile sp
          JOIN User u ON u.id = sp.userId
          WHERE sp.classId = ?`,
    args: [classId],
  });
  console.log(`\nCurrent students in 9.C: ${students.rows.length}`);

  const toRemove = students.rows.filter(s => !KEEP_NAMES.includes(String(s.name)));
  const toKeep = students.rows.filter(s => KEEP_NAMES.includes(String(s.name)));

  console.log(`Keeping: ${toKeep.map(s => s.name).join(', ')}`);
  console.log(`Removing from 9.C: ${toRemove.length} students\n`);

  // Remove extra students from class 9.C by setting classId to NULL
  for (const s of toRemove) {
    await client.execute({
      sql: 'UPDATE StudentProfile SET classId = NULL WHERE id = ?',
      args: [s.profileId],
    });
  }
  console.log(`Removed ${toRemove.length} students from class 9.C`);

  // Make sure the 3 students exist — create if missing
  const schoolResult = await client.execute("SELECT id FROM School LIMIT 1");
  const schoolId = schoolResult.rows[0]?.id;

  for (const name of KEEP_NAMES) {
    const exists = toKeep.find(s => String(s.name) === name);
    if (exists) {
      console.log(`  ✓ ${name} already in 9.C`);
    } else {
      // Create student
      const ts = Date.now().toString(36);
      const rnd = Math.random().toString(36).substring(2, 10);
      const userId = `c${ts}${rnd}`;
      const email = `${name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')}@demo.opetajatagasiside.ee`;

      await client.execute({
        sql: `INSERT INTO User (id, email, name, role, onboardingCompleted, createdAt, updatedAt)
              VALUES (?, ?, ?, 'STUDENT', 0, datetime('now'), datetime('now'))`,
        args: [userId, email, name],
      });

      const profileId = `c${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
      await client.execute({
        sql: `INSERT INTO StudentProfile (id, userId, schoolId, classId, isEligible)
              VALUES (?, ?, ?, ?, 1)`,
        args: [profileId, userId, schoolId, classId],
      });
      console.log(`  + Created ${name}`);
    }
  }

  // Verify
  const verify = await client.execute({
    sql: `SELECT u.name FROM StudentProfile sp JOIN User u ON u.id = sp.userId WHERE sp.classId = ? ORDER BY u.name`,
    args: [classId],
  });
  console.log(`\nFinal class 9.C roster (${verify.rows.length} students):`);
  for (const s of verify.rows) {
    console.log(`  - ${s.name}`);
  }

  console.log('\n=== Done! ===');
  process.exit(0);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
