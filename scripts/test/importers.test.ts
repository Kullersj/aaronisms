import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PendingSubmission } from '../src/form-responses';
import { insertPending } from '../src/import-form-responses';
import { writeToDatabase } from '../src/import-google-site';
import type { PlannedEntry } from '../src/google-sites/plan';
import { createServiceClient, type Db } from '../src/supabase';

// Real-database tests for the importer write paths. All rows use a per-run prefix for slugs and
// speaker names, and dates in a year (1900-1999) that seed data never uses; afterAll removes them.
const RUN = `imptest${crypto.randomUUID().slice(0, 8)}`;
const YEAR = 1900 + Math.floor(Math.random() * 100);
const day = (month: number, d: number) =>
  `${YEAR}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const DATES = { google: day(3, 4), formDup: day(5, 6), formGap: day(7, 8), formShared: day(9, 10) };

let db: Db;

const plan = (suffix: string, texts: string[], speaker = `${RUN} Alice`): PlannedEntry => ({
  slug: `${RUN}-${suffix}`,
  sectionIndex: 0,
  saidOn: DATES.google,
  era: 'modern',
  imageSrc: null,
  lines: texts.map((text, i) => ({
    position: i + 1,
    kind: 'line',
    speakerName: speaker,
    speakerLabel: null,
    text,
  })),
});

const submission = (
  saidOn: string,
  texts: string[],
  speaker = `${RUN} Bob`,
): PendingSubmission => ({
  saidOn,
  submittedBy: null,
  lines: texts.map((text, i) => ({ position: i + 1, kind: 'line', speaker, text })),
});

async function entriesOn(saidOn: string) {
  const { data, error } = await db
    .from('entries')
    .select('slug, status, published_at, entry_lines(position, text)')
    .eq('said_on', saidOn)
    .order('slug');
  expect(error).toBeNull();
  return data ?? [];
}

describe('importers against the local database', () => {
  beforeAll(() => {
    db = createServiceClient();
  });

  afterAll(async () => {
    if (!db) return;
    // entry_lines cascade with their entries.
    await db.from('entries').delete().like('slug', `${RUN}-%`);
    for (const date of Object.values(DATES)) await db.from('entries').delete().eq('said_on', date);
    await db.from('speakers').delete().like('name', `${RUN} %`);
  });

  describe('writeToDatabase (Google Sites)', () => {
    it('publishes entries with published_at and their lines', async () => {
      const plans = [
        plan('one', ['first made-up line', 'second made-up line']),
        plan('two', ['x']),
      ];
      const result = await writeToDatabase(db, plans, new Map(), [], false);
      expect(result).toMatchObject({ entriesInserted: 2, entriesSkippedExisting: 0 });

      const rows = await entriesOn(DATES.google);
      expect(rows.map((row) => row.slug)).toEqual([`${RUN}-one`, `${RUN}-two`]);
      for (const row of rows) {
        expect(row.status).toBe('published');
        expect(row.published_at).not.toBeNull();
      }
      const one = rows.find((row) => row.slug === `${RUN}-one`);
      expect(one?.entry_lines.map((line) => line.text).sort()).toEqual([
        'first made-up line',
        'second made-up line',
      ]);
      const speaker = await db.from('speakers').select('id').eq('name', `${RUN} Alice`);
      expect(speaker.data).toHaveLength(1);
    });

    it('skips entries that were already imported on a re-run', async () => {
      const plans = [
        plan('one', ['first made-up line', 'second made-up line']),
        plan('two', ['x']),
      ];
      const result = await writeToDatabase(db, plans, new Map(), [], false);
      expect(result).toMatchObject({ entriesInserted: 0, entriesSkippedExisting: 2 });
      expect(await entriesOn(DATES.google)).toHaveLength(2);
    });

    it('imports an entry whose planned slug is held by a different entry', async () => {
      const taken = { ...plan('taken', ['real imported line']), slug: `${DATES.google}-1` };
      const holder = await db
        .from('entries')
        .insert({ slug: taken.slug, said_on: DATES.google, status: 'pending' })
        .select('id')
        .single();
      expect(holder.error).toBeNull();
      await db.from('entry_lines').insert({
        entry_id: holder.data?.id ?? '',
        position: 1,
        kind: 'line',
        text: 'a form submission',
      });

      const result = await writeToDatabase(db, [taken], new Map(), [], false);
      expect(result).toMatchObject({ entriesInserted: 1, entriesSkippedExisting: 0 });
      const rows = await entriesOn(DATES.google);
      expect(rows.some((row) => row.entry_lines.some((l) => l.text === 'real imported line'))).toBe(
        true,
      );
      expect(rows.find((row) => row.slug === taken.slug)?.entry_lines[0]?.text).toBe(
        'a form submission',
      );
    });

    it('recreates a leftover entry that has no lines', async () => {
      const leftover = plan('leftover', ['rebuilt line']);
      const inserted = await db
        .from('entries')
        .insert({ slug: leftover.slug, said_on: DATES.google, era: 'modern', status: 'pending' });
      expect(inserted.error).toBeNull();

      const result = await writeToDatabase(db, [leftover], new Map(), [], false);
      expect(result).toMatchObject({ entriesInserted: 1, entriesSkippedExisting: 0 });

      const row = (await entriesOn(DATES.google)).find((entry) => entry.slug === leftover.slug);
      expect(row?.status).toBe('published');
      expect(row?.published_at).not.toBeNull();
      expect(row?.entry_lines.map((line) => line.text)).toEqual(['rebuilt line']);
    });
  });

  describe('insertPending (form responses)', () => {
    it('dedupes on same date and same ordered lines, not on one shared line', async () => {
      const both = submission(DATES.formDup, ['alpha line', 'beta line']);
      const first = await insertPending(db, [both]);
      expect(first).toEqual({ inserted: 1, skippedAlreadyOnSite: 0 });

      // Same date and same lines again: skipped.
      const again = await insertPending(db, [
        submission(DATES.formDup, ['alpha line', 'beta line']),
      ]);
      expect(again).toEqual({ inserted: 0, skippedAlreadyOnSite: 1 });

      // Only one of the lines is shared: a different quote, so it is added.
      const partial = await insertPending(db, [submission(DATES.formDup, ['alpha line'])]);
      expect(partial).toEqual({ inserted: 1, skippedAlreadyOnSite: 0 });

      // Same lines on another date are not duplicates either.
      const otherDay = await insertPending(db, [
        submission(DATES.formShared, ['alpha line', 'beta line']),
      ]);
      expect(otherDay).toEqual({ inserted: 1, skippedAlreadyOnSite: 0 });

      const rows = await entriesOn(DATES.formDup);
      expect(rows.map((row) => row.slug)).toEqual([`${DATES.formDup}-1`, `${DATES.formDup}-2`]);
      expect(rows.every((row) => row.status === 'pending')).toBe(true);
    });

    it('numbers new slugs from the highest existing suffix after a gap', async () => {
      const seeded = [1, 2, 5].map((n) => ({
        slug: `${DATES.formGap}-${n}`,
        said_on: DATES.formGap,
        status: 'pending' as const,
      }));
      expect((await db.from('entries').insert(seeded)).error).toBeNull();

      const result = await insertPending(db, [
        submission(DATES.formGap, ['gap line one']),
        submission(DATES.formGap, ['gap line two']),
      ]);
      expect(result.inserted).toBe(2);
      expect((await entriesOn(DATES.formGap)).map((row) => row.slug)).toEqual([
        `${DATES.formGap}-1`,
        `${DATES.formGap}-2`,
        `${DATES.formGap}-5`,
        `${DATES.formGap}-6`,
        `${DATES.formGap}-7`,
      ]);
    });
  });
});
