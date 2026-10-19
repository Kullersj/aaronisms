import 'server-only';
import { unstable_cache } from 'next/cache';
import type { Meme } from '@aaronisms/db/schemas';
import { createAnonClient } from '@/lib/supabase/server';
import { toMeme } from './mappers';

export const MEMES_TAG = 'memes';

/** Published memes, newest first. */
export const getMemes = unstable_cache(
  async (): Promise<Meme[]> => {
    const { data, error } = await createAnonClient()
      .from('memes')
      .select('id, image_path, caption, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Could not load memes: ${error.message}`);
    return data.map(toMeme);
  },
  ['memes', 'published'],
  { tags: [MEMES_TAG], revalidate: 3600 },
);
