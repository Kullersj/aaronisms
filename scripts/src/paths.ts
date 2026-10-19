import os from 'node:os';
import path from 'node:path';

/**
 * Resolves a path given on the command line the way the person typing it meant it. A leading `~`
 * is their home folder (Windows shells do not expand it), and a relative path is relative to the
 * folder they ran the command from: `pnpm --filter` runs scripts inside `scripts/`, but sets
 * `INIT_CWD` to where pnpm was invoked.
 */
export function resolveUserPath(
  input: string,
  { cwd = process.env.INIT_CWD ?? process.cwd(), home = os.homedir() } = {},
): string {
  const expanded = /^~(?=$|[\\/])/.test(input) ? path.join(home, input.slice(1)) : input;
  return path.resolve(cwd, expanded);
}
