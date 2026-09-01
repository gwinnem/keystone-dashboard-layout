import type { Config } from 'jest';

/**
 * Jest configuration for keystone-dashboard-layout-angular's own
 * unit/component tests — replacing the earlier Vitest attempts (both
 * the third-party @analogjs/vite-plugin-angular route and the
 * consideration of Angular's own first-party @angular/build:unit-test,
 * which doesn't exist at all for this package's Angular ^19.0.0 target
 * — see package.json's own _comment_scripts for the full history).
 * Karma (angular.json/karma.conf.js, both still present) is kept for a
 * possible future full-app browser-flow e2e layer, not used for
 * unit/component tests.
 *
 * `jest-preset-angular` is the mature, long-established way to run
 * Angular's own `TestBed`-based specs under Jest — a single Node.js
 * process compiling via ts-jest/Angular's own Ivy-aware transform,
 * rather than the Vite-plugin-interop approach that hit a genuine,
 * unresolved duplicate-module-instance bug.
 */
const config: Config = {
  preset: `jest-preset-angular`,
  // Explicit, not left to jest-preset-angular's own implicit default
  // (which is 'jsdom' too, normally) — attempting a fix for a real,
  // confirmed failure specifically under @stryker-mutator/jest-runner's
  // own sandbox: a live run there failed with 'ReferenceError: document
  // is not defined' plus a cascade of Angular DI circular-dependency
  // errors (NG0200, DocumentToken/TestComponentRenderer) during
  // TestBed's own teardown, across every spec that touches the DOM at
  // all — see stryker.conf.json's own '_comment_known_limitation' for
  // the full account. The plain `pnpm test` run (outside Stryker) has
  // always passed with this same preset's own implicit default, so this
  // is specifically testing whether Stryker's own jest-runner resolves
  // a preset-implied environment differently than plain `jest` does —
  // unverified, could not be tested by the assistant that wrote this.
  testEnvironment: `jsdom`,
  setupFilesAfterEnv: [`<rootDir>/setup-jest.ts`],
  testPathIgnorePatterns: [
    `<rootDir>/node_modules/`,
    `<rootDir>/dist/`,
    // Stryker's own temp sandbox copies of this whole package (one per
    // concurrent mutation-testing worker) — confirmed necessary via a
    // real, failing test run: each sandbox contains its own copy of
    // every *.spec.ts file (and this config's own src/test.ts, below),
    // and without this exclusion Jest happily discovers and runs *all*
    // of them too, multiplying the real suite by however many stray
    // sandboxes a prior stryker run left behind (stryker normally
    // cleans these up itself on a successful run, but doesn't on an
    // interrupted/failed one). Already `.gitignore`d for the same
    // reason; this is the equivalent exclusion for Jest's own test
    // discovery specifically.
    `<rootDir>/.stryker-tmp/`,
    // Playwright's own e2e specs (e2e/*.spec.ts) — confirmed necessary via
    // a real, failing test run: these import `@playwright/test`, whose
    // own test framework has a completely different execution model
    // from Jest's (its own global `test`/`expect`, its own process/
    // worker orchestration) and cannot be loaded inside a Jest run at
    // all — doing so throws `TypeError: Class extends value undefined
    // is not a constructor or null` at the very first `import { expect,
    // test } from '@playwright/test'` line, for every file under this
    // directory. These specs are meant to run only via `pnpm test:e2e`
    // (`playwright test`), never via `pnpm test` (`jest`) — this
    // exclusion is what actually keeps the two runners from stepping on
    // each other.
    `<rootDir>/e2e/`,
    // Karma-only (its own real-entry-file requirement, not a real test
    // suite) — confirmed necessary via a fresh Jest run, which
    // otherwise picks this up and fails it directly, since it calls
    // getTestBed().initTestEnvironment() a second time (setup-jest.ts's
    // own setupZoneTestEnv() already did this for Jest's own run).
    `<rootDir>/src/test.ts`,
  ],
};

export default config;
