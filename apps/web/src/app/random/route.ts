import { fetchRandomEntrySlug } from '@/features/entries/queries';

export const dynamic = 'force-dynamic';

/** The entry slug in a Referer such as `https://host/a/<slug>`, if any. */
function currentSlug(request: Request): string | undefined {
  const referer = request.headers.get('referer');
  if (!referer) return undefined;
  try {
    const slug = /^\/a\/([^/]+)$/.exec(new URL(referer).pathname)?.[1];
    return slug ? decodeURIComponent(slug) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Sends the visitor to a random published entry, never the one they came from (so every press
 * visibly moves on), or home when nothing is published.
 */
export async function GET(request: Request) {
  const slug = await fetchRandomEntrySlug(currentSlug(request));
  // A relative Location keeps the visitor on whatever host they used. 307 and no-store: the
  // destination changes on every request, so no browser or CDN may remember it.
  return new Response(null, {
    status: 307,
    headers: {
      Location: slug ? `/a/${encodeURIComponent(slug)}` : '/',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
