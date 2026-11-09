import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * The factory environment ships a Chromium build at PLAYWRIGHT_BROWSERS_PATH and
 * blocks downloads, so the revision Playwright wants is often not the one present.
 * Point at the pre-installed binary when it exists; in CI, where `playwright
 * install` runs normally, fall through to the managed browser.
 */
const preinstalled = `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers'}/chromium`;
const launchOptions =
  !process.env.CI && existsSync(preinstalled) ? { executablePath: preinstalled } : {};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    launchOptions,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
