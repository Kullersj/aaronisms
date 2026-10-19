import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../src/database.types';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const options = { auth: { persistSession: false } };
const BUCKET = 'aaronism-images';
const PREFIX = 'rls-test';
const WORD = 'zorblatt';

const ids = {
  speaker: crypto.randomUUID(),
  published: crypto.randomUUID(),
  pending: crypto.randomUUID(),
  rejected: crypto.randomUUID(),
};

describe('row-level security (anon)', () => {
  const anon = createClient<Database>(url ?? '', anonKey ?? '', options);
  const admin = createClient<Database>(url ?? '', serviceKey ?? '', options);
  const objectPath = `${PREFIX}/${ids.published}.png`;
  const entryColumns = 'id, slug, status, said_on';

  beforeAll(async () => {
    await cleanup();
    await admin
      .from('speakers')
      .insert({ id: ids.speaker, name: `${PREFIX} speaker`, slug: PREFIX });
    const entries = (['published', 'pending', 'rejected'] as const).map((status) => ({
      id: ids[status],
      slug: `${PREFIX}-${status}`,
      said_on: '2026-01-01',
      status,
      published_at: status === 'published' ? '2026-01-02T00:00:00Z' : null,
      submitter_ip: '203.0.113.9',
    }));
    expect((await admin.from('entries').insert(entries)).error).toBeNull();
    const lines = (['published', 'pending', 'rejected'] as const).map((status) => ({
      entry_id: ids[status],
      position: 1,
      speaker_id: ids.speaker,
      text: `The ${status} ${WORD} line`,
    }));
    expect((await admin.from('entry_lines').insert(lines)).error).toBeNull();
    await admin.from('moderation_tokens').insert({
      entry_id: ids.pending,
      moderator_email: 'moderator@example.com',
      token_hash: `${PREFIX}-hash`,
      expires_at: '2030-01-01T00:00:00Z',
    });
    await admin.storage.from(BUCKET).upload(objectPath, new Uint8Array([137, 80, 78, 71]), {
      contentType: 'image/png',
      upsert: true,
    });
  });

  afterAll(cleanup);

  async function cleanup() {
    await admin.from('entries').delete().like('slug', `${PREFIX}-%`);
    await admin.from('speakers').delete().eq('slug', PREFIX);
    await admin.storage.from(BUCKET).remove([objectPath]);
  }

  it('reads published entries and their lines', async () => {
    const entry = await anon.from('entries').select(entryColumns).eq('id', ids.published);
    expect(entry.data).toHaveLength(1);
    const lines = await anon.from('entry_lines').select('text').eq('entry_id', ids.published);
    expect(lines.data).toHaveLength(1);
  });

  it('cannot see pending or rejected entries or their lines', async () => {
    const entries = await anon.from('entries').select(entryColumns).like('slug', `${PREFIX}-%`);
    expect(entries.data?.map((e) => e.status)).toEqual(['published']);
    const lines = await anon
      .from('entry_lines')
      .select('entry_id')
      .in('entry_id', [ids.pending, ids.rejected]);
    expect(lines.data).toEqual([]);
  });

  it('can read speakers', async () => {
    const speakers = await anon.from('speakers').select('id').eq('id', ids.speaker);
    expect(speakers.data).toHaveLength(1);
  });

  it('cannot read private entry columns', async () => {
    expect((await anon.from('entries').select('submitter_ip')).error).not.toBeNull();
    expect((await anon.from('entries').select('submitted_by')).error).not.toBeNull();
    expect(
      (await anon.from('entries').select('decision_note, reviewed_by_email')).error,
    ).not.toBeNull();
  });

  it('cannot insert, update or delete entries', async () => {
    const insert = await anon
      .from('entries')
      .insert({ slug: `${PREFIX}-anon`, status: 'published' });
    expect(insert.error).not.toBeNull();
    expect(
      (await anon.from('entries').update({ status: 'rejected' }).eq('id', ids.published)).error,
    ).not.toBeNull();
    expect((await anon.from('entries').delete().eq('id', ids.published)).error).not.toBeNull();
    const stillThere = await admin
      .from('entries')
      .select('status')
      .eq('id', ids.published)
      .single();
    expect(stillThere.data?.status).toBe('published');
  });

  it('cannot insert, update or delete lines', async () => {
    const insert = await anon
      .from('entry_lines')
      .insert({ entry_id: ids.published, position: 9, text: 'sneaky' });
    expect(insert.error).not.toBeNull();
    expect(
      (await anon.from('entry_lines').update({ text: 'edited' }).eq('entry_id', ids.published))
        .error,
    ).not.toBeNull();
    expect(
      (await anon.from('entry_lines').delete().eq('entry_id', ids.published)).error,
    ).not.toBeNull();
  });

  it('cannot insert, update or delete speakers', async () => {
    expect(
      (await anon.from('speakers').insert({ name: 'Sneaky', slug: 'sneaky' })).error,
    ).not.toBeNull();
    expect(
      (await anon.from('speakers').update({ name: 'Renamed' }).eq('id', ids.speaker)).error,
    ).not.toBeNull();
    expect((await anon.from('speakers').delete().eq('id', ids.speaker)).error).not.toBeNull();
  });

  it('cannot read or write moderation tokens', async () => {
    expect((await anon.from('moderation_tokens').select('id')).error).not.toBeNull();
    const insert = await anon.from('moderation_tokens').insert({
      entry_id: ids.pending,
      moderator_email: 'x@example.com',
      token_hash: 'nope',
      expires_at: '2030-01-01T00:00:00Z',
    });
    expect(insert.error).not.toBeNull();
  });

  it('search_entries returns published entries only', async () => {
    const { data, error } = await anon.rpc('search_entries', { q: WORD });
    expect(error).toBeNull();
    expect(data?.map((e) => e.slug)).toEqual([`${PREFIX}-published`]);
  });

  it('search_entries tolerates a typo and blank input', async () => {
    const typo = await anon.rpc('search_entries', { q: 'zorblat' });
    expect(typo.data?.map((e) => e.slug)).toContain(`${PREFIX}-published`);
    expect((await anon.rpc('search_entries', { q: '  ' })).data).toEqual([]);
  });

  it('keeps search in sync when a line changes', async () => {
    await admin
      .from('entry_lines')
      .update({ text: 'now about quuxplanet' })
      .eq('entry_id', ids.published);
    const found = await anon.rpc('search_entries', { q: 'quuxplanet' });
    expect(found.data?.map((e) => e.slug)).toEqual([`${PREFIX}-published`]);
    const gone = await anon.rpc('search_entries', { q: WORD });
    expect(gone.data).toEqual([]);
  });

  it('random_published_entry_slug returns a published slug', async () => {
    const { data, error } = await anon.rpc('random_published_entry_slug');
    expect(error).toBeNull();
    const row = await admin
      .from('entries')
      .select('status')
      .eq('slug', data ?? '')
      .single();
    expect(row.data?.status).toBe('published');
  });

  it('cannot call internal trigger helpers', async () => {
    const { error } = await anon.rpc('refresh_entry_search', { target: ids.published });
    expect(error).not.toBeNull();
  });

  it('serves images from the public bucket but refuses anonymous writes', async () => {
    const download = await anon.storage.from(BUCKET).download(objectPath);
    expect(download.error).toBeNull();
    const publicUrl = anon.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
    expect((await fetch(publicUrl)).status).toBe(200);
    const upload = await anon.storage
      .from(BUCKET)
      .upload(`${PREFIX}/anon.png`, new Uint8Array([1]));
    expect(upload.error).not.toBeNull();
  });

  it('cannot list bucket objects', async () => {
    const listed = await anon.storage.from(BUCKET).list(PREFIX);
    expect(listed.error !== null || listed.data?.length === 0).toBe(true);
  });
});
