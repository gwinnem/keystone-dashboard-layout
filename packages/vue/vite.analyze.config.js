import { defineConfig } from 'vite';
import * as path from 'path';
import { fileURLToPath } from 'url';
import vue from '@vitejs/plugin-vue';
import { visualizer } from 'rollup-plugin-visualizer';

// See vitest.config.js's matching comment for why this isn't just
// `import.meta.dirname` directly — Node 18 (still supported per this
// project's own `engines.node`) doesn't have it.
const __dirname = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

/**
 * Bundle analysis build. Produces the same library output as vite.config.js,
 * plus a treemap report at dist-analyze/stats.html showing exactly which
 * dependency each byte of the published bundle comes from.
 *
 * Run with: npm run analyze
 */
export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: './dist-analyze',
    lib: {
      entry: path.resolve(__dirname, 'src/components/index.ts'),
      fileName: format => `vue-ts-responsive-grid-layout.${format}.js`,
      formats: ['es', 'umd'],
      name: 'vue-ts-responsive-grid-layout',
    },
    rollupOptions: {
      external: ['vue'],
      output: { globals: { vue: 'Vue' } },
    },
  },
  define: { 'process.env': {} },
  plugins: [
    vue(),
    visualizer({
      filename: 'dist-analyze/stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ],
  resolve: {
    alias: {
      '@/core': path.resolve(__dirname, '../core/src'),
      '@/components/Grid/layout-definition': path.resolve(__dirname, '../core/src/layout-definition'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
