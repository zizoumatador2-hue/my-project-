import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 1, // flows share the ops account and platform settings
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE || 'http://localhost:8787',
    locale: 'ar',
    timezoneId: 'Asia/Riyadh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, browserName: 'chromium' } },
    { name: 'desktop', use: { viewport: { width: 1366, height: 900 }, browserName: 'chromium' } },
  ],
});
