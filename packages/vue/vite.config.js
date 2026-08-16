import { defineConfig } from 'vite';
import * as path from 'path';
import { fileURLToPath } from 'url';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

// See vitest.config.js's matching comment for why this isn't just
// `import.meta.dirname` directly — Node 18 (still supported per this
// project's own `engines.node`) doesn't have it.
const __dirname = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, `src/components/index.ts`),
      fileName: format => `vue-ts-responsive-grid-layout.${format}.js`,
      formats: [
        `es`,
        `umd`,
      ],
      name: `vue-ts-responsive-grid-layout`,
    },
    outDir: `./dist`,
    rollupOptions: {
      external: [`vue`],
      output: {
        globals: {
          vue: `Vue`,
        },
      },
    },
  },
  define: { 'process.env': {} },
  plugins: [
    vue(),
    // Generates dist/types/**, rewriting the `@/*` path alias to real
    // relative imports in the emitted .d.ts files — `vue-tsc
    // --emitDeclarationOnly` alone preserves the alias verbatim, which
    // resolves fine inside this repo but is a nonexistent module path for
    // anyone consuming the published package (see docs/REFACTORING.md).
    // `vite-plugin-dts` was already a devDependency but wasn't wired up
    // anywhere before this.
    dts({
      entryRoot: `src`,
      outDir: `dist/types`,
      tsconfigPath: `./tsconfig.build-types.json`,
    }),
  ],
  resolve: {
    alias: {
      // Order matters here: Vite/rollup-plugin-alias matches in insertion
      // order and stops at the first hit, so these more-specific entries
      // (pointing into the extracted @keystone-dashboard-layout/core
      // package) must come before the generic '@' catch-all below, or
      // they'd never be reached.
      '@/core': path.resolve(__dirname, `../core/src`),
      '@/components/Grid/layout-definition': path.resolve(__dirname, `../core/src/layout-definition`),
      '@': path.resolve(__dirname, `./src`),
    },
  },
  server: {
    // Only auto-open for a real interactive dev session — CI (and
    // Playwright's own `webServer`, which starts this exact command)
    // shouldn't try to launch a browser window.
    open: !process.env.CI,
    port: 9000,
  },
});
