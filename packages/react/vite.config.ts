import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// See packages/core/vite.config.ts's matching comment for why this isn't
// just `import.meta.dirname` directly — Node 18 (still supported per this
// monorepo's own `engines.node`) doesn't have it.
const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Reaches directly into `@keystone-dashboard-layout/core`'s own
      // *source* tree — not the built package (which only exposes its
      // single `"."` barrel export per its own `package.json#exports`,
      // deliberately excluding the cross-grid registry: a runtime
      // coordination singleton tied to component lifecycle, not a pure
      // calculation — see that barrel's own header comment). Same exact
      // alias, and same rationale, as the Vue package's own
      // `vite.config.js`/`vitest.config.js` — Phase 6's own
      // `useCrossGridDrag.ts` needs `registerCrossGridZone`/
      // `findCrossGridZoneAt`/`ICrossGridZone` from
      // `@/core/gridlayout/helpers/cross-grid-registry`, reachable no
      // other way.
      '@/core': resolve(__dirname, '../core/src'),
    },
  },
  plugins: [
    react(),
    dts({
      entryRoot: 'src',
      outDir: 'dist/types',
      // Uses the dedicated build-types config, not the plain
      // `tsconfig.json`, purely to exclude test files from the real
      // declaration build (see that config's own `exclude` list) —
      // both configs now share the same `rootDir: '..'` (inherited from
      // `tsconfig.json`, not re-narrowed), matching the Vue package's
      // own resolution of the identical TS6059 cross-package rootDir
      // issue. `entryRoot: 'src'` here (a vite-plugin-dts option, not a
      // TypeScript compiler option) is what actually controls where
      // emitted `.d.ts` files land, independent of either tsconfig's
      // own `rootDir` — so the shared, widened `rootDir` doesn't shift
      // output paths.
      tsconfigPath: './tsconfig.build-types.json',
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'KeystoneDashboardLayoutReact',
      fileName: (format) => `keystone-dashboard-layout-react.${format}.js`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      // 'react/jsx-runtime' (and its dev-mode counterpart) must be
      // externalized explicitly — they're separate import specifiers
      // from plain 'react', so listing only 'react'/'react-dom' here
      // left the JSX runtime's own source bundled directly into the
      // output instead. That inlined copy contains a genuine
      // `require('react')` call (baked into React's own jsx-runtime
      // internals), which rolldown/Rollup wraps in a CJS-interop shim
      // that throws in any pure-ESM environment with no real
      // `require` available (confirmed directly: Astro's SSR module
      // runner failed with exactly this error before this fix).
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
      output: {
        // Explicit names for all four externals, including the two
        // JSX-runtime entries added above — without these, Rollup can't
        // guess a global variable name for a bare `<script>`-tag/UMD
        // consumer and emits a [MISSING_GLOBAL_NAME] build warning
        // (confirmed directly, not assumed). These two specifically are
        // unlikely to ever be reached in practice for a raw-script-tag
        // consumer (JSX requires a build step regardless of module
        // format), but naming them keeps the build warning-free rather
        // than leaving a guessed fallback name in place.
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'ReactJSXRuntime',
          'react/jsx-dev-runtime': 'ReactJSXDevRuntime',
        },
      },
    },
  },
});
