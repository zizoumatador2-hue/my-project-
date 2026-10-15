import { defineConfig } from '@playwright/test';

const executablePath = process.env.CHROMIUM_PATH !== undefined ? process.env.CHROMIUM_PATH || undefined : (process.env.CI ? undefined : '/opt/pw-browsers/chromium');

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.BM_BASE_URL ?? 'http://127.0.0.1:8788',
    launchOptions: executablePath ? { executablePath } : {},
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /setup\.spec\.ts/ },
    { name: 'mobile', dependencies: ['setup'], testIgnore: /setup\.spec\.ts/, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
    { name: 'desktop', dependencies: ['setup'], testIgnore: /setup\.spec\.ts/, use: { viewport: { width: 1366, height: 900 } } },
  ],
});
