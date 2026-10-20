import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database, Json } from '../src/database.types';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const options = { auth: { persistSession: false } };
const PREFIX = 'mod-test';
const ALLOWED = ['first@example.com', 'second@example.com'];
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

describe('moderation functions', () => {
  const anon = createClient<Database>(url ?? '', anonKey ?? '', options);
  const admin = createClient<Database>(url ?? '', serviceKey ?? '', options);
  const speakerId = crypto.randomUUID();
  const entryIds: string[] = [];

  beforeAll(async () => {
    await cleanup();
    const { error } = await admin
      .from('speakers')
      .insert({ id: speakerId, name: `${PREFIX} speaker`, slug: PREFIX });
    expect(error).toBeNull();
  });

  afterAll(cleanup);

  async function cleanup() {
    await admin.from('entries').delete().like('submitted_by', `${PREFIX}%`);
    await admin.from('speakers').delete().like('slug', `${PREFIX}%`);
    await admin.from('rate_limit_hits').delete().like('bucket', `${PREFIX}:%`);
  }

  const lines = (text: string, speaker: string = speakerId): Json => [
    { kind: 'line', speaker_id: speaker, speaker_label: null, text },
  ];

  /** A pending entry with one token per allowed moderator; returns the raw tokens by email. */
  async function submit(
    options: { expiresAt?: string; text?: string; day?: string; speaker?: string } = {},
  ) {
    const id = crypto.randomUUID();
    entryIds.push(id);
    const tokens = Object.fromEntries(ALLOWED.map((email) => [email, crypto.randomUUID()]));
    const { data, error } = await admin.rpc('create_submission', {
      p_entry_id: id,
      p_said_on: options.day ?? '2031-05-05',
      p_submitted_by: `${PREFIX} submitter`,
      p_ip: '203.0.113.7',
      p_lines: lines(options.text ?? 'A pending quote', options.speaker),
      p_tokens: ALLOWED.map((email) => ({
        email,
        token_hash: hash(tokens[email] ?? ''),
        expires_at: options.expiresAt ?? inDays(14),
      })),
    });
    expect(error).toBeNull();
    return { id, slug: data, tokens };
  }

  const decide = (
    token: string | undefined,
    decision: string,
    extra: { note?: string; allowed?: string[] } = {},
  ) =>
    admin.rpc('decide_entry', {
      p_token_hash: hash(token ?? ''),
      p_allowed_emails: extra.allowed ?? ALLOWED,
      p_decision: decision,
      p_note: extra.note,
    });

  const entryRow = (id: string) =>
    admin
      .from('entries')
      .select('status, published_at, reviewed_by_email, decision_note')
      .eq('id', id)
      .single();

  it('creates a pending entry with numbered slugs, lines and tokens', async () => {
    const first = await submit({ day: '2031-04-04' });
    const second = await submit({ day: '2031-04-04' });
    expect(first.slug).toBe('2031-04-04-1');
    expect(second.slug).toBe('2031-04-04-2');
    const tokens = await admin.from('moderation_tokens').select('id').eq('entry_id', first.id);
    expect(tokens.data).toHaveLength(ALLOWED.length);
    const saved = await admin.from('entry_lines').select('position').eq('entry_id', first.id);
    expect(saved.data).toEqual([{ position: 1 }]);
  });

  it('shows an open token without changing anything', async () => {
    const { id, tokens } = await submit();
    const state = await admin.rpc('moderation_token_state', {
      p_token_hash: hash(tokens['first@example.com'] ?? ''),
      p_allowed_emails: ALLOWED,
    });
    expect(state.data?.outcome).toBe('open');
    expect((await entryRow(id)).data?.status).toBe('pending');
  });

  it('approves: publishes, stamps the reviewer and retires every token', async () => {
    const { id, tokens } = await submit();
    const result = await decide(tokens['second@example.com'], 'approve');
    expect(result.data).toMatchObject({
      outcome: 'decided',
      status: 'published',
      reviewed_by_email: 'second@example.com',
    });
    const row = await entryRow(id);
    expect(row.data?.status).toBe('published');
    expect(row.data?.published_at).not.toBeNull();
    const open = await admin
      .from('moderation_tokens')
      .select('id')
      .eq('entry_id', id)
      .is('used_at', null);
    expect(open.data).toEqual([]);
  });

  it('rejects with a note', async () => {
    const { id, tokens } = await submit();
    const result = await decide(tokens['first@example.com'], 'reject', { note: 'Not this one' });
    expect(result.data?.outcome).toBe('decided');
    expect((await entryRow(id)).data).toMatchObject({
      status: 'rejected',
      decision_note: 'Not this one',
      reviewed_by_email: 'first@example.com',
      published_at: null,
    });
  });

  it('reports who decided when a second moderator follows up', async () => {
    const { tokens } = await submit();
    await decide(tokens['first@example.com'], 'approve');
    const late = await decide(tokens['second@example.com'], 'reject');
    expect(late.data).toMatchObject({
      outcome: 'already_decided',
      status: 'published',
      reviewed_by_email: 'first@example.com',
    });
  });

  it('refuses a second decision with the same token', async () => {
    const { id, tokens } = await submit();
    await decide(tokens['first@example.com'], 'approve');
    const again = await decide(tokens['first@example.com'], 'reject');
    expect(again.data?.outcome).toBe('already_decided');
    expect((await entryRow(id)).data?.status).toBe('published');
  });

  it('refuses an expired token and leaves the entry pending', async () => {
    const { id, tokens } = await submit({ expiresAt: inDays(-1) });
    const result = await decide(tokens['first@example.com'], 'approve');
    expect(result.data?.outcome).toBe('expired');
    expect((await entryRow(id)).data?.status).toBe('pending');
  });

  it('refuses unknown tokens and moderators no longer on the list', async () => {
    const { id, tokens } = await submit();
    expect((await decide('nope', 'approve')).data?.outcome).toBe('invalid');
    const removed = await decide(tokens['second@example.com'], 'approve', {
      allowed: ['first@example.com'],
    });
    expect(removed.data?.outcome).toBe('invalid');
    expect((await entryRow(id)).data?.status).toBe('pending');
  });

  it('rejects unknown decisions', async () => {
    const { tokens } = await submit();
    expect((await decide(tokens['first@example.com'], 'maybe')).error).not.toBeNull();
  });

  it('lets exactly one of two parallel approvals win', async () => {
    const { id, tokens } = await submit();
    const results = await Promise.all([
      decide(tokens['first@example.com'], 'approve'),
      decide(tokens['second@example.com'], 'approve'),
      decide(tokens['first@example.com'], 'reject'),
    ]);
    const outcomes = results.map((r) => r.data?.outcome).sort();
    expect(outcomes).toEqual(['already_decided', 'already_decided', 'decided']);
    const winner = results.find((r) => r.data?.outcome === 'decided')?.data;
    expect((await entryRow(id)).data?.reviewed_by_email).toBe(winner?.reviewed_by_email);
  });

  it('applies edits and the decision together, moving the slug with the date', async () => {
    const { id, tokens } = await submit({ day: '2031-06-06' });
    const result = await admin.rpc('decide_entry', {
      p_token_hash: hash(tokens['first@example.com'] ?? ''),
      p_allowed_emails: ALLOWED,
      p_decision: 'approve',
      p_said_on: '2031-06-07',
      p_lines: [
        { kind: 'context', text: 'Fixed setup' },
        { kind: 'line', speaker_id: speakerId, text: 'Fixed quote' },
      ],
    });
    expect(result.data).toMatchObject({ outcome: 'decided', entry_slug: '2031-06-07-1' });
    const saved = await admin
      .from('entry_lines')
      .select('position, kind, text')
      .eq('entry_id', id)
      .order('position');
    expect(saved.data).toEqual([
      { position: 1, kind: 'context', text: 'Fixed setup' },
      { position: 2, kind: 'line', text: 'Fixed quote' },
    ]);
  });

  it('does not edit anything when the token is not usable', async () => {
    const { id, tokens } = await submit({ expiresAt: inDays(-1), text: 'Original' });
    await admin.rpc('decide_entry', {
      p_token_hash: hash(tokens['first@example.com'] ?? ''),
      p_allowed_emails: ALLOWED,
      p_decision: 'approve',
      p_lines: [{ kind: 'line', speaker_id: speakerId, text: 'Sneaky' }],
    });
    const saved = await admin.from('entry_lines').select('text').eq('entry_id', id);
    expect(saved.data).toEqual([{ text: 'Original' }]);
  });

  it('lets the admin decide without a token, once', async () => {
    const { id } = await submit();
    const call = (decision: string) =>
      admin.rpc('decide_entry_as_admin', {
        p_entry_id: id,
        p_admin_email: 'first@example.com',
        p_decision: decision,
      });
    expect((await call('approve')).data?.outcome).toBe('decided');
    expect((await call('reject')).data?.outcome).toBe('already_decided');
    expect((await entryRow(id)).data?.status).toBe('published');
  });

  it('edits any entry atomically', async () => {
    const { id } = await submit({ day: '2031-08-08' });
    const slug = await admin.rpc('apply_entry_edits', {
      p_entry_id: id,
      p_said_on: '2031-08-09',
      p_lines: lines('Edited'),
    });
    expect(slug.data).toBe('2031-08-09-1');
    const bad = await admin.rpc('apply_entry_edits', {
      p_entry_id: id,
      p_said_on: '2031-08-10',
      p_lines: [],
    });
    expect(bad.error).not.toBeNull();
    const unchanged = await admin.from('entries').select('slug').eq('id', id).single();
    expect(unchanged.data?.slug).toBe('2031-08-09-1');
  });

  it('keeps pending entries, even after edits, away from anon', async () => {
    const newcomer = crypto.randomUUID();
    await admin
      .from('speakers')
      .insert({ id: newcomer, name: `${PREFIX} newcomer`, slug: `${PREFIX}-new` });
    const { id, tokens } = await submit({ text: 'Secret zzyzxquote', speaker: newcomer });
    await admin.rpc('apply_entry_edits', {
      p_entry_id: id,
      p_said_on: '2031-09-09',
      p_lines: lines('Edited zzyzxquote', newcomer),
    });
    expect((await anon.from('entries').select('id').eq('id', id)).data).toEqual([]);
    expect((await anon.from('entry_lines').select('id').eq('entry_id', id)).data).toEqual([]);
    expect((await anon.rpc('search_entries', { q: 'zzyzxquote' })).data).toEqual([]);
    expect((await anon.from('speakers').select('id').eq('id', newcomer)).data).toEqual([]);

    await decide(tokens['first@example.com'], 'approve');
    expect((await anon.from('entries').select('id').eq('id', id)).data).toHaveLength(1);
    expect((await anon.from('speakers').select('id').eq('id', newcomer)).data).toHaveLength(1);
  });

  it('merges one speaker into another', async () => {
    const duplicate = crypto.randomUUID();
    await admin
      .from('speakers')
      .insert({ id: duplicate, name: `${PREFIX} duplicate`, slug: `${PREFIX}-dup` });
    const { id } = await submit({ speaker: duplicate });
    const merged = await admin.rpc('merge_speakers', { p_from: duplicate, p_into: speakerId });
    expect(merged.error).toBeNull();
    const saved = await admin.from('entry_lines').select('speaker_id').eq('entry_id', id);
    expect(saved.data).toEqual([{ speaker_id: speakerId }]);
    expect((await admin.from('speakers').select('id').eq('id', duplicate)).data).toEqual([]);
    expect(
      (await admin.rpc('merge_speakers', { p_from: speakerId, p_into: speakerId })).error,
    ).not.toBeNull();
    expect(
      (await admin.rpc('merge_speakers', { p_from: speakerId, p_into: null as unknown as string }))
        .error,
    ).not.toBeNull();
  });

  it('soft-deletes an entry: marks it deleted, keeps its lines and photo, retires its links', async () => {
    const { id } = await submit();
    await admin
      .from('entries')
      .update({ image_path: `${PREFIX}/photo.png` })
      .eq('id', id);

    const deleted = await admin.rpc('delete_entry', {
      p_entry_id: id,
      p_admin_email: 'first@example.com',
    });
    expect(deleted.error).toBeNull();
    const row = await admin
      .from('entries')
      .select('status, image_path, published_at, reviewed_by_email')
      .eq('id', id)
      .single();
    expect(row.data).toEqual({
      status: 'deleted',
      image_path: `${PREFIX}/photo.png`,
      published_at: null,
      reviewed_by_email: 'first@example.com',
    });
    expect((await admin.from('entry_lines').select('id').eq('entry_id', id)).data).toHaveLength(1);
    const open = await admin
      .from('moderation_tokens')
      .select('id')
      .eq('entry_id', id)
      .is('used_at', null);
    expect(open.data).toEqual([]);
    // Anon never sees a deleted entry.
    expect((await anon.from('entries').select('id').eq('id', id)).data).toEqual([]);

    const again = await admin.rpc('delete_entry', {
      p_entry_id: id,
      p_admin_email: 'first@example.com',
    });
    expect(again.error?.code).toBe('P0002');
  });

  it('does not let anon call any moderation function', async () => {
    const calls = [
      anon.rpc('decide_entry', {
        p_token_hash: 'x',
        p_allowed_emails: ALLOWED,
        p_decision: 'approve',
      }),
      anon.rpc('decide_entry_as_admin', {
        p_entry_id: crypto.randomUUID(),
        p_admin_email: 'first@example.com',
        p_decision: 'approve',
      }),
      anon.rpc('moderation_token_state', { p_token_hash: 'x', p_allowed_emails: ALLOWED }),
      anon.rpc('apply_entry_edits', {
        p_entry_id: crypto.randomUUID(),
        p_said_on: '2031-01-01',
        p_lines: [],
      }),
      anon.rpc('merge_speakers', { p_from: speakerId, p_into: speakerId }),
      anon.rpc('delete_entry', { p_entry_id: crypto.randomUUID(), p_admin_email: 'x@example.com' }),
      anon.rpc('consume_rate_limit', {
        p_bucket: `${PREFIX}:anon`,
        p_limit: 5,
        p_window_seconds: 60,
      }),
    ];
    for (const { error } of await Promise.all(calls)) expect(error).not.toBeNull();
  });

  it('rate limits per bucket and window', async () => {
    const hit = async (bucket: string, limit = 2) =>
      (
        await admin.rpc('consume_rate_limit', {
          p_bucket: bucket,
          p_limit: limit,
          p_window_seconds: 60,
        })
      ).data;
    expect([await hit(`${PREFIX}:a`), await hit(`${PREFIX}:a`), await hit(`${PREFIX}:a`)]).toEqual([
      true,
      true,
      false,
    ]);
    expect(await hit(`${PREFIX}:b`)).toBe(true);
  });

  it('counts parallel rate limit hits exactly', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        admin.rpc('consume_rate_limit', {
          p_bucket: `${PREFIX}:parallel`,
          p_limit: 3,
          p_window_seconds: 60,
        }),
      ),
    );
    expect(results.filter((r) => r.data === true)).toHaveLength(3);
  });

  it('stays private: no anon access to rate limit rows', async () => {
    expect((await anon.from('rate_limit_hits').select('bucket')).error).not.toBeNull();
  });
});
