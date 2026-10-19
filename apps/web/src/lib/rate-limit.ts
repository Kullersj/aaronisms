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

export function rateLimitBucket(policy: RateLimitPolicy, ip: string | null): string {
  return `${policy.name}:${ip ?? 'unknown'}`;
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
