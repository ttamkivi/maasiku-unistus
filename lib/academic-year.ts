/**
 * Determines the current academic year label based on today's date.
 * Estonian school year: September 1 to August 31.
 * If today is Sep 2025 – Aug 2026, the label is "2025/26".
 */
export function getCurrentAcademicYearLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed: 0=Jan, 8=Sep

  // If September or later, school year starts this calendar year
  // If before September, school year started last calendar year
  const startYear = month >= 8 ? year : year - 1;
  const endYear = startYear + 1;
  const endShort = String(endYear).slice(-2);

  return `${startYear}/${endShort}`;
}

export function getAcademicYearDates(label: string): { startDate: Date; endDate: Date } {
  // Parse "2025/26" → startYear=2025
  const startYear = parseInt(label.split('/')[0], 10);
  return {
    startDate: new Date(`${startYear}-09-01T00:00:00Z`),
    endDate: new Date(`${startYear + 1}-08-31T23:59:59Z`),
  };
}
