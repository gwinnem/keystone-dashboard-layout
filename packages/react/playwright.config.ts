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
  // 2 retries in CI (a fresh dev-server/browser instance each run, so a
  // retry there is nearly always testing a genuine flake, not masking
  // a real bug). 1 retry locally too, not 0 — a real, confirmed local
  // failure (`page.goto('/')` itself timing out, not an assertion
  // failure about app behavior) turned out to be exactly the class of
  // transient issue retries exist for: `fullyParallel` runs many
  // workers across 3 browser projects against a single shared,
  // `reuseExistingServer`-kept dev server instance, and under real
  // local-machine load a navigation can occasionally exceed 30s even
  // though the server itself is healthy and would have responded a
  // little later. A genuine app bug still fails again on retry and
  // surfaces normally; this only self-heals the environmental case.
  retries: process.env.CI ? 2 : 1,
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
