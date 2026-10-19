import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReviewEntry } from '@/features/moderation/queries';
import { createModerationTokens } from '@/features/moderation/tokens';
import { getServerEnv } from '@/lib/env';
import { findMessages } from './mailpit';

const submitter = `notify-${randomUUID().slice(0, 8)}`;

const entry: ReviewEntry = {
  id: randomUUID(),
  slug: '2026-10-18-1',
  saidOn: '2026-10-18',
  era: 'modern',
  status: 'pending',
  imagePath: null,
  imageAlt: null,
  submittedBy: submitter,
  publishedAt: null,
  createdAt: '2026-10-18T00:00:00+00:00',
  lines: [
    {
      id: randomUUID(),
      position: 1,
      kind: 'line',
      speaker: { id: randomUUID(), name: 'Test Aaron', slug: 'test-aaron' },
      speakerLabel: null,
      text: 'A quote for the email',
    },
  ],
};

describe('moderationUrl', () => {
  it('links to the confirm page with the action as a query parameter', async () => {
    const { moderationUrl } = await import('@/features/moderation/notify');
    expect(moderationUrl('https://example.test', 'abc', 'edit')).toBe(
      'https://example.test/moderate/abc?action=edit',
    );
  });
});

describe('notifyModerators (sending through the local Mailpit)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('emails every moderator their own links, with the default moderator as Reply-To', async () => {
    const { notifyModerators } = await import('@/features/moderation/notify');
    const { defaultModerator, siteUrl, moderatorEmails } = getServerEnv();
    const tokens = createModerationTokens(moderatorEmails);
    await notifyModerators(entry, tokens);

    for (const token of tokens) {
      const [message] = await findMessages(token.email, submitter);
      expect(message?.Subject).toBe(`New Aaronism submitted by ${submitter}`);
      expect(message?.ReplyTo[0]?.Address).toBe(defaultModerator);
      expect(message?.HTML).toContain('A quote for the email');
      for (const action of ['approve', 'reject', 'edit']) {
        expect(message?.HTML).toContain(
          `href="${siteUrl}/moderate/${token.token}?action=${action}"`,
        );
      }
    }
  });

  it('does not throw when the mail server is unreachable, and says so in the log', async () => {
    vi.resetModules();
    vi.stubEnv('EMAIL_SMTP_URL', 'smtp://127.0.0.1:1');
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { notifyModerators } = await import('@/features/moderation/notify');
    await expect(
      notifyModerators(entry, createModerationTokens(['first@example.com'])),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith('Could not send moderation emails', expect.anything());
    vi.unstubAllEnvs();
  });
});
