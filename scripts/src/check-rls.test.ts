import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkRls, keyRole } from './check-rls';

const url = process.env.SUPABASE_URL ?? '';
const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const PREFIX = 'rls-script';
const ids = {
  speaker: crypto.randomUUID(),
  published: crypto.randomUUID(),
  pending: crypto.randomUUID(),
  rejected: crypto.randomUUID(),
};

// Real local database with a pending and a rejected entry (and a speaker used only by them) next
// to a published one, which is what the script must see through as the anon role.
describe('check:rls', () => {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  async function cleanup() {
    await admin.from('entries').delete().like('slug', `${PREFIX}-%`);
    await admin.from('speakers').delete().eq('slug', PREFIX);
  }

  beforeAll(async () => {
    await cleanup();
    await admin
      .from('speakers')
      .insert({ id: ids.speaker, name: `${PREFIX} speaker`, slug: PREFIX });
    const statuses = ['published', 'pending', 'rejected'] as const;
    const entries = statuses.map((status) => ({
      id: ids[status],
      slug: `${PREFIX}-${status}`,
      said_on: '2026-01-01',
      status,
      published_at: status === 'published' ? '2026-01-02T00:00:00Z' : null,
    }));
    expect((await admin.from('entries').insert(entries)).error).toBeNull();
    const lines = statuses.map((status) => ({
      entry_id: ids[status],
      position: 1,
      speaker_id: status === 'published' ? null : ids.speaker,
      text: `The ${status} line`,
    }));
    expect((await admin.from('entry_lines').insert(lines)).error).toBeNull();
  });

  afterAll(cleanup);

  it('passes for the anon key', async () => {
    const result = await checkRls({ url, anonKey });
    expect(result.failures).toEqual([]);
    expect(result.passed).toBeGreaterThan(30);
  });

  it('leaves the database as it found it', async () => {
    const before = await admin.from('entries').select('id', { count: 'exact', head: true });
    await checkRls({ url, anonKey });
    const after = await admin.from('entries').select('id', { count: 'exact', head: true });
    expect(after.count).toBe(before.count);
    expect((await admin.from('rate_limit_hits').select('bucket').eq('bucket', 'x')).data).toEqual(
      [],
    );
  });

  it('refuses a key that is not the anon key', async () => {
    expect(keyRole(serviceKey)).toBe('service_role');
    await expect(checkRls({ url, anonKey: serviceKey })).rejects.toThrow(/not an anon key/);
  });

  it('reports every leak when run with a privileged key', async () => {
    const { failures } = await checkRls({ url, anonKey: serviceKey, allowNonAnonKey: true });
    const names = failures.map((f) => f.check);
    expect(names).toContain('entries: only published rows are readable');
    expect(names).toContain('entry_lines: only lines of published entries are readable');
    expect(names).toContain('speakers: only speakers of published entries are readable');
    expect(names).toContain('moderation_tokens cannot be read');
    expect(names).toContain('entries.decision_note cannot be selected');
    expect(names).toContain('rpc decide_entry is not callable');
  });
});
