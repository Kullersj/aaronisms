import { describe, expect, it, vi } from 'vitest';
import { TURNSTILE_TEST_SECRET, verifyTurnstile } from '@/lib/turnstile';

const respond = (body: unknown, ok = true) =>
  vi.fn().mockResolvedValue({ ok, json: async () => body }) as unknown as typeof fetch;

describe('verifyTurnstile', () => {
  it('skips the network for the always-pass test secret', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    expect(await verifyTurnstile(null, TURNSTILE_TEST_SECRET, null, fetchImpl)).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects a missing token without calling Cloudflare', async () => {
    const fetchImpl = respond({ success: true });
    expect(await verifyTurnstile(null, 'secret', null, fetchImpl)).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts the secret, token and IP, and trusts only success: true', async () => {
    const fetchImpl = respond({ success: true });
    expect(await verifyTurnstile('token', 'secret', '203.0.113.5', fetchImpl)).toBe(true);
    const [url, init] = vi.mocked(fetchImpl).mock.calls[0] ?? [];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const body = init?.body as URLSearchParams;
    expect(Object.fromEntries(body)).toEqual({
      secret: 'secret',
      response: 'token',
      remoteip: '203.0.113.5',
    });
    expect(await verifyTurnstile('token', 'secret', null, respond({ success: false }))).toBe(false);
    expect(await verifyTurnstile('token', 'secret', null, respond({}))).toBe(false);
  });

  it('gives up on a slow Cloudflare', async () => {
    const fetchImpl = respond({ success: true });
    await verifyTurnstile('token', 'secret', null, fetchImpl);
    const [, init] = vi.mocked(fetchImpl).mock.calls[0] ?? [];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    const timedOut = vi.fn().mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    expect(
      await verifyTurnstile('token', 'secret', null, timedOut as unknown as typeof fetch),
    ).toBe(false);
  });

  it('fails closed on HTTP errors and network failures', async () => {
    expect(await verifyTurnstile('token', 'secret', null, respond({ success: true }, false))).toBe(
      false,
    );
    const broken = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    expect(await verifyTurnstile('token', 'secret', null, broken)).toBe(false);
  });
});
