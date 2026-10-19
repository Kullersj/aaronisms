import 'server-only';
import type { Entry } from '@aaronisms/db/schemas';
import { fetchEntriesByIds } from '@/features/entries/queries';
import { createAnonClient } from '@/lib/supabase/server';
import { normalizeQuery } from './utils';

/** Search results shown on one page. The database ranks; we keep the best of them. */
export const MAX_RESULTS = 100;

/**
 * Published entries matching `rawQuery`, best match first, with their lines and speakers.
 * Full-text search with a typo-tolerant fallback runs in the `search_entries` database function
 * (security invoker, so RLS applies). Not cached: the query is arbitrary visitor input, and a
 * cache entry per distinct query would only grow.
 */
export async function searchEntries(rawQuery: string): Promise<Entry[]> {
  const q = normalizeQuery(rawQuery);
  if (!q) return [];
  const { data, error } = await createAnonClient().rpc('search_entries', { q });
  if (error) throw new Error(`Could not search entries: ${error.message}`);
  return fetchEntriesByIds(data.slice(0, MAX_RESULTS).map((row) => row.id));
}
