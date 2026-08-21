import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for @keystone-dashboard-layout/react.
 *
 * Tests run against `./e2e-fixture` — a minimal test harness, not a
 * demo app — which imports the library directly from `src/` so tests
 * always exercise current, uncompiled source. Same structural
 * rationale as the Vue package's own `playwright.config.ts`, pointed
 * at this package's own leaner fixture instead of a full showcase app.
 *
 * Run with:
 *   npx playwright install        (first time only, downloads browsers)
 *   npm run test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5175',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx vite --config e2e-fixture/vite.config.ts',
    url: 'http://localhost:5175',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
