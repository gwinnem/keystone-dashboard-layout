import { defineConfig } from 'vitest/config';

// No component implementation (and no tests) exist yet — passWithNoTests
// lets this scaffold package pass CI cleanly until real tests are added
// alongside the React port. The coverage thresholds below are already
// wired up to match every other package in this monorepo (90% minimum
// across lines/functions/branches/statements) — they simply don't run
// against anything yet, since v8 coverage only evaluates thresholds when
// tests actually execute. Do not remove or lower these once real
// component code lands here.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
