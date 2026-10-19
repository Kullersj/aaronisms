import { getPublicEnv } from '@/lib/env';

export const IMAGE_BUCKET = 'aaronism-images';

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
