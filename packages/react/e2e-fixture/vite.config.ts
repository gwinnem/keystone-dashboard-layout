import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// See ../vite.config.ts's matching comment for why this isn't just
// `import.meta.dirname` directly — Node 18 (still supported per this
// monorepo's own `engines.node`) doesn't have it.
const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));

/**
 * Standalone dev server for the e2e Playwright test fixture — not a
 * demo app. Imports the library straight from `../src` (via relative
 * imports in each scenario, and the `@/core` alias below for the
 * shared package's own source) so Playwright always exercises current,
 * uncompiled source, matching the Vue package's own
 * `demo/vite.config.ts` "no build step" rationale for its own e2e
 * target — without any of that file's own showcase-app scaffolding
 * (nav copy, feature descriptions, styling).
 */
export default defineConfig({
  root: resolve(__dirname),
  plugins: [react()],
  resolve: {
    alias: {
      '@/core': resolve(__dirname, '../../core/src'),
    },
  },
  server: {
    open: !process.env.CI,
    port: 5175,
    strictPort: true,
  },
  build: {
    outDir: resolve(__dirname, '../dist-e2e-fixture'),
    emptyOutDir: true,
  },
});
