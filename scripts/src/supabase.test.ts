import { describe, expect, it } from 'vitest';
import { projectUrl } from './supabase';

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
