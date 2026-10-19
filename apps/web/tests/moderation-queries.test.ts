import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getTokenView } from '@/features/moderation/queries';
import { createModerationTokens, hashToken } from '@/features/moderation/tokens';
import { getServerEnv } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';

const PREFIX = `web-test-${randomUUID().slice(0, 8)}`;
const speakerId = randomUUID();

describe('getTokenView (against the local database)', () => {
  const admin = createAdminClient();
  const { moderatorEmails } = getServerEnv();

  beforeAll(async () => {
    const { error } = await admin
      .from('speakers')
      .insert({ id: speakerId, name: `${PREFIX} speaker`, slug: PREFIX });
    expect(error).toBeNull();
  });

  afterAll(async () => {
    await admin.from('entries').delete().like('submitted_by', `${PREFIX}%`);
    await admin.from('speakers').delete().eq('id', speakerId);
  });

  /** A real pending submission, created the way the Server Action creates it. */
  async function submit(emails = moderatorEmails, now = new Date()) {
    const tokens = createModerationTokens(emails, now);
    const { error } = await admin.rpc('create_submission', {
      p_entry_id: randomUUID(),
      p_said_on: '2032-02-02',
      p_submitted_by: `${PREFIX} submitter`,
      p_lines: [{ kind: 'line', speaker_id: speakerId, text: 'A quote for the queries test' }],
      p_tokens: tokens.map((t) => ({
        email: t.email,
        token_hash: t.tokenHash,
        expires_at: t.expiresAt.toISOString(),
      })),
    });
    expect(error).toBeNull();
    return tokens;
  }

  it('shows the entry for a fresh token', async () => {
    const [token] = await submit();
    const view = await getTokenView(token?.token ?? '');
    expect(view.state).toBe('open');
    if (view.state !== 'open') return;
    expect(view.entry.status).toBe('pending');
    expect(view.entry.submittedBy).toBe(`${PREFIX} submitter`);
    expect(view.entry.lines[0]?.text).toBe('A quote for the queries test');
    expect(view.entry.lines[0]?.speaker?.name).toBe(`${PREFIX} speaker`);
  });

  it('never changes anything just by being read', async () => {
    const [token] = await submit();
    for (let i = 0; i < 3; i++) await getTokenView(token?.token ?? '');
    const { data } = await admin
      .from('moderation_tokens')
      .select('used_at, entry:entries(status)')
      .eq('token_hash', hashToken(token?.token ?? ''))
      .single();
    expect(data?.used_at).toBeNull();
    expect(data?.entry?.status).toBe('pending');
  });

  it('reports who decided once the first decision is in', async () => {
    const tokens = await submit();
    const decided = await admin.rpc('decide_entry', {
      p_token_hash: tokens[1]?.tokenHash ?? '',
      p_allowed_emails: moderatorEmails,
      p_decision: 'approve',
    });
    expect(decided.data?.outcome).toBe('decided');
    expect(await getTokenView(tokens[0]?.token ?? '')).toEqual({
      state: 'decided',
      status: 'published',
      reviewedBy: tokens[1]?.email,
      note: null,
    });
  });

  it('reports an expired link', async () => {
    const [token] = await submit(moderatorEmails, new Date(Date.now() - 20 * 86_400_000));
    expect(await getTokenView(token?.token ?? '')).toEqual({ state: 'expired' });
  });

  it('treats malformed, unknown and removed-moderator tokens as invalid', async () => {
    expect(await getTokenView('nope')).toEqual({ state: 'invalid' });
    expect(await getTokenView('A'.repeat(43))).toEqual({ state: 'invalid' });
    const [token] = await submit(['removed@example.com']);
    expect(await getTokenView(token?.token ?? '')).toEqual({ state: 'invalid' });
  });
});
