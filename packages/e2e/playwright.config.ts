import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
// Lets machines with a pre-installed Chromium skip `playwright install`.
const executablePath = process.env.PW_CHROMIUM_PATH;
const launchOptions = executablePath ? { executablePath } : {};

// The journeys publish entries and sign in as the admin. They run last, so the public specs,
// which expect exactly the seed data, never see their entries.
const journeys = /journeys\//;
const setup = /auth\.setup\.ts/;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: [journeys, setup],
      use: { ...devices['Desktop Chrome'], launchOptions },
    },
    {
      name: 'mobile-chrome',
      testIgnore: [journeys, setup],
      use: { ...devices['Pixel 7'], launchOptions },
    },
    {
      name: 'admin-setup',
      testMatch: setup,
      use: { ...devices['Desktop Chrome'], launchOptions },
    },
    {
      name: 'journeys',
      testMatch: journeys,
      dependencies: ['chromium', 'mobile-chrome', 'admin-setup'],
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'], launchOptions },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'pnpm --filter @aaronisms/web start',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
});
