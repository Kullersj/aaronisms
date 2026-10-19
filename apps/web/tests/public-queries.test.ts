import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  fetchEntriesByIds,
  fetchEntryBySlug,
  fetchRandomEntrySlug,
} from '@/features/entries/queries';
import { searchEntries } from '@/features/search/queries';
import { fetchPublicSpeakers, fetchSpeakerPage } from '@/features/speakers/queries';
import { createAdminClient } from '@/lib/supabase/admin';

// Real rows in the local database, under a unique prefix so parallel tests and the seed never clash.
// Words are made up and distinct per row, so a search finds exactly the row it should.
// Search is fuzzy (trigram fallback), so the words share no letters in common positions: each is
// random letters of its own, never a shared prefix or suffix.
const ID = randomUUID().slice(0, 8);
const PREFIX = `pq-${ID}`;
function word(): string {
  return Array.from({ length: 12 }, () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
  ).join('');
}
const WORD = { published: word(), second: word(), pending: word(), rejected: word() };

const admin = createAdminClient();
const speakerA = { id: randomUUID(), name: `${word()} ${word()}`, slug: `${PREFIX}-alpha` };
const speakerB = { id: randomUUID(), name: `${word()} ${word()}`, slug: `${PREFIX}-beta` };
const speakerOnlyPending = {
  id: randomUUID(),
  name: `${word()} ${word()}`,
  slug: `${PREFIX}-hidden`,
};
const entries = {
  published: { id: randomUUID(), slug: `${PREFIX}-1`, said_on: '2031-05-05', status: 'published' },
  second: { id: randomUUID(), slug: `${PREFIX}-2`, said_on: '2031-06-06', status: 'published' },
  pending: { id: randomUUID(), slug: `${PREFIX}-3`, said_on: '2031-07-07', status: 'pending' },
  rejected: { id: randomUUID(), slug: `${PREFIX}-4`, said_on: '2031-08-08', status: 'rejected' },
} as const;

function line(entryId: string, position: number, speakerId: string | null, text: string) {
  return { entry_id: entryId, position, kind: 'line' as const, speaker_id: speakerId, text };
}

beforeAll(async () => {
  const speakers = await admin.from('speakers').insert([speakerA, speakerB, speakerOnlyPending]);
  expect(speakers.error).toBeNull();
  const rows = await admin.from('entries').insert(
    Object.values(entries).map((e) => ({
      ...e,
      published_at: e.status === 'published' ? '2031-01-01T00:00:00Z' : null,
    })),
  );
  expect(rows.error).toBeNull();
  const lines = await admin
    .from('entry_lines')
    .insert([
      line(entries.published.id, 1, speakerA.id, `A ${WORD.published} appears.`),
      line(entries.published.id, 2, speakerB.id, 'Indeed it does.'),
      line(entries.second.id, 1, speakerA.id, `The ${WORD.second} departs.`),
      line(entries.pending.id, 1, speakerOnlyPending.id, `Pending ${WORD.pending}.`),
      line(entries.pending.id, 2, speakerA.id, 'Pending line from a visible speaker.'),
      line(entries.rejected.id, 1, speakerOnlyPending.id, `Rejected ${WORD.rejected}.`),
    ]);
  expect(lines.error).toBeNull();
});

afterAll(async () => {
  await admin.from('entries').delete().like('slug', `${PREFIX}%`);
  await admin.from('speakers').delete().like('slug', `${PREFIX}%`);
});

