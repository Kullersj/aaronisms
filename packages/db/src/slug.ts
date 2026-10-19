/**
 * Builds an entry slug from its date and a per-day counter: `2026-10-12-1`.
 * Undated College Years entries use a global counter instead: `college-1`.
 */
export function slugForEntry(date: string | null, n: number): string {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`Entry counter must be a positive integer, got ${n}`);
  }
  if (date === null) return `college-${n}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new RangeError(`Expected an ISO date (YYYY-MM-DD), got "${date}"`);
  }
  return `${date}-${n}`;
}

/** Lowercase, hyphenated slug for a speaker name: `Mary Jo` becomes `mary-jo`. */
export function slugForSpeaker(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
