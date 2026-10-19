import { createHash, randomBytes } from 'node:crypto';

export const TOKEN_TTL_DAYS = 14;

/** 32 random bytes as base64url: 43 URL-safe characters. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type ModerationToken = {
  email: string;
  /** The raw token. It only ever lives in the emailed link. */
  token: string;
  /** SHA-256 hex digest: the only form stored in the database. */
  tokenHash: string;
  expiresAt: Date;
};

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Whether a URL segment could be a token, so junk never reaches the database. */
export function isTokenShaped(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

/** One fresh token per moderator address. */
export function createModerationTokens(emails: string[], now = new Date()): ModerationToken[] {
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return emails.map((email) => {
    const token = generateToken();
    return { email, token, tokenHash: hashToken(token), expiresAt };
  });
}