describe('searchEntries (real database, anon role)', () => {
  it('finds a published entry by a word in its lines, with lines and speakers', async () => {
    const results = await searchEntries(WORD.published);
    expect(results.map((e) => e.slug)).toEqual([entries.published.slug]);
    expect(results[0]?.lines.map((l) => l.speaker?.name)).toEqual([speakerA.name, speakerB.name]);
  });

  it('finds an entry by a speaker name', async () => {
    const slugs = (await searchEntries(speakerB.name)).map((e) => e.slug);
    expect(slugs).toContain(entries.published.slug);
    expect(slugs).not.toContain(entries.second.slug);
  });

  it('never returns pending or rejected entries', async () => {
    expect(await searchEntries(WORD.pending)).toEqual([]);
    expect(await searchEntries(WORD.rejected)).toEqual([]);
    // The pending entry also has a line from a visible speaker; it must not leak through them.
    const slugs = (await searchEntries(speakerA.name)).map((e) => e.slug);
    expect(slugs.sort()).toEqual([entries.published.slug, entries.second.slug].sort());
  });

  it('tolerates a typo', async () => {
    const typo = `${WORD.second.slice(0, 5)}${WORD.second.slice(6)}`; // one letter missing
    expect((await searchEntries(typo)).map((e) => e.slug)).toEqual([entries.second.slug]);
  });

  it('returns nothing for blank or unmatched queries and survives odd syntax', async () => {
    expect(await searchEntries('')).toEqual([]);
    expect(await searchEntries('   ')).toEqual([]);
    expect(await searchEntries(word())).toEqual([]);
    await expect(searchEntries(`"unbalanced ${WORD.published} & | ! ( ):*`)).resolves.toBeDefined();
  });
});

describe('speaker queries (real database, anon role)', () => {
  it('lists only speakers with published lines, with public line counts', async () => {
    const speakers = await fetchPublicSpeakers();
    const mine = speakers
      .filter((s) => s.slug.startsWith(PREFIX))
      .sort((a, b) => a.slug.localeCompare(b.slug));
    expect(mine.map((s) => [s.slug, s.lineCount])).toEqual([
      [speakerA.slug, 2], // the line on the pending entry is not counted
      [speakerB.slug, 1],
    ]);
  });

  it('returns a speaker page with only published entries, newest first, and a matching count', async () => {
    const page = await fetchSpeakerPage(speakerA.slug);
    expect(page?.speaker).toMatchObject({ slug: speakerA.slug, lineCount: 2 });
    expect(page?.entries.map((e) => e.slug)).toEqual([entries.second.slug, entries.published.slug]);
    // Each entry keeps all its lines, including other speakers'.
    expect(page?.entries[1]?.lines).toHaveLength(2);
    const index = (await fetchPublicSpeakers()).find((s) => s.slug === speakerA.slug);
    expect(index?.lineCount).toBe(page?.speaker.lineCount);
  });

  it('is null for unknown speakers and for speakers with nothing published', async () => {
    expect(await fetchSpeakerPage('no-such-speaker-' + ID)).toBeNull();
    expect(await fetchSpeakerPage(speakerOnlyPending.slug)).toBeNull();
  });
});

describe('entry queries (real database, anon role)', () => {
  it('fetches published entries by slug and hides the rest', async () => {
    expect((await fetchEntryBySlug(entries.published.slug))?.id).toBe(entries.published.id);
    expect(await fetchEntryBySlug(entries.pending.slug)).toBeNull();
    expect(await fetchEntryBySlug(entries.rejected.slug)).toBeNull();
  });

  it('fetches entries by id in the requested order, skipping unpublished ones', async () => {
    const ids = [entries.second.id, entries.pending.id, entries.published.id];
    expect((await fetchEntriesByIds(ids)).map((e) => e.slug)).toEqual([
      entries.second.slug,
      entries.published.slug,
    ]);
    expect(await fetchEntriesByIds([])).toEqual([]);
  });

  it('picks only published entries at random', async () => {
    const picks = new Set<string>();
    for (let i = 0; i < 25; i++) {
      const slug = await fetchRandomEntrySlug();
      expect(slug).not.toBeNull();
      expect(slug).not.toBe(entries.pending.slug);
      expect(slug).not.toBe(entries.rejected.slug);
      picks.add(slug ?? '');
    }
    expect(picks.size).toBeGreaterThan(1);
  });

  it('never picks the excluded entry while another is published', async () => {
    for (let i = 0; i < 25; i++) {
      const slug = await fetchRandomEntrySlug(entries.published.slug);
      expect(slug).not.toBeNull();
      expect(slug).not.toBe(entries.published.slug);
      expect(slug).not.toBe(entries.pending.slug);
      expect(slug).not.toBe(entries.rejected.slug);
    }
  });
});
