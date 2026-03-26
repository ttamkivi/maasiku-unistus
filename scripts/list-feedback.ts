/**
 * Lists all feedback entries from the database.
 * Run via: npx tsx scripts/list-feedback.ts
 */
import { db } from '../lib/db';

async function main() {
  const feedbacks = await db.userFeedback.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true, role: true } } },
  });

  if (feedbacks.length === 0) {
    console.log('\nNo feedback entries found.\n');
    return;
  }

  console.log(`\n=== ${feedbacks.length} feedback entries ===\n`);
  for (const fb of feedbacks) {
    const user = fb.user ? `${fb.user.name} (${fb.user.email})` : 'anonymous';
    const screenshot = fb.screenshotUrl ? '📎 has screenshot' : '';
    console.log(`  [${fb.status}] ${fb.type} — "${fb.message}"`);
    console.log(`    From: ${user} | Page: ${fb.page || '-'} | ${fb.createdAt.toISOString()} ${screenshot}`);
    console.log('');
  }
}

main().catch(console.error);
