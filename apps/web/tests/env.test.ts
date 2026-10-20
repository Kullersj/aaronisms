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

  it('treats every listed address, in any case, as a moderator', () => {
    const env = parseServerEnv({ ...base, RESEND_API_KEY: 're_123' });
    expect(env.isModerator('first@example.com')).toBe(true);
    expect(env.isModerator('Second@Example.com')).toBe(true);
    expect(env.isModerator('someone@example.com')).toBe(false);
    expect(env.isModerator('')).toBe(false);
  });

  it('names every missing variable', () => {
    expect(() => parseServerEnv({})).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL.*SUPABASE_SERVICE_ROLE_KEY.*SITE_URL.*MODERATOR_EMAILS/,
    );
  });

  describe('on the live Vercel deployment', () => {
    const live = {
      ...base,
      RESEND_API_KEY: 're_123',
      TURNSTILE_SECRET_KEY: '0x4AAAAAAAreal',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAAreal',
      VERCEL_ENV: 'production',
    };

    it('accepts real Turnstile keys and Resend', () => {
      expect(parseServerEnv(live).email.transport).toBe('resend');
    });

    it('rejects the Turnstile test secret and site key', () => {
      expect(() =>
        parseServerEnv({ ...live, TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' }),
      ).toThrow(/TURNSTILE_SECRET_KEY: .*test secret/);
      expect(() =>
        parseServerEnv({ ...live, NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' }),
      ).toThrow(/NEXT_PUBLIC_TURNSTILE_SITE_KEY: .*test key/);
    });

    it('rejects the SMTP transport', () => {
      expect(() => parseServerEnv({ ...live, EMAIL_TRANSPORT: 'smtp' })).toThrow(
        /EMAIL_TRANSPORT: smtp is for local testing/,
      );
    });

    it('still allows all of them outside production', () => {
      const env = parseServerEnv({
        ...live,
        VERCEL_ENV: 'preview',
        TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
        EMAIL_TRANSPORT: 'smtp',
      });
      expect(env.email.transport).toBe('smtp');
    });
  });
});
