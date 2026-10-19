import { afterEach, describe, expect, it, vi } from 'vitest';
import { moderatorEmailsSchema, parseServerEnv } from '@/lib/env';

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

describe('parseServerEnv', () => {
  const base = {
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
    SITE_URL: 'http://localhost:3000/',
    MODERATOR_EMAILS: 'First@Example.com, second@example.com',
    TURNSTILE_SECRET_KEY: 'secret',
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'site',
    EMAIL_FROM: 'Aaronisms <noreply@example.com>',
  };

  it('uses Resend by default and needs its API key', () => {
    expect(() => parseServerEnv(base)).toThrow(/RESEND_API_KEY/);
    const env = parseServerEnv({ ...base, RESEND_API_KEY: 're_123' });
    expect(env.email).toEqual({
      transport: 'resend',
      apiKey: 're_123',
      from: 'Aaronisms <noreply@example.com>',
    });
  });

  it('sends over SMTP when asked, defaulting to the local Mailpit, with no API key', () => {
    const env = parseServerEnv({ ...base, EMAIL_TRANSPORT: 'smtp' });
    expect(env.email).toMatchObject({ transport: 'smtp', url: 'smtp://127.0.0.1:54325' });
    const custom = parseServerEnv({
      ...base,
      EMAIL_TRANSPORT: 'smtp',
      EMAIL_SMTP_URL: 'smtp://mail.test:2525',
    });
    expect(custom.email).toMatchObject({ url: 'smtp://mail.test:2525' });
  });

  it('makes the first moderator the default and trims the site URL', () => {
    const env = parseServerEnv({ ...base, RESEND_API_KEY: 're_123' });
    expect(env.moderatorEmails).toEqual(['first@example.com', 'second@example.com']);
    expect(env.defaultModerator).toBe('first@example.com');
    expect(env.siteUrl).toBe('http://localhost:3000');
  });

  it('names every missing variable', () => {
    expect(() => parseServerEnv({})).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL.*SUPABASE_SERVICE_ROLE_KEY.*SITE_URL.*MODERATOR_EMAILS/,
    );
  });
});
