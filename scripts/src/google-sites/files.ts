import { readdirSync } from 'node:fs';
import path from 'node:path';

export type PagePaths = { home: string; college: string; memes: string };

const PATTERNS: Record<keyof PagePaths, RegExp> = {
  home: /home/i,
  college: /college/i,
  memes: /meme/i,
};

/**
 * Locates the three saved pages in `dir`. "Webpage, Complete" saves keep the page title as the
 * file name ("The College Years.htm"), so match on a keyword rather than an exact name.
 * Explicit paths win over anything found in `dir`.
 */
export function resolvePagePaths(dir: string | undefined, explicit: Partial<PagePaths>): PagePaths {
  const files = dir ? readdirSync(dir).filter((file) => /\.html?$/i.test(file)) : [];
  const paths = {} as PagePaths;
  for (const key of Object.keys(PATTERNS) as (keyof PagePaths)[]) {
    const found = files.find((file) => PATTERNS[key].test(file));
    const chosen = explicit[key] ?? (dir && found ? path.join(dir, found) : undefined);
    if (!chosen) {
      throw new Error(
        `Could not find the ${key} page. Pass --dir with a saved copy or --${key} <file>.`,
      );
    }
    paths[key] = path.resolve(chosen);
  }
  return paths;
}
