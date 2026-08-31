import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for @keystone-dashboard-layout/angular.
 *
 * Tests run against `./e2e-fixture` — a minimal test harness, not a
 * demo app — which imports the library directly from `src/` so tests
 * always exercise current, uncompiled source. Same structural
 * rationale as the Vue/React packages' own `playwright.config.ts`,
 * pointed at this package's own leaner fixture instead of a full
 * showcase app.
 *
 * Served via the Angular CLI's own dev-server (`ng serve`), not Vite —
 * see `e2e-fixture/main.ts`'s own doc comment for why: the
 * `@analogjs/vite-plugin-angular` route this package's own unit tests
 * already ruled out (a genuinely unresolved upstream bug) would hit
 * the identical issue here.
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
  // Global assertion timeout, not just the webServer startup one above
  // — confirmed via a live run, not assumed: `toBeVisible()` failed on
  // the *simplest* possible check (a static 3-item render, no
  // interaction) with Playwright's own default 5s timeout, yet the
  // failure screenshot it captured moments later showed the exact same
  // page rendering perfectly, items fully visible and correctly
  // positioned. That rules out a real rendering/CSS bug entirely — it's
  // a timing race: Angular's own client-side bootstrap (esbuild/
  // zone.js/HMR, genuinely heavier than Vite's, and now further
  // strained by `fullyParallel` spinning up many workers' own fresh
  // pages against the same dev server at once) can take longer than 5s
  // to finish settling, especially for whichever test's own page load
  // happens to land first/under the heaviest concurrent load. 15s gives
  // real headroom without masking a genuinely broken assertion, which
  // would still fail, just take longer to report.
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: 'http://localhost:4301',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx ng serve e2e-fixture --port 4301',
    url: 'http://localhost:4301',
    reuseExistingServer: !process.env.CI,
    // 60s wasn't enough, confirmed via a real, reproduced timeout: a
    // cold start (no build cache, e.g. right after killing a stale
    // process) genuinely gets as far as "Component HMR has been
    // enabled" — a real, meaningful milestone the Angular CLI's own
    // esbuild dev-server logs partway through startup, well before the
    // full application bundle (11 scenario components, @angular/forms,
    // the library's own source compiled fresh each time since this
    // points at ../src directly) actually finishes compiling — but
    // still doesn't finish serving real HTTP within 60s from there.
    // Vue/React's own equivalent config both use Vite, which cold-starts
    // dramatically faster; this is a genuine, confirmed difference in
    // the underlying tooling, not a flaky/arbitrary bump.
    timeout: 180_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
