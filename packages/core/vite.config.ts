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
      // A real, confirmed limitation this addresses: ng-packagr's own
      // Ivy partial-compilation pipeline (packages/angular's own build)
      // fails to resolve this package's own "exports" subpaths when
      // they point directly at raw, uncompiled .ts source — a TS2307
      // "Cannot find module" error, even with matching tsconfig `paths`
      // entries added on the Angular package's own side (confirmed not
      // the fix: the error persisted unchanged after that attempt, and
      // again after an explicit `baseUrl` was added too). Vue's and
      // React's own Vite-based builds tolerate the raw-source subpath
      // fine — this is specific to ng-packagr's own, stricter,
      // publish-oriented module resolution, which expects a dependency's
      // own exports to already be compiled artifacts, the same as every
      // other subpath here already is. Adding these two files as their
      // own real library entry points (compiled to real .js + .d.ts
      // output, exactly like the main `index` entry already is) is the
      // actual fix, matching the pattern this package's own `exports`
      // map already uses everywhere else — not another workaround on
      // the consuming (Angular) package's own side.
      entry: {
        'cross-grid-interfaces': path.resolve(__dirname, 'src/gridlayout/interfaces/cross-grid.interfaces.ts'),
        'cross-grid-registry': path.resolve(__dirname, 'src/gridlayout/helpers/cross-grid-registry.ts'),
        index: path.resolve(__dirname, 'src/index.ts'),
      },
      // Preserves the main `index` entry's own existing, already-
      // published filename exactly (`keystone-dashboard-layout-core.
      // {format}.js`) — Vue and React both already depend on this exact
      // name. The two new entries get their own, predictable names
      // instead, matched by `package.json`'s own updated `exports` map.
      fileName: (format, entryName) => (entryName === `index` ? `keystone-dashboard-layout-core.${format}.js` : `${entryName}.${format}.js`),
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
