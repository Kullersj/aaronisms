import { describe, expect, it } from 'vitest';
import { assertLocalSupabaseUrl } from '../testing/local-only';

describe('assertLocalSupabaseUrl', () => {
  it.each(['http://127.0.0.1:54321', 'http://localhost:54321', 'http://[::1]:54321'])(
    'accepts %s',
    (url) => {
      expect(() => assertLocalSupabaseUrl(url, {})).not.toThrow();
    },
  );

  it.each(['https://abcdefgh.supabase.co', 'http://localhost.evil.example', 'not a url', ''])(
    'refuses %j',
    (url) => {
      expect(() => assertLocalSupabaseUrl(url, {})).toThrow(/ALLOW_REMOTE_SUPABASE_TESTS/);
    },
  );

  it('lets ALLOW_REMOTE_SUPABASE_TESTS=1 opt out, and nothing else', () => {
    const url = 'https://abcdefgh.supabase.co';
    expect(() => assertLocalSupabaseUrl(url, { ALLOW_REMOTE_SUPABASE_TESTS: '1' })).not.toThrow();
    expect(() => assertLocalSupabaseUrl(url, { ALLOW_REMOTE_SUPABASE_TESTS: 'true' })).toThrow();
  });
});
