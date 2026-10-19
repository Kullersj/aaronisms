import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import {
  checkRateLimit,
  getClientIp,
  rateLimitBucket,
  type RateLimitPolicy,
} from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';

const headers = (values: Record<string, string>) => new Headers(values);

describe('getClientIp', () => {
  it('prefers x-vercel-forwarded-for, then x-real-ip, then x-forwarded-for', () => {
    const all = {
      'x-vercel-forwarded-for': '198.51.100.1',
      'x-real-ip': '198.51.100.2',
      'x-forwarded-for': '198.51.100.3',
    };
    expect(getClientIp(headers(all))).toBe('198.51.100.1');
    expect(getClientIp(headers({ ...all, 'x-vercel-forwarded-for': '' }))).toBe('198.51.100.2');
    expect(getClientIp(headers({ 'x-forwarded-for': '198.51.100.3, 10.0.0.1' }))).toBe(
      '198.51.100.3',
    );
  });

  it('uses the first x-forwarded-for entry', () => {
    expect(getClientIp(headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }))).toBe(
      '203.0.113.5',
    );
  });

  it('falls back to x-real-ip', () => {
    expect(getClientIp(headers({ 'x-real-ip': '2001:db8::1' }))).toBe('2001:db8::1');
  });

  it('returns null for missing or malformed addresses', () => {
    expect(getClientIp(headers({}))).toBeNull();
    expect(getClientIp(headers({ 'x-forwarded-for': 'not-an-ip' }))).toBeNull();
  });
});

describe('checkRateLimit (against the local database)', () => {
  // A policy name unique to this run keeps the buckets private to these tests.
  const policy: RateLimitPolicy = { name: `test-${randomUUID()}`, limit: 2, windowSeconds: 60 };

  afterAll(async () => {
    await createAdminClient().from('rate_limit_hits').delete().like('bucket', `${policy.name}:%`);
  });

  it('names the bucket by policy and address', () => {
    expect(rateLimitBucket(policy, '203.0.113.5')).toBe(`${policy.name}:203.0.113.5`);
    expect(rateLimitBucket(policy, null)).toBe(`${policy.name}:unknown`);
  });

  it('allows up to the limit, then refuses', async () => {
    const results = [];
    for (let i = 0; i < 3; i++) results.push(await checkRateLimit(policy, '203.0.113.10'));
    expect(results).toEqual([true, true, false]);
  });

  it('counts each address separately', async () => {
    expect(await checkRateLimit(policy, '203.0.113.11')).toBe(true);
    expect(await checkRateLimit(policy, null)).toBe(true);
  });
});
