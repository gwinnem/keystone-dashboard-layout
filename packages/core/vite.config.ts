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
      tsconfigPath: './tsconfig.json',
    }),
  ],
  resolve: {
    alias: {
      '@/core': path.resolve(__dirname, './src'),
    },
  },
});
