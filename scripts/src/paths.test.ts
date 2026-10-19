import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveUserPath } from './paths';

const home = path.resolve('/home/seth');
const cwd = path.resolve('/work/aaronisms');

describe('resolveUserPath', () => {
  it('expands a leading ~ to the home folder, with either slash', () => {
    expect(resolveUserPath('~/Downloads/export', { cwd, home })).toBe(
      path.join(home, 'Downloads', 'export'),
    );
    expect(resolveUserPath('~\\Downloads', { cwd, home }).startsWith(home)).toBe(true);
    expect(resolveUserPath('~', { cwd, home })).toBe(home);
  });

  it('leaves a ~ that is part of a name alone', () => {
    expect(resolveUserPath('~backup', { cwd, home })).toBe(path.join(cwd, '~backup'));
  });

  it('resolves relative paths against the invocation folder, not the script folder', () => {
    expect(resolveUserPath('responses.csv', { cwd, home })).toBe(path.join(cwd, 'responses.csv'));
  });

  it('keeps absolute paths', () => {
    const absolute = path.resolve('/data/export');
    expect(resolveUserPath(absolute, { cwd, home })).toBe(absolute);
  });

  it('defaults to INIT_CWD when pnpm sets it', () => {
    const before = process.env.INIT_CWD;
    process.env.INIT_CWD = cwd;
    try {
      expect(resolveUserPath('export')).toBe(path.join(cwd, 'export'));
    } finally {
      if (before === undefined) delete process.env.INIT_CWD;
      else process.env.INIT_CWD = before;
    }
  });
});
