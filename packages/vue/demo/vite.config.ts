import { defineConfig } from 'vite';
import * as path from 'path';
import { fileURLToPath } from 'url';
import vue from '@vitejs/plugin-vue';

// See ../vitest.config.js's matching comment for why this isn't just
// `import.meta.dirname` directly — Node 18 (still supported per this
// project's own `engines.node`) doesn't have it.
const __dirname = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

// Standalone dev server for the showcase demo app.
// Imports the library straight from source via the `@` alias so the demo
// always reflects the current state of src/ without needing a build step.
export default defineConfig({
  root: path.resolve(__dirname),
  define: { 'process.env': {} },
  plugins: [vue()],
  resolve: {
    alias: {
      '@/core': path.resolve(__dirname, '../../core/src'),
      '@/components/Grid/layout-definition': path.resolve(__dirname, '../../core/src/layout-definition'),
      '@': path.resolve(__dirname, '../src'),
    },
  },
  server: {
    // Only auto-open for a real interactive dev session — this exact
    // command (`npm run demo`) is also what Playwright's own `webServer`
    // config starts before running the e2e suite, and CI shouldn't try
    // to launch a browser window there.
    open: !process.env.CI,
    port: 5174,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(__dirname, '../dist-demo'),
    emptyOutDir: true,
  },
});
