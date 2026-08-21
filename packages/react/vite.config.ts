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
      // `tsconfig.json` — that plain config's own `rootDir` is
      // deliberately widened to `.` (this package's own root, covering
      // both `src/` and `tests/`) to silence an editor/`tsc --noEmit`
      // diagnostic caused by `tests/setup.ts` being reachable from
      // `src/components/Grid/__tests__/test-helpers.ts`. Using that
      // same widened root for the *real* declaration build would
      // reproduce the exact "emitted .d.ts lands one directory too
      // deep" bug already found and fixed once in `packages/core`'s
      // own `vite.config.ts` (see that file's matching comment) — this
      // dedicated config keeps `rootDir` at `src` specifically for the
      // real build, unaffected by the editor-only widening.
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
      external: ['react', 'react-dom'],
      output: {
        globals: { react: 'React', 'react-dom': 'ReactDOM' },
      },
    },
  },
});
