import { expect, type Page } from '@playwright/test';
import { moderators } from './env';
import { knownSignInEmails, waitForMagicLink } from './mailpit';

/**
 * Signs in as the default moderator with a real magic link. Local Supabase delivers auth email to
 * Mailpit, so the link is read from there and followed as the moderator would.
 */
export async function signInAsAdmin(page: Page) {
  const [defaultModerator] = moderators();
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(defaultModerator);
  const known = await knownSignInEmails(defaultModerator);
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByText('a link is on its way')).toBeVisible();
  await page.goto(await waitForMagicLink(defaultModerator, known));
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('navigation', { name: 'Admin' })).toBeVisible();
}
