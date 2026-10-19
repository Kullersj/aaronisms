import { afterEach, describe, expect, it, vi } from 'vitest';
import { moderatorEmailsSchema } from '@/lib/env';

describe('moderatorEmailsSchema', () => {
  it('splits, trims, lowercases and de-duplicates', () => {
    const result = moderatorEmailsSchema.parse(
      ' Seth@Example.com, friend@example.com ,seth@example.com',
    );
    expect(result).toEqual(['seth@example.com', 'friend@example.com']);
  });

  it('keeps the first address first', () => {
    expect(moderatorEmailsSchema.parse('b@example.com,a@example.com')[0]).toBe('b@example.com');
  });

  it('rejects an empty list', () => {
    expect(moderatorEmailsSchema.safeParse(' , ').success).toBe(false);
  });

  it('rejects invalid addresses', () => {
    expect(moderatorEmailsSchema.safeParse('ok@example.com, nope').success).toBe(false);
  });
});

describe('getPublicEnv', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
  });

  it('needs only the two public Supabase variables', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { getPublicEnv } = await import('@/lib/env');
    expect(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL).toBe('http://127.0.0.1:54321');
  });

  it('names the missing variables', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { getPublicEnv } = await import('@/lib/env');
    expect(() => getPublicEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });
});
