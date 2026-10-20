import 'server-only';
import { isIP } from 'node:net';
import { createAdminClient } from '@/lib/supabase/admin';

export type RateLimitPolicy = { name: string; limit: number; windowSeconds: number };

export const RATE_LIMITS = {
  /** New submissions per IP address. */
  submit: { name: 'submit', limit: 5, windowSeconds: 60 * 60 },
  /** Views and decisions on moderation links per IP address. */
  moderate: { name: 'moderate', limit: 120, windowSeconds: 10 * 60 },
  /** Magic-link requests per IP address. */
  login: { name: 'login', limit: 10, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitPolicy>;

/**
 * The visitor's IP address, or null when it cannot be determined. Behind Vercel the platform sets
 * `x-vercel-forwarded-for` (and overwrites any client value), so it is preferred; the others cover
 * other hosts and local runs.
 */
export function getClientIp(headers: Pick<Headers, 'get'>): string | null {
  const ip =
    headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip')?.trim() ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return ip && isIP(ip) ? ip : null;
}

/**
 * The key an address is limited under. A single IPv6 subscriber usually controls a whole /64, so
 * IPv6 addresses share a bucket per /64 (written as its four groups) instead of one per address.
 */
export function ipBucket(ip: string | null): string {
  if (!ip || isIP(ip) !== 6) return ip ?? 'unknown';
  // An embedded IPv4 tail fills the last two groups; it is never in the /64, so a placeholder will do.
  const text = ip
    .toLowerCase()
    .replace(/%.*$/, '')
    .replace(/\d+\.\d+\.\d+\.\d+$/, '0:0');
  const [head = '', rest] = text.split('::');
  const first = head ? head.split(':') : [];
  const last = rest ? rest.split(':') : [];
  const groups = [
    ...first,
    ...Array<string>(Math.max(0, 8 - first.length - last.length)).fill('0'),
    ...last,
  ];
  return `${groups
    .slice(0, 4)
    .map((group) => group.padStart(4, '0'))
    .join(':')}::/64`;
}

export function rateLimitBucket(policy: RateLimitPolicy, ip: string | null): string {
  return `${policy.name}:${ipBucket(ip)}`;
}

/** Records a hit and returns whether the caller is still within the policy. Fails closed. */
export async function checkRateLimit(policy: RateLimitPolicy, ip: string | null) {
  const { data, error } = await createAdminClient().rpc('consume_rate_limit', {
    p_bucket: rateLimitBucket(policy, ip),
    p_limit: policy.limit,
    p_window_seconds: policy.windowSeconds,
  });
  if (error) throw new Error(`Could not check the rate limit: ${error.message}`);
  return data === true;
}
