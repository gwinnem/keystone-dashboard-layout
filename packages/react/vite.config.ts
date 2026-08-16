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
  plugins: [react(), dts({ tsconfigPath: './tsconfig.json', outDir: 'dist/types' })],
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
