export const ESTONIAN_GRADING_RULES = `# Eesti hindamissüsteem

## Kümnepallisüsteem (10-point scale — used in grades 5–9 and gymnasium)

Percentage → Grade mapping (TRK hindamisjuhend + riiklik norm):
- 95–100% → 10 (väga hea / suurepärane)
- 90–94%  → 9  (väga hea)
- 85–89%  → 8  (hea)
- 75–84%  → 7  (hea)
- 70–74%  → 6  (rahuldav)
- 60–69%  → 5  (rahuldav)
- 50–59%  → 4  (rahuldav/kasin)
- 40–49%  → 3  (puudulik)
- 20–39%  → 2  (puudulik)
- 0–19%   → 1  (nõrk/arvestamata)

## Viiepalliline süsteem (5-point scale — also used)
- 5 = väga hea (90–100%)
- 4 = hea (75–89%)
- 3 = rahuldav (50–74%)
- 2 = puudulik (20–49%)
- 1 = nõrk (0–19%)

## Mitteeristav hindamine
Some Estonian schools use pass/fail (arvestatud/mittearvestatud) for certain subjects or portfolio work.

## Grading rules from TRK hindamisjuhend:
1. The grade reflects mastery of learning outcomes — NOT effort or behaviour
2. Written tests must include detailed feedback alongside the grade
3. A student has the right to an improved grade (järeltöö) after additional learning
4. The teacher must communicate grading criteria BEFORE the test, not after
5. Partial credit (poolpunktid) is allowed and encouraged for multi-step problems
6. Handwritten tests: if handwriting is illegible — the answer cannot be awarded points without teacher judgment

## What the AI must do:
- Detect if the test paper shows a total score, percentage, or grade written by the teacher
- If a scoring rubric was provided: use it exactly — do NOT deviate
- If no rubric: use the percentage → grade table above to suggest a grade
- Report grade ONLY in test_info.score — never repeat or emphasize the grade in the feedback text
- If grading scale is ambiguous: note it in markmed_opetajale and ask teacher to confirm
`;
