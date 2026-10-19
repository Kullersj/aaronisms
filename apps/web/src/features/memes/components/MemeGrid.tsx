import type { Meme } from '@aaronisms/db/schemas';
import { getImageUrl } from '@/lib/supabase/storage';
import { MemeGallery } from './MemeGallery';

export type MemeGridProps = { memes: Meme[] };

/** Resolves image URLs on the server, then hands plain data to the client lightbox. */
export function MemeGrid({ memes }: MemeGridProps) {
  const items = memes.map((meme) => ({
    id: meme.id,
    src: getImageUrl(meme.imagePath),
    caption: meme.caption,
  }));
  return <MemeGallery items={items} />;
}
