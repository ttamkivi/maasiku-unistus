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
