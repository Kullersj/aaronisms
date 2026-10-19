import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { parseDateText } from './parse';

export type FoundImage = { bytes: Buffer; contentType: string; extension: string };

const TYPES = [
  {
    contentType: 'image/png',
    extension: 'png',
    test: (b: Buffer) => b.subarray(1, 4).toString() === 'PNG',
  },
  {
    contentType: 'image/jpeg',
    extension: 'jpg',
    test: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8,
  },
  {
    contentType: 'image/gif',
    extension: 'gif',
    test: (b: Buffer) => b.subarray(0, 3).toString() === 'GIF',
  },
  {
    contentType: 'image/webp',
    extension: 'webp',
    test: (b: Buffer) =>
      b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
  },
];

/** Saved images often have no file extension, so identify them by their first bytes. */
export function sniffImage(bytes: Buffer): Omit<FoundImage, 'bytes'> | null {
  const match = TYPES.find((type) => type.test(bytes));
  return match ? { contentType: match.contentType, extension: match.extension } : null;
}

/** True when a saved file plausibly is the image `name`; Chrome sometimes truncates long names. */
function sameImage(name: string, file: string): boolean {
  const stem = file.replace(/\.[a-z0-9]{2,4}$/i, '');
  if (name === file || name === stem) return true;
  return (
    Math.min(name.length, stem.length) >= 16 && (name.startsWith(stem) || stem.startsWith(name))
  );
}

async function readImage(file: string): Promise<FoundImage | null> {
  if (!existsSync(file)) return null;
  const bytes = await readFile(file);
  const type = sniffImage(bytes);
  return type ? { bytes, ...type } : null;
}

async function download(url: string): Promise<FoundImage | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    const type = sniffImage(bytes);
    return type ? { bytes, ...type } : null;
  } catch {
    return null;
  }
}

export type PageKey = 'home' | 'the-college-years' | 'dont-let-your-memes-be-dreams';

const manifestSchema = z.array(
  z.object({
    page: z.enum(['home', 'the-college-years', 'dont-let-your-memes-be-dreams']),
    date: z.string().nullable(),
    sectionIndex: z.number().int(),
    order: z.number().int(),
    file: z.string(),
    url: z.string(),
  }),
);

export type ManifestItem = z.infer<typeof manifestSchema>[number];

/** Reads `manifest.json` written by `fetch-google-site-images.mjs`; empty if there is none. */
export async function loadManifest(imagesDir: string | undefined): Promise<ManifestItem[]> {
  const file = imagesDir && path.join(imagesDir, 'manifest.json');
  if (!file || !existsSync(file)) return [];
  return manifestSchema.parse(JSON.parse(await readFile(file, 'utf8')));
}

export type ImageContext = {
  /** Folder of the saved page, for relative `src` paths. */
  pageDir: string;
  /** Folder of downloaded images, with or without a manifest. */
  imagesDir?: string | undefined;
  manifest: ManifestItem[];
};

export type ImageRef = {
  page: PageKey;
  sectionIndex: number;
  /** ISO date of the entry, or null. */
  saidOn: string | null;
  /** Position of the image within its section. */
  order: number;
  src: string;
};

/**
 * Finds the bytes for an image. Tries, in order: the manifest (page + section index, with the
 * date as a sanity check), the remote URL, the path relative to the saved page, then any
 * matching file in `imagesDir`. Returns null when nothing is found; callers log and carry on.
 */
export async function findImage(ref: ImageRef, ctx: ImageContext): Promise<FoundImage | null> {
  const { imagesDir } = ctx;
  const item = ctx.manifest.find(
    (m) =>
      m.page === ref.page &&
      m.sectionIndex === ref.sectionIndex &&
      m.order === ref.order &&
      (m.date === null || ref.saidOn === null || parseDateText(m.date) === ref.saidOn),
  );
  if (item && imagesDir) {
    const found = await readImage(path.join(imagesDir, item.file));
    if (found) return found;
  }

  const { src } = ref;
  const remote = /^https?:\/\//i.test(src);
  if (remote) {
    const downloaded = await download(src);
    if (downloaded) return downloaded;
  }
  const rawPath = src.split(/[?#]/)[0] ?? src;
  let decoded = rawPath;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    // Malformed escape such as "%E0%A4%A"; use the raw path.
  }
  const local = path.resolve(ctx.pageDir, decoded);
  if (!remote && existsSync(local)) {
    const found = await readImage(local);
    if (found) return found;
  }
  if (imagesDir) {
    const name = path.basename(decoded);
    const match = (await readdir(imagesDir)).find((file) => sameImage(name, file));
    if (match) return readImage(path.join(imagesDir, match));
  }
  return null;
}
