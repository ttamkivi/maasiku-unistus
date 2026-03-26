/**
 * Lists all test titles from the database so we can match them with the seed script.
 * Run via: npx tsx scripts/list-test-titles.ts
 */
import { db } from '../lib/db';

async function main() {
  const tests = await db.test.findMany({
    select: { id: true, title: true, content: true },
    orderBy: { title: 'asc' },
  });

  console.log(`\n=== ${tests.length} tests in database ===\n`);
  for (const t of tests) {
    const hasContent = t.content ? '✅ has content' : '❌ no content';
    console.log(`  "${t.title}"  [${hasContent}]`);
  }
  console.log('');
}

main().catch(console.error);
