import { expect, type Locator, type Page } from '@playwright/test';

/** The page must not scroll sideways; that is the experience of content overflowing a phone. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Presses Tab the way a keyboard user would, until `target` has focus. */
export async function tabTo(page: Page, target: Locator, maxPresses = 40) {
  for (let i = 0; i < maxPresses; i++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error(`Tab never reached the target within ${maxPresses} presses`);
}

/** Today's date in a time zone, as a date input holds it: YYYY-MM-DD. */
export function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}
