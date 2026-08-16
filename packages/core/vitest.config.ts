import { defineConfig } from 'vitest/config';
import * as path from 'path';
import { fileURLToPath } from 'url';

// See vite.config.ts's matching comment for why this isn't just
// `import.meta.dirname` directly — Node 18 (still supported per this
// monorepo's own `engines.node`) doesn't have it.
const __dirname = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@/core': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/*.spec.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './tests/coverage',
      include: ['src/**/*.ts'],
      exclude: [
        // Pure type declarations: no JS is emitted for these, so there is
        // nothing runtime tests could ever cover. aria-labels.interface.ts
        // is deliberately NOT excluded despite living in the same
        // directory — it exports real runtime code (DEFAULT_ARIA_LABELS,
        // resolveAriaLabels), not just type declarations, and is directly
        // covered by tests/aria-labels.spec.ts.
        'src/common/interfaces/event-bus.interfaces.ts',
        'src/common/interfaces/transform-style.interfaces.ts',
        'src/common/types/**',
        'src/griditem/interfaces/**',
        'src/gridlayout/interfaces/**',
        'src/helpers/point.interface.ts',
        'src/breakpoints.interfaces.ts',
        'src/layout-definition.ts',
        // The package's public barrel — pure re-exports, nothing in this
        // package's own test suite imports through it directly (every
        // spec file imports the specific module it's testing). Genuine
        // "does this barrel actually export what it claims" coverage is a
        // job for a pack-and-install smoke test (see
        // packages/vue/scripts/check-package-install.js for the existing
        // pattern this package doesn't have its own copy of yet), not
        // unit-test line coverage.
        'src/index.ts',
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
