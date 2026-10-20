import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { imageBucket, isPrivateImage } from '@/lib/supabase/storage';

const stored: { bucket: string; path: string; bytes: Uint8Array; contentType: string }[] = [];

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, bytes: Uint8Array, options: { contentType: string }) => {
          stored.push({ bucket, path, bytes, contentType: options.contentType });
          return { error: null };
        },
      }),
    },
  }),
}));

const { storePhoto } = await import('@/lib/supabase/photos');

const file = (bytes: Uint8Array | Buffer, name = 'p.jpg') =>
  new File([new Uint8Array(bytes)], name);

beforeEach(() => {
  stored.length = 0;
});

describe('image paths', () => {
  it('treats only the private/ prefix as the private bucket', () => {
    expect(isPrivateImage('private/a.jpg')).toBe(true);
    expect(isPrivateImage('entries/a.jpg')).toBe(false);
    expect(isPrivateImage('submissions/a.jpg')).toBe(false);
    expect(imageBucket('private/a.jpg')).toBe('aaronism-images-private');
    expect(imageBucket('submissions/a.jpg')).toBe('aaronism-images');
  });
});

describe('storePhoto', () => {
  it('strips EXIF, applies the orientation and scales down', async () => {
    const original = await sharp({
      create: { width: 3000, height: 1000, channels: 3, background: '#c00' },
    })
      .withExif({ IFD0: { Make: 'SecretCam' } })
      .jpeg()
      .toBuffer();
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const path = await storePhoto(file(original), 'private');
    expect(path).toMatch(/^private\/[0-9a-f-]{36}\.jpg$/);
    const [object] = stored;
    expect(object?.bucket).toBe('aaronism-images-private');
    expect(object?.contentType).toBe('image/jpeg');
    const meta = await sharp(object?.bytes).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.width).toBe(2400);
    expect(meta.height).toBe(800);
  });

  it('stores a public photo under entries/ with a random name', async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } })
      .png()
      .toBuffer();
    const first = await storePhoto(file(png, 'a.png'), 'public');
    const second = await storePhoto(file(png, 'a.png'), 'public');
    expect(first).toMatch(/^entries\/[0-9a-f-]{36}\.png$/);
    expect(second).not.toBe(first);
    expect(stored[0]?.bucket).toBe('aaronism-images');
  });

  it('refuses bytes that only look like an image, and stores nothing', async () => {
    const fake = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
    expect(await storePhoto(file(fake, 'x.png'), 'private')).toBeNull();
    expect(await storePhoto(file(Buffer.from('not an image')), 'private')).toBeNull();
    expect(stored).toEqual([]);
  });

  it('refuses an image that declares too many pixels', async () => {
    const huge = await sharp({
      create: { width: 9000, height: 9000, channels: 3, background: '#000' },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
    expect(await storePhoto(file(huge, 'big.png'), 'private')).toBeNull();
    expect(stored).toEqual([]);
  });
});
