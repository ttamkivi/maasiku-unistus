import { describe, it, expect } from 'vitest';
import { getCurriculumForTest, estimateTokens } from '../../lib/curriculum-filter';
import { CURRICULUM } from '../../lib/curriculum';

describe('getCurriculumForTest', () => {
  const fullTokens = estimateTokens(CURRICULUM);

  // ── Basic grade-level filtering ──

  it('returns significantly less than full curriculum for grade 9', () => {
    const trimmed = getCurriculumForTest('9');
    const trimmedTokens = estimateTokens(trimmed);
    expect(trimmedTokens).toBeLessThan(fullTokens * 0.3); // should be <30% of full
    expect(trimmedTokens).toBeGreaterThan(100); // but not empty
  });

  it('returns significantly less than full curriculum for grade 8', () => {
    const trimmed = getCurriculumForTest('8');
    const trimmedTokens = estimateTokens(trimmed);
    expect(trimmedTokens).toBeLessThan(fullTokens * 0.3);
    expect(trimmedTokens).toBeGreaterThan(100);
  });

  it('returns significantly less than full curriculum for grade 10', () => {
    const trimmed = getCurriculumForTest('10');
    const trimmedTokens = estimateTokens(trimmed);
    expect(trimmedTokens).toBeLessThan(fullTokens * 0.5);
    expect(trimmedTokens).toBeGreaterThan(100);
  });

  it('returns significantly less than full curriculum for grade 12', () => {
    const trimmed = getCurriculumForTest('12');
    const trimmedTokens = estimateTokens(trimmed);
    expect(trimmedTokens).toBeLessThan(fullTokens * 0.5);
    expect(trimmedTokens).toBeGreaterThan(100);
  });

  // ── Specific curriculum code filtering ──

  it('returns only Elektriõpetus for code F9.2.1', () => {
    const trimmed = getCurriculumForTest('9', ['F9.2.1']);
    expect(trimmed).toContain('Elektriõpetus');
    expect(trimmed).not.toContain('Kinemaatika');
    expect(trimmed).not.toContain('### F1');
    // Should NOT contain Valgusõpetus (grade 8 topic)
    expect(trimmed).not.toContain('#### Valgusõpetus');
  });

  it('returns only Soojusõpetus for code F9.1.1', () => {
    const trimmed = getCurriculumForTest('9', ['F9.1.1']);
    expect(trimmed).toContain('Soojusõpetus');
    expect(trimmed).not.toContain('#### Elektriõpetus');
    expect(trimmed).not.toContain('#### Valgusõpetus');
  });

  it('returns only Valgusõpetus for code F8.1.1', () => {
    const trimmed = getCurriculumForTest('8', ['F8.1.1']);
    expect(trimmed).toContain('Valgusõpetus');
    expect(trimmed).not.toContain('#### Mehaanika');
    expect(trimmed).not.toContain('#### Soojusõpetus');
  });

  it('returns only Mehaanika for code F8.2.1', () => {
    const trimmed = getCurriculumForTest('8', ['F8.2.1']);
    expect(trimmed).toContain('Mehaanika');
    expect(trimmed).not.toContain('#### Valgusõpetus');
  });

  it('returns F1 Kinemaatika for code F1.1.1', () => {
    const trimmed = getCurriculumForTest('10', ['F1.1.1']);
    expect(trimmed).toContain('Kinemaatika');
    expect(trimmed).not.toContain('### F2');
    expect(trimmed).not.toContain('Elektriõpetus');
  });

  it('returns F5 Elektrostaatika for code F5', () => {
    const trimmed = getCurriculumForTest('11', ['F5']);
    expect(trimmed).toContain('Elektrostaatika');
    expect(trimmed).not.toContain('### F6');
    expect(trimmed).not.toContain('Kinemaatika');
  });

  // ── Includes correct intro section ──

  it('includes põhikool intro for grades 8-9', () => {
    const trimmed = getCurriculumForTest('9');
    expect(trimmed).toContain('Kolmanda kooliastme');
    expect(trimmed).not.toContain('Gümnaasiumi lõpuks');
  });

  it('includes gümnaasium intro for grades 10-12', () => {
    const trimmed = getCurriculumForTest('10');
    expect(trimmed).toContain('Gümnaasiumi lõpuks');
    expect(trimmed).not.toContain('Kolmanda kooliastme');
  });

  // ── Topic-based narrowing ──

  it('narrows to a single section when topic matches', () => {
    const trimmedAll = getCurriculumForTest('9');
    const trimmedNarrow = getCurriculumForTest('9', undefined, 'Elektriõpetus');
    // Narrowed should be smaller than grade-level filter
    expect(estimateTokens(trimmedNarrow)).toBeLessThan(estimateTokens(trimmedAll));
    expect(trimmedNarrow).toContain('Elektriõpetus');
  });

  // ── Edge cases ──

  it('falls back to full curriculum for unknown grade', () => {
    const trimmed = getCurriculumForTest('6');
    // Unknown grade should return the full curriculum as fallback
    expect(trimmed).toBe(CURRICULUM);
  });

  it('handles empty curriculum codes array', () => {
    const trimmed = getCurriculumForTest('9', []);
    // Empty codes = grade-based filtering
    expect(trimmed).toContain('Soojusõpetus');
    expect(trimmed).toContain('Elektriõpetus');
  });

  it('handles grade with "klass" suffix', () => {
    // Test that "9. klass" → "9" normalization works
    const trimmed = getCurriculumForTest('9. klass');
    expect(trimmed).toContain('Soojusõpetus');
    expect(trimmed).not.toContain('### F1');
  });

  // ── Token savings validation ──

  it('achieves at least 70% token reduction for specific curriculum code', () => {
    const trimmed = getCurriculumForTest('9', ['F9.2.1']);
    const savings = 1 - (estimateTokens(trimmed) / fullTokens);
    expect(savings).toBeGreaterThan(0.7);
  });

  it('achieves at least 50% token reduction for grade-only filter', () => {
    const trimmed = getCurriculumForTest('9');
    const savings = 1 - (estimateTokens(trimmed) / fullTokens);
    expect(savings).toBeGreaterThan(0.5);
  });
});

describe('estimateTokens', () => {
  it('returns a positive number for non-empty text', () => {
    expect(estimateTokens('Hello world')).toBeGreaterThan(0);
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('approximates roughly 1 token per 4 chars', () => {
    const text = 'a'.repeat(400);
    expect(estimateTokens(text)).toBe(100);
  });
});
