import { getPublicEnv } from '@/lib/env';

export const IMAGE_BUCKET = 'aaronism-images';
/** Private bucket for photos that are not public (pending, rejected or deleted entries). */
export const PRIVATE_IMAGE_BUCKET = 'aaronism-images-private';
/** `entries.image_path` values with this prefix live in the private bucket; all others are public. */
export const PRIVATE_PREFIX = 'private/';

/** Whether a stored image path points into the private bucket. */
export function isPrivateImage(imagePath: string): boolean {
  return imagePath.startsWith(PRIVATE_PREFIX);
}

/** The bucket that holds an image path. */
export function imageBucket(imagePath: string): string {
  return isPrivateImage(imagePath) ? PRIVATE_IMAGE_BUCKET : IMAGE_BUCKET;
}

/** Public Storage URL for an object path in the image bucket. Pure; see `getImageUrl`. */
export function buildImageUrl(supabaseUrl: string, imagePath: string): string {
  const base = supabaseUrl.replace(/\/+$/, '');
  const path = imagePath.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  return `${base}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;
}

/** Public URL of an uploaded image. Call only from server components. */
export function getImageUrl(imagePath: string): string {
  return buildImageUrl(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, imagePath);
}
