import 'server-only';
import sharp from 'sharp';
import { imageExtension, sniffImageType } from '@/features/submissions/image';
import { TOKEN_TTL_DAYS } from '@/features/moderation/tokens';
import { createAdminClient } from './admin';
import { getImageUrl, imageBucket, isPrivateImage, PRIVATE_PREFIX } from './storage';

/** Longest side kept for a stored photo; larger ones are scaled down. */
const MAX_SIDE = 2400;
/** Refuses images that declare more pixels than this, so a small file cannot expand into gigabytes. */
const MAX_INPUT_PIXELS = 64_000_000;

/** Signed URL lifetime for the moderation email: as long as its links work. */
export const EMAIL_PHOTO_SECONDS = TOKEN_TTL_DAYS * 24 * 60 * 60;
/** Signed URL lifetime for pages rendered for a moderator or admin. */
export const PAGE_PHOTO_SECONDS = 60 * 60;

/**
 * Re-encodes an upload: applies the EXIF orientation, drops all metadata (GPS, device, time) and
 * scales it to at most MAX_SIDE. GIFs are kept as they are, because re-encoding would cost their
 * animation or palette and they do not carry camera metadata; they are still checked to decode.
 * Returns null when the bytes are not a supported, decodable image.
 */
async function cleanImage(bytes: Uint8Array) {
  const type = sniffImageType(bytes);
  if (!type) return null;
  try {
    const input = sharp(bytes, {
      limitInputPixels: MAX_INPUT_PIXELS,
      animated: type === 'image/webp',
    });
    if (type === 'image/gif') {
      await input.metadata();
      return { bytes, type };
    }
    const resized = input.rotate().resize({
      width: MAX_SIDE,
      height: MAX_SIDE,
      fit: 'inside',
      withoutEnlargement: true,
    });
    const output =
      type === 'image/jpeg'
        ? resized.jpeg({ quality: 90 })
        : type === 'image/png'
          ? resized.png()
          : resized.webp({ quality: 90 });
    return { bytes: await output.toBuffer(), type };
  } catch {
    return null;
  }
}

/**
 * Cleans and stores a photo under a random name, in the private bucket or the public one. Returns
 * its `image_path`, or null when the bytes are not a supported image.
 */
export async function storePhoto(
  file: File,
  visibility: 'public' | 'private',
): Promise<string | null> {
  const clean = await cleanImage(new Uint8Array(await file.arrayBuffer()));
  if (!clean) return null;
  const prefix = visibility === 'private' ? PRIVATE_PREFIX : 'entries/';
  const path = `${prefix}${crypto.randomUUID()}.${imageExtension(clean.type)}`;
  const { error } = await createAdminClient()
    .storage.from(imageBucket(path))
    .upload(path, clean.bytes, { contentType: clean.type });
  if (error) throw new Error(`Could not store the photo: ${error.message}`);
  return path;
}

/** Deletes a stored photo. Failures are logged: the object is already unreferenced. */
export async function removePhoto(imagePath: string | null | undefined): Promise<void> {
  if (!imagePath) return;
  const { error } = await createAdminClient()
    .storage.from(imageBucket(imagePath))
    .remove([imagePath]);
  if (error) console.error('Could not delete a photo from storage', imagePath, error.message);
}

/** Copies a photo into the other bucket under a new random name and returns the new path. */
export async function copyPhoto(imagePath: string, to: 'public' | 'private'): Promise<string> {
  const extension = imagePath.slice(imagePath.lastIndexOf('.') + 1);
  const prefix = to === 'private' ? PRIVATE_PREFIX : 'entries/';
  const copy = `${prefix}${crypto.randomUUID()}.${extension}`;
  const { error } = await createAdminClient()
    .storage.from(imageBucket(imagePath))
    .copy(imagePath, copy, { destinationBucket: imageBucket(copy) });
  if (error) throw new Error(`Could not copy the photo: ${error.message}`);
  return copy;
}

/**
 * Points an entry at a copy made by `copyPhoto` and deletes the original. Only applies while the
 * entry still has the original path; otherwise the copy is deleted and false is returned.
 */
export async function swapPhoto(entryId: string, from: string, to: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from('entries')
    .update({ image_path: to })
    .eq('id', entryId)
    .eq('image_path', from)
    .select('id');
  if (error || data.length === 0) {
    if (error) console.error('Could not point an entry at its moved photo', entryId, error.message);
    await removePhoto(to);
    return false;
  }
  await removePhoto(from);
  return true;
}

/**
 * Moves an entry's photo to the public or private bucket (no-op if it is already there). Never
 * throws: it runs after the entry change was saved, so a failure is logged and the photo stays
 * where it was. Returns whether the photo is where it should be.
 */
export async function movePhoto(
  entryId: string,
  imagePath: string | null,
  to: 'public' | 'private',
): Promise<boolean> {
  if (!imagePath || isPrivateImage(imagePath) === (to === 'private')) return true;
  try {
    return await swapPhoto(entryId, imagePath, await copyPhoto(imagePath, to));
  } catch (error) {
    console.error(`Could not move the photo of entry ${entryId} to the ${to} bucket`, error);
    return false;
  }
}

/**
 * A URL a moderator or admin can load: signed for a private photo, the public URL otherwise.
 * Null if there is no photo or it cannot be signed.
 */
export async function reviewPhotoUrl(
  imagePath: string | null,
  expiresIn = PAGE_PHOTO_SECONDS,
): Promise<string | null> {
  if (!imagePath) return null;
  if (!isPrivateImage(imagePath)) return getImageUrl(imagePath);
  const { data, error } = await createAdminClient()
    .storage.from(imageBucket(imagePath))
    .createSignedUrl(imagePath, expiresIn);
  if (error) {
    console.error('Could not sign a photo URL', error.message);
    return null;
  }
  return data.signedUrl;
}
