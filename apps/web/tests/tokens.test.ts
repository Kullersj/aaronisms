import { describe, expect, it } from 'vitest';
import {
  createModerationTokens,
  generateToken,
  hashToken,
  isTokenShaped,
  TOKEN_TTL_DAYS,
} from '@/features/moderation/tokens';

describe('moderation tokens', () => {
  it('generates 43-character URL-safe tokens that differ every time', () => {
    const tokens = new Set(Array.from({ length: 50 }, generateToken));
    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('hashes with SHA-256 hex, deterministically', () => {
    expect(hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abd')).not.toBe(hashToken('abc'));
  });

  it('recognises only well-formed tokens', () => {
    expect(isTokenShaped(generateToken())).toBe(true);
    for (const junk of [
      '',
      'short',
      `${generateToken()}x`,
      'a'.repeat(43) + '!',
      '../etc/passwd',
    ]) {
      expect(isTokenShaped(junk)).toBe(false);
    }
  });

  it('creates one token per moderator, expiring in 14 days, never storing the raw token', () => {
    const now = new Date('2026-10-19T12:00:00Z');
    const tokens = createModerationTokens(['a@example.com', 'b@example.com'], now);
    expect(tokens.map((t) => t.email)).toEqual(['a@example.com', 'b@example.com']);
    expect(tokens[0]?.token).not.toBe(tokens[1]?.token);
    for (const token of tokens) {
      expect(token.tokenHash).toBe(hashToken(token.token));
      expect(token.tokenHash).not.toContain(token.token);
      expect(token.expiresAt.getTime() - now.getTime()).toBe(TOKEN_TTL_DAYS * 86_400_000);
    }
    expect(TOKEN_TTL_DAYS).toBe(14);
  });
});
