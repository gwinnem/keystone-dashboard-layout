import { defineConfig } from 'vite';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dts from 'vite-plugin-dts';

// `import.meta.dirname` (Node >=20.11/21.2) is what Vite's newer
// `configLoader: 'native'` mode requires instead of the CJS-only
// `__dirname` global — falling back to `fileURLToPath(import.meta.url)`
// keeps this working on Node 18, still supported per this monorepo's
// `engines.node`.
const __dirname = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

// Builds `@keystone-dashboard-layout/core` — pure grid-layout algorithms,
// zero framework dependency, usable standalone (validating a layout
// server-side, computing collisions/compaction for a batch job, or as the
// shared foundation the Vue/React/Angular packages in this monorepo build
// their framework-specific components on top of).
//
// The `@/core/*` alias below exists purely so every file moved here from
// packages/vue/src/core keeps its original internal import paths
// unchanged (e.g. `@/core/gridlayout/helpers/collision-helper`) — this
// package's own `src/` root corresponds to what used to be `src/core/`
// inside the Vue package.
export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      fileName: format => `keystone-dashboard-layout-core.${format}.js`,
      formats: ['es', 'cjs'],
      name: 'KeystoneDashboardLayoutCore',
    },
    outDir: './dist',
    rollupOptions: {
      // No external/globals needed — zero runtime dependencies, by design.
    },
  },
  define: { 'process.env': {} },
  plugins: [
    dts({
      entryRoot: 'src',
      outDir: 'dist/types',
      // Bug fix: the plain `./tsconfig.json` (used here previously) has
      // no explicit `rootDir` set, only `declarationDir` — without it,
      // vite-plugin-dts's own `entryRoot: 'src'` option was silently
      // ineffective, and every emitted .d.ts landed one directory
      // deeper than expected (`dist/types/src/index.d.ts`, not
      // `dist/types/index.d.ts`), not matching this package's own
      // `package.json` `types`/`exports` fields at all — the exact same
      // class of bug the Vue package's own `tsconfig.build-types.json`
      // already exists to fix (see its own comment) for the identical
      // reason. Never caught before now because nothing actually
      // consumed this package's own *built* output until the React
      // package started importing it via its real published name —
      // Vue's own build bypasses this package's dist entirely via a
      // source-path alias (see this file's own `resolve.alias` below).
      tsconfigPath: './tsconfig.build-types.json',
    }),
  ],
  resolve: {
    alias: {
      '@/core': path.resolve(__dirname, './src'),
    },
  },
});
