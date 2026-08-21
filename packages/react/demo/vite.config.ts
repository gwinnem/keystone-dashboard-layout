import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// See ../vite.config.ts's matching comment for why this isn't just
// `import.meta.dirname` directly — Node 18 (still supported per this
// monorepo's own `engines.node`) doesn't have it.
const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));

/**
 * Standalone dev server for the showcase/manual-testing demo app — see
 * docs/DEMO_APP_IMPLEMENTATION_PLAN.md for the full rationale. Distinct
 * from `../e2e-fixture/vite.config.ts`, which exists purely to feed
 * Playwright's own automated suite (no descriptive copy, minimal
 * styling); this one is for a human — or an agent driving Chrome — to
 * actually explore every prop.
 *
 * Imports the library straight from `../src` (each view imports from
 * `../../src/index`, matching `e2e-fixture`'s own established pattern
 * — importing the *barrel* file specifically, not a component
 * directly, since only the barrel's own top-level `import
 * './styles/index.css'` side effect actually pulls in the library's
 * real positioning/transition CSS), so the demo always reflects
 * current, uncompiled source with no build step in between.
 *
 * Port 5176 — distinct from Vue's own demo (5174) and this package's
 * own `e2e-fixture` (5175), so all three can run simultaneously
 * without a port clash.
 */
export default defineConfig({
  root: resolve(__dirname),
  plugins: [react()],
  server: {
    // Only auto-open for a real interactive dev session — CI (and any
    // future demo-specific Playwright suite pointing its own
    // `webServer` config at this same `npm run demo` command, per the
    // implementation plan's own "Testability" section) shouldn't try
    // to launch a browser window.
    open: !process.env.CI,
    port: 5176,
    strictPort: true,
  },
  build: {
    outDir: resolve(__dirname, '../dist-demo'),
    emptyOutDir: true,
  },
});
