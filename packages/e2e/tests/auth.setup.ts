import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { test as setup } from '@playwright/test';
import { signInAsAdmin } from '../fixtures/admin';
import { ADMIN_STATE, requireLocalSupabase } from '../fixtures/env';

setup('the default moderator signs in with a magic link', async ({ page }) => {
  requireLocalSupabase();
  await signInAsAdmin(page);
  mkdirSync(dirname(ADMIN_STATE), { recursive: true });
  await page.context().storageState({ path: ADMIN_STATE });
});
