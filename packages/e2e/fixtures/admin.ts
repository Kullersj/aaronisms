import { expect, type Page } from '@playwright/test';
import { moderators } from './env';
import { knownSignInEmails, waitForMagicLink } from './mailpit';

/**
 * When each address last asked for a link. Supabase refuses a second link to the same address
 * within `max_frequency` (1s in config.toml), and these tests ask faster than a person would.
 */
const lastRequest = new Map<string, number>();
const MIN_GAP_MS = 1_500;

/**
 * Asks for a sign-in link on the login page, as a moderator would, and returns the link from the
 * email. Local Supabase delivers auth email to Mailpit, so the link is read from there.
 */
export async function requestSignInLink(page: Page, email: string): Promise<string> {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(email);
  const wait = (lastRequest.get(email) ?? 0) + MIN_GAP_MS - Date.now();
  if (wait > 0) await page.waitForTimeout(wait);
  lastRequest.set(email, Date.now());
  const known = await knownSignInEmails(email);
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByText('a link is on its way')).toBeVisible();
  return waitForMagicLink(email, known);
}

/** Follows a sign-in link and checks that it lands in the admin. */
export async function followSignInLink(page: Page, link: string) {
  await page.goto(link);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('navigation', { name: 'Admin' })).toBeVisible();
}

/**
 * Signs in as a moderator (the default one unless `email` says otherwise) with a real magic link,
 * followed in the same browser that asked for it.
 */
export async function signInAsAdmin(page: Page, email: string = moderators()[0]) {
  await followSignInLink(page, await requestSignInLink(page, email));
}
