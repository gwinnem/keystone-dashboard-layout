import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));

// `passWithNoTests` is kept even now that real tests exist, matching
// every other package in this monorepo's own vitest config — harmless
// once tests exist (it only changes behavior for a run that finds
// none). The coverage thresholds below (90% minimum across
// lines/functions/branches/statements) match every other package here;
// do not remove or lower these.
export default defineConfig({
  resolve: {
    // Same `@/core` alias, same rationale, as `vite.config.ts`'s own
    // copy of this — see that file's comment. Needed here too since
    // tests exercise `useCrossGridDrag.ts` directly, which imports
    // through this alias.
    alias: {
      '@/core': resolve(__dirname, '../core/src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
    setupFiles: ['./tests/setup.ts'],
    // Bug fix: Vitest's own default `include` (`**/*.{test,spec}.?(c|m)[jt]s?(x)`)
    // has no awareness that `e2e/`'s own `*.spec.ts` files are Playwright
    // tests, not Vitest ones — without scoping `include` to `src/`
    // explicitly, Vitest tries to import and execute them directly,
    // crashing with "Playwright Test did not expect test.describe() to
    // be called here" (a real, reproduced failure: `npm run
    // test:coverage` picked up all 5 e2e spec files as if they were its
    // own tests). `coverage.include` below was already correctly scoped
    // to `src/**` — this mirrors that same scoping for test *discovery*
    // itself, which is a separate setting Vitest doesn't infer from the
    // coverage config.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Pure type declarations: no JS is emitted for these, so there
        // is nothing runtime tests could ever cover. Same rationale as
        // the Vue package's own, identically-named exclusions.
        'src/components/Grid/grid-layout-props.interface.ts',
        'src/components/Grid/grid-item-props.interface.ts',
        'src/components/Grid/grid-layout-handle.interface.ts',
        // The package's public barrel — pure re-exports; no test in
        // this suite imports through it directly (every spec imports
        // the specific module it's testing). Genuine "does this barrel
        // actually export what it claims" coverage is a job for a
        // pack-and-install smoke test, not unit-test line coverage —
        // same rationale as the Vue package's own equivalent exclusion.
        'src/index.ts',
        // Test infrastructure, not library source — the Vue package's own
        // equivalent test helpers live entirely outside `src/`, so this
        // exclusion doesn't even arise there; this package's own
        // `__tests__` directories sit under `src/` instead, so the
        // `include` glob above would otherwise sweep this up too.
        'src/components/Grid/__tests__/test-helpers.ts',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
