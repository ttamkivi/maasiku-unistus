import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.DATABASE_URL || 'libsql://maasiku-prod-ttamkivi.aws-eu-west-1.turso.io',
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function main() {
  console.log('=== Diagnose: why is roster empty? ===\n');

  // 1. Check all tests
  const tests = await client.execute("SELECT id, title, classId, teacherId FROM Test WHERE deletedAt IS NULL");
  console.log(`Tests (${tests.rows.length}):`);
  for (const t of tests.rows) {
    console.log(`  id: ${t.id}`);
    console.log(`  title: ${t.title}`);
    console.log(`  classId: ${t.classId || 'NULL'}`);
    console.log(`  teacherId: ${t.teacherId}`);
    console.log('');
  }

  // 2. Check teacher profiles
  const teachers = await client.execute(
    "SELECT tp.id, u.name, u.email FROM TeacherProfile tp JOIN User u ON u.id = tp.userId"
  );
  console.log(`Teacher profiles (${teachers.rows.length}):`);
  for (const t of teachers.rows) {
    console.log(`  profileId: ${t.id}, name: ${t.name}, email: ${t.email}`);
  }

  // 3. Check class 9.C
  const classes = await client.execute("SELECT id, name FROM SchoolClass");
  console.log(`\nClasses (${classes.rows.length}):`);
  for (const c of classes.rows) {
    console.log(`  id: ${c.id}, name: ${c.name}`);
  }

  // 4. Check students in class 9.C
  const classId9c = classes.rows.find(c => c.name === '9.C')?.id;
  if (classId9c) {
    const students = await client.execute({
      sql: `SELECT sp.id, sp.classId, u.name FROM StudentProfile sp JOIN User u ON u.id = sp.userId WHERE sp.classId = ?`,
      args: [classId9c],
    });
    console.log(`\nStudents in 9.C (${students.rows.length}):`);
    for (const s of students.rows) {
      console.log(`  profileId: ${s.id}, name: ${s.name}`);
    }
  }

  // 5. Check consent grants
  const consents = await client.execute(
    `SELECT cg.id, cg.studentId, cg.status, cg.scope, u.name
     FROM ConsentGrant cg
     JOIN StudentProfile sp ON sp.id = cg.studentId
     JOIN User u ON u.id = sp.userId`
  );
  console.log(`\nConsent grants (${consents.rows.length}):`);
  for (const c of consents.rows) {
    console.log(`  ${c.name}: status=${c.status}, scope=${c.scope}, studentId=${c.studentId}`);
  }

  // 6. Check active sessions
  const sessions = await client.execute(
    `SELECT s.token, u.name, u.email, u.role, tp.id as teacherProfileId
     FROM Session s
     JOIN User u ON u.id = s.userId
     LEFT JOIN TeacherProfile tp ON tp.userId = u.id
     WHERE s.expiresAt > datetime('now')
     ORDER BY s.createdAt DESC LIMIT 5`
  );
  console.log(`\nActive sessions (${sessions.rows.length}):`);
  for (const s of sessions.rows) {
    console.log(`  ${s.name} (${s.email}) role=${s.role} teacherProfileId=${s.teacherProfileId || 'NONE'}`);
  }

  console.log('\n=== Check: do test.teacherId values match a teacherProfileId above? ===');
  process.exit(0);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
