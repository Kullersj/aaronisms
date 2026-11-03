import { describe, expect, it } from 'vitest';
import { signInRateLimitMessage } from '@/features/admin/messages';

describe('signInRateLimitMessage', () => {
  it('passes on the wait Supabase reports', () => {
    expect(
      signInRateLimitMessage('For security purposes, you can only request this after 17 seconds.'),
    ).toBe(
      'A sign-in link was just sent to that address. Check your email, or wait 17 seconds to request another.',
    );
  });

  it('uses the singular for one second', () => {
    expect(signInRateLimitMessage('you can only request this after 1 second.')).toContain(
      'wait 1 second to',
    );
  });

  it('falls back when no wait is given (the project-wide hourly limit)', () => {
    expect(signInRateLimitMessage('Email rate limit exceeded')).toBe(
      'Too many sign-in emails were sent recently. Please try again in a few minutes.',
    );
  });
});
