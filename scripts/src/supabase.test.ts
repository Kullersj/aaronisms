import { afterEach, describe, expect, it, vi } from 'vitest';
import { keyRole, projectUrl, serviceTarget } from './supabase';

describe('projectUrl', () => {
  it('keeps a plain project URL', () => {
    expect(projectUrl('https://abc.supabase.co')).toBe('https://abc.supabase.co');
    expect(projectUrl('http://127.0.0.1:54321')).toBe('http://127.0.0.1:54321');
  });

  it('drops a trailing slash and the REST endpoint suffix', () => {
    expect(projectUrl('https://abc.supabase.co/')).toBe('https://abc.supabase.co');
    expect(projectUrl(' https://abc.supabase.co/rest/v1/ ')).toBe('https://abc.supabase.co');
  });

  it('rejects anything that is not a project URL', () => {
    expect(() => projectUrl('abc.supabase.co')).toThrow(/not a URL/);
    expect(() => projectUrl('https://supabase.com/dashboard/project/abc')).toThrow(/project URL/);
    expect(() => projectUrl('postgresql://postgres@db.abc.supabase.co:5432/postgres')).toThrow(
      /project URL/,
    );
  });
});

describe('serviceTarget', () => {
  afterEach(() => vi.unstubAllEnvs());
  const jwt = (role: string) =>
    `x.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.y`;

  it('returns the host for a service role key', () => {
    vi.stubEnv('SUPABASE_URL', 'https://abc.supabase.co/rest/v1');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', jwt('service_role'));
    expect(serviceTarget()).toMatchObject({
      url: 'https://abc.supabase.co',
      host: 'abc.supabase.co',
    });
    expect(keyRole('sb_secret_abc')).toBe('service_role');
  });

  it('refuses an anon key', () => {
    vi.stubEnv('SUPABASE_URL', 'https://abc.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', jwt('anon'));
    expect(() => serviceTarget()).toThrow(/not a service role key/);
  });
});
