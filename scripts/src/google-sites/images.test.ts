import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { findImage, loadManifest, sniffImage, type ImageContext } from './images';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

let root: string;
let imagesDir: string;

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'aaronisms-images-'));
  imagesDir = path.join(root, 'images');
  await mkdir(imagesDir);
  await writeFile(path.join(imagesDir, 'home-01.png'), PNG);
  await writeFile(path.join(imagesDir, 'home-02.jpg'), JPEG);
  await writeFile(path.join(imagesDir, 'AMxu72abcdefghijklmnop'), PNG);
  await writeFile(
    path.join(imagesDir, 'manifest.json'),
    JSON.stringify([
      {
        page: 'home',
        date: 'October 6, 2025',
        sectionIndex: 53,
        order: 0,
        file: 'home-01.png',
        url: 'u1',
      },
      {
        page: 'home',
        date: 'October 6, 2025',
        sectionIndex: 60,
        order: 0,
        file: 'home-02.jpg',
        url: 'u2',
      },
    ]),
  );
});

const ref = (sectionIndex: number, src = './missing/x') => ({
  page: 'home' as const,
  sectionIndex,
  saidOn: '2025-10-06',
  order: 0,
  src,
});

describe('findImage', () => {
  const context = async (): Promise<ImageContext> => ({
    pageDir: root,
    imagesDir,
    manifest: await loadManifest(imagesDir),
  });

  it('uses the manifest section index to tell same-date entries apart', async () => {
    const ctx = await context();
    expect((await findImage(ref(53), ctx))?.contentType).toBe('image/png');
    expect((await findImage(ref(60), ctx))?.contentType).toBe('image/jpeg');
  });

  it('ignores a manifest row whose date disagrees', async () => {
    const ctx = await context();
    expect(await findImage({ ...ref(53), saidOn: '2024-01-01' }, ctx)).toBeNull();
  });

  it('falls back to an extensionless file matched by name in the images folder', async () => {
    const ctx = await context();
    const found = await findImage(ref(1, './Home_files/AMxu72abcdefghijklmnop'), ctx);
    expect(found?.extension).toBe('png');
  });

  it('returns null instead of failing when nothing matches', async () => {
    expect(await findImage(ref(1), { pageDir: root, manifest: [] })).toBeNull();
  });

  it('reads a path relative to the saved page', async () => {
    const found = await findImage(ref(1, './images/home-01.png'), { pageDir: root, manifest: [] });
    expect(found?.bytes.equals(PNG)).toBe(true);
  });

  it('does not throw on a malformed percent escape in the src', async () => {
    expect(
      await findImage(ref(1, './images/100%.png'), { pageDir: root, manifest: [] }),
    ).toBeNull();
  });
});

describe('sniffImage', () => {
  it('identifies images by magic bytes and rejects other data', () => {
    expect(sniffImage(PNG)?.extension).toBe('png');
    expect(sniffImage(Buffer.from('<html></html>'))).toBeNull();
  });
});
