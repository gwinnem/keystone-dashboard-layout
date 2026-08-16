import * as path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

// `import.meta.dirname` (Node >=20.11/21.2) is what Vite's newer
// `configLoader: 'native'` mode requires instead of the CJS-only
// `__dirname` global — but this project's own `engines.node` still
// supports Node 18, which doesn't have it. Falling back to
// `fileURLToPath(import.meta.url)` covers Node 18 the same way `__dirname`
// used to, without depending on Vite's bundled-config-loader shim that
// provided it automatically before.
const __dirname = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@/core': path.resolve(__dirname, `../core/src`),
      '@/components/Grid/layout-definition': path.resolve(__dirname, `../core/src/layout-definition`),
      '@': path.resolve(__dirname, `./src`),
    },
  },
  test: {
    environment: `jsdom`,
    globals: true,
    setupFiles: [`./tests/setup.ts`],
    include: [`tests/*.spec.ts`, `tests/unit/*.spec.ts`],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './tests/coverage',
      // Main library source only — demo app, sandbox, docs, config and
      // build output are all out of scope for the coverage gate.
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/vite-env.d.ts',
        // Pure type declarations: no JS is emitted for these, so there is
        // nothing runtime tests could ever cover.
        'src/components/Grid/grid-layout-props.interface.ts',
        'src/components/Grid/grid-item-props.interface.ts',
        'src/components/Grid/composables/grid-item-composable-context.ts',
        // The package's public barrel — pure re-exports, nothing in the
        // test suite imports through it directly (every spec file
        // imports the specific module it's testing). Same rationale as
        // the equivalent exclusion in packages/core/vitest.config.ts.
        // Genuine "does this barrel actually export what it claims"
        // coverage is a job for the pack-and-install smoke test
        // (scripts/check-package-install.js), not unit-test line
        // coverage.
        'src/components/index.ts',
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
