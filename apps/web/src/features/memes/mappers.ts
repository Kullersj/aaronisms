import { memeSchema, type Meme } from '@aaronisms/db/schemas';

export type MemeRow = {
  id: string;
  image_path: string;
  caption: string | null;
  created_at: string;
};

export function toMeme(row: MemeRow): Meme {
  return memeSchema.parse({
    id: row.id,
    imagePath: row.image_path,
    caption: row.caption,
    createdAt: row.created_at,
  });
}
