import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../src/database.types';

const options = { auth: { persistSession: false } };
const PREFIX = 'search-test';

const entries = {
  both: { id: crypto.randomUUID(), text: 'A srchgourd next to a srchpumpkin' },
  gourd: { id: crypto.randomUUID(), text: 'Only a srchgourd here' },
  aaron: { id: crypto.randomUUID(), text: 'Aaron said hello' },
};

describe('search_entries', () => {
  const anon = createClient<Database>(
    process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_ANON_KEY ?? '',
    options,
  );
  const admin = createClient<Database>(
    process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    options,
  );

  // Slugs of this file's own entries in the results, so other test data cannot interfere.
  async function search(q: string): Promise<string[]> {
    const { data, error } = await anon.rpc('search_entries', { q });
    expect(error).toBeNull();
    return (data ?? []).map((e) => e.slug).filter((slug) => slug.startsWith(`${PREFIX}-`));
  }

  beforeAll(async () => {
    await cleanup();
    const rows = Object.entries(entries).map(([name, { id }]) => ({
      id,
      slug: `${PREFIX}-${name}`,
      said_on: '2026-01-01',
      status: 'published' as const,
      published_at: '2026-01-02T00:00:00Z',
    }));
    expect((await admin.from('entries').insert(rows)).error).toBeNull();
    const lines = Object.values(entries).map(({ id, text }) => ({
      entry_id: id,
      position: 1,
      text,
    }));
    expect((await admin.from('entry_lines').insert(lines)).error).toBeNull();
  });

  afterAll(cleanup);

  async function cleanup() {
    await admin.from('entries').delete().like('slug', `${PREFIX}-%`);
  }

  it('excludes -negated words, also from the typo fallback', async () => {
    expect(await search('srchgourd')).toEqual(
      expect.arrayContaining([`${PREFIX}-both`, `${PREFIX}-gourd`]),
    );
    expect(await search('srchgourd -srchpumpkin')).toEqual([`${PREFIX}-gourd`]);
    expect(await search('srchgourd -"srchpumpkin"')).toEqual([`${PREFIX}-gourd`]);
  });

  it('still finds a typo of a non-negated word', async () => {
    expect(await search('srchgord -srchpumpkin')).toEqual([`${PREFIX}-gourd`]);
  });

  it('does not use the typo fallback for queries shorter than four characters', async () => {
    expect(await search('ron')).toEqual([]);
    expect(await search('aaron')).toEqual([`${PREFIX}-aaron`]);
  });

  it('only reads the first 200 characters of the query', async () => {
    // The negation sits past the cap, so it never applies.
    const q = `srchgourd${' '.repeat(300)}-srchpumpkin`;
    expect(await search(q)).toEqual(expect.arrayContaining([`${PREFIX}-both`, `${PREFIX}-gourd`]));
    expect((await anon.rpc('search_entries', { q: 'x '.repeat(5000) })).error).toBeNull();
  });
});
