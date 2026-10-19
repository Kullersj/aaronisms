import 'server-only';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Cloudflare's documented test secret that always passes. Verification is skipped for it, so
 * local development and CI work without network access to Cloudflare.
 */
export const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';

/** Checks a Turnstile token server-side. Returns false for a missing, invalid or failed check. */
export async function verifyTurnstile(
  token: string | null,
  secret: string,
  ip: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (secret === TURNSTILE_TEST_SECRET) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const response = await fetchImpl(VERIFY_URL, { method: 'POST', body });
    if (!response.ok) return false;
    const result: { success?: boolean } = await response.json();
    return result.success === true;
  } catch {
    return false;
  }
}
