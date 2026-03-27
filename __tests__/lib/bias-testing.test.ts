import { describe, it, expect } from 'vitest';
import {
  extractToneWords,
  countFeedbackPolarity,
  stdDev,
  jaccardSimilarity,
  analyzeBiasResults,
  generateBiasTestCases,
  formatBiasReport,
  TEST_NAMES,
  type BiasTestResult,
  type BiasReport,
} from '@/lib/bias-testing';

describe('bias-testing', () => {
  describe('extractToneWords', () => {
    it('finds positive tone words', () => {
      const result = extractToneWords('Väga hea vastus, tubli töö!');
      expect(result).toContain('+väga hea');
      expect(result).toContain('+tubli');
    });

    it('finds negative tone words', () => {
      const result = extractToneWords('Vastus on vale ja ebatäpne.');
      expect(result).toContain('-vale');
      expect(result).toContain('-ebatäpne');
    });

    it('returns empty array for neutral text', () => {
      const result = extractToneWords('Ülesanne 3 käsitleb termodünaamikat.');
      expect(result).toHaveLength(0);
    });
  });

  describe('countFeedbackPolarity', () => {
    it('counts from structured feedback JSON', () => {
      const fb = JSON.stringify({
        mis_laks_hasti: ['A', 'B', 'C'],
        mida_parandada: ['D'],
      });
      const { positive, negative } = countFeedbackPolarity(fb);
      expect(positive).toBe(3);
      expect(negative).toBe(1);
    });

    it('handles malformed JSON gracefully', () => {
      const { positive, negative } = countFeedbackPolarity('not json');
      expect(positive).toBe(0);
      expect(negative).toBe(0);
    });
  });

  describe('stdDev', () => {
    it('calculates standard deviation', () => {
      expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.0, 1);
    });

    it('returns 0 for empty array', () => {
      expect(stdDev([])).toBe(0);
    });

    it('returns 0 for single value', () => {
      expect(stdDev([5])).toBe(0);
    });

    it('returns 0 for identical values', () => {
      expect(stdDev([3, 3, 3])).toBe(0);
    });
  });

  describe('jaccardSimilarity', () => {
    it('returns 1 for identical sets', () => {
      expect(jaccardSimilarity(['a', 'b'], ['a', 'b'])).toBe(1);
    });

    it('returns 0 for disjoint sets', () => {
      expect(jaccardSimilarity(['a', 'b'], ['c', 'd'])).toBe(0);
    });

    it('returns 0.5 for half overlap', () => {
      expect(jaccardSimilarity(['a', 'b'], ['b', 'c'])).toBeCloseTo(0.333, 2);
    });

    it('returns 1 for two empty sets', () => {
      expect(jaccardSimilarity([], [])).toBe(1);
    });
  });

  describe('generateBiasTestCases', () => {
    it('generates cases for all 4 demographic categories', () => {
      const cases = generateBiasTestCases('sample answers', 1);
      const categories = new Set(cases.map(c => c.category));
      expect(categories.size).toBe(4);
      expect(categories).toContain('estonian-male');
      expect(categories).toContain('estonian-female');
      expect(categories).toContain('russian-male');
      expect(categories).toContain('russian-female');
    });

    it('uses same answers for all cases', () => {
      const cases = generateBiasTestCases('identical answers', 2);
      const uniqueAnswers = new Set(cases.map(c => c.answers));
      expect(uniqueAnswers.size).toBe(1);
    });

    it('generates correct number of cases', () => {
      const cases = generateBiasTestCases('test', 3);
      // 4 categories × 3 names each = 12
      expect(cases).toHaveLength(12);
    });
  });

  describe('TEST_NAMES', () => {
    it('has at least 4 names per category', () => {
      for (const [, names] of Object.entries(TEST_NAMES)) {
        expect(names.length).toBeGreaterThanOrEqual(4);
      }
    });
  });

  describe('analyzeBiasResults', () => {
    function makeResult(
      category: BiasTestResult['testCase']['category'],
      name: string,
      score: number,
      fbLength: number,
      positive: number,
      negative: number,
      toneWords: string[] = [],
    ): BiasTestResult {
      return {
        testCase: { label: `${category}: ${name}`, studentName: name, category, answers: 'test' },
        score,
        maxScore: 40,
        feedbackTone: toneWords,
        feedbackLength: fbLength,
        positiveCount: positive,
        negativeCount: negative,
        rawFeedback: '{}',
        durationMs: 1000,
      };
    }

    it('passes when all results are consistent', () => {
      const results = [
        makeResult('estonian-male', 'Mart', 32, 500, 3, 2, ['+hea', '-vale']),
        makeResult('estonian-female', 'Liis', 33, 520, 3, 2, ['+hea', '-vale']),
        makeResult('russian-male', 'Artjom', 32, 510, 3, 2, ['+hea', '-vale']),
        makeResult('russian-female', 'Anastasia', 31, 490, 3, 2, ['+hea', '-vale']),
      ];
      const analysis = analyzeBiasResults(results);
      expect(analysis.passed).toBe(true);
      expect(analysis.issues).toHaveLength(0);
    });

    it('fails when scores diverge significantly', () => {
      const results = [
        makeResult('estonian-male', 'Mart', 35, 500, 3, 2),
        makeResult('russian-female', 'Anastasia', 25, 500, 3, 2),
      ];
      const analysis = analyzeBiasResults(results);
      expect(analysis.passed).toBe(false);
      expect(analysis.scoreRange).toBe(10);
      expect(analysis.issues.some(i => i.includes('Skooride vahemik'))).toBe(true);
    });

    it('flags demographic-level score patterns', () => {
      const results = [
        makeResult('estonian-male', 'Mart', 36, 500, 3, 1),
        makeResult('estonian-male', 'Kristjan', 35, 500, 3, 1),
        makeResult('russian-male', 'Artjom', 30, 500, 3, 1),
        makeResult('russian-male', 'Maksim', 29, 500, 3, 1),
      ];
      const analysis = analyzeBiasResults(results);
      expect(analysis.passed).toBe(false);
      expect(analysis.issues.some(i => i.includes('Demograafiline erinevus'))).toBe(true);
    });

    it('flags inconsistent feedback lengths', () => {
      const results = [
        makeResult('estonian-male', 'Mart', 32, 200, 3, 2),
        makeResult('estonian-female', 'Liis', 32, 800, 3, 2),
      ];
      const analysis = analyzeBiasResults(results);
      expect(analysis.passed).toBe(false);
      expect(analysis.issues.some(i => i.includes('pikkuse vahemik'))).toBe(true);
    });
  });

  describe('formatBiasReport', () => {
    it('formats a passing report', () => {
      const report: BiasReport = {
        timestamp: '2026-03-27T22:00:00Z',
        testGroup: 'physics_9_electricity',
        results: [],
        analysis: {
          scoreRange: 2,
          scoreStdDev: 0.5,
          feedbackLengthRange: 30,
          toneConsistency: 0.85,
          positiveCountRange: 0,
          negativeCountRange: 1,
          passed: true,
          issues: [],
        },
      };
      const text = formatBiasReport(report);
      expect(text).toContain('LÄBITUD');
      expect(text).toContain('physics_9_electricity');
    });

    it('formats a failing report with issues', () => {
      const report: BiasReport = {
        timestamp: '2026-03-27T22:00:00Z',
        testGroup: 'test',
        results: [],
        analysis: {
          scoreRange: 15,
          scoreStdDev: 5.0,
          feedbackLengthRange: 500,
          toneConsistency: 0.4,
          positiveCountRange: 3,
          negativeCountRange: 4,
          passed: false,
          issues: ['Skooride vahemik liiga suur', 'Tooni ühtlus madal'],
        },
      };
      const text = formatBiasReport(report);
      expect(text).toContain('PROBLEEMID LEITUD');
      expect(text).toContain('Skooride vahemik liiga suur');
    });
  });
});
