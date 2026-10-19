import { describe, expect, it } from 'vitest';
import { moderatorEmailsSchema } from '@/lib/env';

describe('moderatorEmailsSchema', () => {
  it('splits, trims, lowercases and de-duplicates', () => {
    const result = moderatorEmailsSchema.parse(
      ' Seth@Example.com, friend@example.com ,seth@example.com',
    );
    expect(result).toEqual(['seth@example.com', 'friend@example.com']);
  });

  it('keeps the first address first', () => {
    expect(moderatorEmailsSchema.parse('b@example.com,a@example.com')[0]).toBe('b@example.com');
  });

  it('rejects an empty list', () => {
    expect(moderatorEmailsSchema.safeParse(' , ').success).toBe(false);
  });

  it('rejects invalid addresses', () => {
    expect(moderatorEmailsSchema.safeParse('ok@example.com, nope').success).toBe(false);
  });
});
