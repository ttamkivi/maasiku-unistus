#!/usr/bin/env npx tsx
/**
 * Bias Testing Runner for Õpetaja Tagasiside
 *
 * Sends identical test answers with different student names across
 * demographic groups and checks AI scoring/feedback consistency.
 *
 * Usage:
 *   npx tsx scripts/run-bias-test.ts
 *   npx tsx scripts/run-bias-test.ts --scenario heat
 *   npx tsx scripts/run-bias-test.ts --names-per-category 3
 *
 * Requires: ANTHROPIC_API_KEY in .env.local
 */

import 'dotenv/config';
import { writeFileSync } from 'fs';
import {
  generateBiasTestCases,
  analyzeBiasResults,
  formatBiasReport,
  extractToneWords,
  countFeedbackPolarity,
  BIAS_TEST_ANSWERS,
  type BiasTestResult,
  type BiasReport,
} from '../lib/bias-testing';

// ── Config ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const scenarioArg = args.find(a => a.startsWith('--scenario='))?.split('=')[1]
  ?? (args.includes('--scenario') ? args[args.indexOf('--scenario') + 1] : undefined);
const namesArg = parseInt(
  args.find(a => a.startsWith('--names-per-category='))?.split('=')[1]
  ?? (args.includes('--names-per-category') ? args[args.indexOf('--names-per-category') + 1] : '2')
);

const scenarios = scenarioArg
  ? { [scenarioArg]: (BIAS_TEST_ANSWERS as Record<string, typeof BIAS_TEST_ANSWERS.physics_9_electricity>)[scenarioArg] }
  : BIAS_TEST_ANSWERS;

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══ Õpetaja Tagasiside — Bias Test ═══\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY not set. Add it to .env.local');
    process.exit(1);
  }

  const allReports: BiasReport[] = [];

  for (const [scenarioName, scenario] of Object.entries(scenarios)) {
    if (!scenario) {
      console.error(`Unknown scenario: ${scenarioName}`);
      continue;
    }

    console.log(`\n── Stsenaarium: ${scenarioName} ──`);
    console.log(`   Aine: ${scenario.subject}, Klass: ${scenario.grade}, Teema: ${scenario.topic}`);
    console.log(`   Max punktid: ${scenario.maxScore}`);

    const testCases = generateBiasTestCases(scenario.answers, namesArg);
    console.log(`   Testjuhtumeid: ${testCases.length}\n`);

    const results: BiasTestResult[] = [];

    for (const tc of testCases) {
      process.stdout.write(`   Testing "${tc.studentName}"... `);

      const startMs = Date.now();

      try {
        const response = await fetch('http://localhost:3000/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: scenario.subject,
            grade: scenario.grade,
            topic: scenario.topic,
            studentName: tc.studentName,
            answers: tc.answers,
            maxScore: scenario.maxScore,
            // Use text mode (no photo) for bias testing
            mode: 'text',
          }),
        });

        const data = await response.json();
        const durationMs = Date.now() - startMs;
        const rawFeedback = JSON.stringify(data.feedback ?? data);
        const polarity = countFeedbackPolarity(rawFeedback);

        const score = data.feedback?.test_info?.score
          ? parseInt(data.feedback.test_info.score)
          : null;

        const result: BiasTestResult = {
          testCase: tc,
          score,
          maxScore: scenario.maxScore,
          feedbackTone: extractToneWords(rawFeedback),
          feedbackLength: rawFeedback.length,
          positiveCount: polarity.positive,
          negativeCount: polarity.negative,
          rawFeedback,
          durationMs,
        };

        results.push(result);
        console.log(`${score ?? '?'}/${scenario.maxScore} (${durationMs}ms)`);
      } catch (error) {
        console.log(`VIGA: ${(error as Error).message}`);
        results.push({
          testCase: tc,
          score: null,
          maxScore: scenario.maxScore,
          feedbackTone: [],
          feedbackLength: 0,
          positiveCount: 0,
          negativeCount: 0,
          rawFeedback: `ERROR: ${(error as Error).message}`,
          durationMs: Date.now() - startMs,
        });
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }

    const analysis = analyzeBiasResults(results);
    const report: BiasReport = {
      timestamp: new Date().toISOString(),
      testGroup: scenarioName,
      results,
      analysis,
    };

    allReports.push(report);
    console.log('\n' + formatBiasReport(report));
  }

  // Save full report
  const reportPath = `bias-report-${new Date().toISOString().slice(0, 10)}.json`;
  writeFileSync(reportPath, JSON.stringify(allReports, null, 2));
  console.log(`\n📄 Täisaruanne salvestatud: ${reportPath}`);

  // Exit with error code if any test failed
  const allPassed = allReports.every(r => r.analysis.passed);
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
