/**
 * Cleanup script: Removes all demo test results, work photos, and scan batches
 * for the 3 seeded tests, so they can be re-seeded fresh.
 *
 * Run via: npx tsx scripts/clean-demo-results.ts
 */

import { db } from '../lib/db';

const DEMO_TEST_TITLES = [
  'Soojusõpetus — koondkontrolltöö',
  'Elektriõpetus — koondkontrolltöö',
  '9. klassi füüsika — aastalõpu koondkontrolltöö',
];

async function main() {
  console.log('\n=== Cleaning demo test results ===\n');

  for (const title of DEMO_TEST_TITLES) {
    const test = await db.test.findFirst({
      where: { title },
      include: { results: { select: { id: true } } },
    });

    if (!test) {
      console.log(`⏭ Test "${title}" not found — skipping`);
      continue;
    }

    // Delete work photos for these results
    for (const r of test.results) {
      await db.workPhoto.deleteMany({ where: { testResultId: r.id } });
    }

    // Delete results
    const deletedResults = await db.testResult.deleteMany({ where: { testId: test.id } });

    // Delete scan batches
    const deletedBatches = await db.scanBatch.deleteMany({ where: { primaryTestId: test.id } });

    // Reset test status back to READY
    await db.test.update({
      where: { id: test.id },
      data: { status: 'READY' },
    });

    console.log(`✓ "${title}": deleted ${deletedResults.count} results, ${deletedBatches.count} batches`);
  }

  console.log('\n✅ Clean! Now run the seed scripts to re-create with DRAFT status.\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
