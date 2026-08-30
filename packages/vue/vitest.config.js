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
  // Explicit, not left to Vite/Vitest's own default (`process.cwd()`
  // at invocation time) — a real, confirmed bug found via a live
  // Stryker mutation-testing run: when Stryker itself is invoked from
  // the monorepo root (see stryker.conf.json's own '_comment_known_
  // limitation' for why that's necessary at all — the sibling
  // packages/core dependency below needs to fall inside Stryker's own
  // sandbox discovery scope), `process.cwd()` no longer matches this
  // file's own directory, so `test.include` below (a relative glob)
  // silently resolved against the wrong root entirely and matched
  // nothing. Anchoring `root` to this config file's own location keeps
  // every relative path below correct regardless of where the
  // encompassing process happens to have been invoked from.
  root: __dirname,
  plugins: [vue()],
  resolve: {
    // `preserveSymlinks: true` — a fix for a real, confirmed bug found
    // via mutation testing, not present in normal `pnpm test`/
    // `pnpm test:coverage` runs: those always run from this package's
    // own real, on-disk directory, but Stryker's own sandbox copies
    // this package into a temp directory and re-links `node_modules`
    // back to the real one via a symlink (its own default behavior).
    // `@vue/compiler-sfc`'s own type-resolution for `defineEmits<T>()`/
    // `defineProps<T>()` (used by src/components/common/CustomCloseButton.vue,
    // GridItem.vue, GridLayout.vue, all three importing a real, value-level
    // enum type from the sibling `@/core` alias) failed there specifically
    // with '[@vue/compiler-sfc] Failed to resolve import source
    // "@/core/griditem/enums/EGridItemEvents"' — confirmed, via a direct,
    // side-by-side comparison, to reproduce ONLY when run from inside a
    // Stryker sandbox (with its symlinked node_modules), never when run
    // from the real directory with the exact same coverage flags. The
    // most likely mechanism: this resolution path calls Node's own
    // symlink-following (`fs.realpath`-style) logic at some point, which
    // would silently "escape" the sandbox back to this file's own real,
    // non-sandboxed location on disk, breaking the relative-path math
    // this alias otherwise depends on. `preserveSymlinks: true` tells
    // Vite (and, transitively, `@vitejs/plugin-vue`'s own resolution) to
    // treat a symlink's own location as authoritative instead of
    // resolving through it, keeping every path consistently inside
    // wherever this config file itself actually is — the sandbox, when
    // run there; this package's own real directory otherwise.
    preserveSymlinks: true,
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
