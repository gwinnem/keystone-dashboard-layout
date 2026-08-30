#!/usr/bin/env node
/**
 * Bundle size regression check — run after `npm run build`.
 *
 * Fails (non-zero exit) if the published ES bundle's gzipped size grows
 * past a threshold without an explicit bump to that threshold in this
 * file. Adapted directly from packages/vue/scripts/check-bundle-size.js
 * — same mechanism, same rationale (an unnoticed dependency import
 * silently doubling the bundle size between releases), pointed at this
 * package's own build output instead.
 *
 * IMPORTANT, unverified budget: BUDGET_KB below has never been checked
 * against a real build of this package (this script itself has never
 * been run) — it's a deliberately generous placeholder, not a measured
 * baseline the way Vue's own budget is. Run this once against a real
 * build, note the actual gzipped size in this comment (matching Vue's
 * own "Current measured size" convention), and tighten BUDGET_KB to a
 * real headroom-above-baseline value rather than leaving this guess in
 * place indefinitely.
 */
import { gzipSync } from 'zlib';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE_PATH = path.resolve(__dirname, '../dist/keystone-dashboard-layout-react.es.js');

// Unverified placeholder — see this file's own top comment.
const BUDGET_KB = 60;

function formatKb(bytes) {
  return (bytes / 1024).toFixed(2);
}

if (!existsSync(BUNDLE_PATH)) {
  console.error(`[bundle-size] Expected build output not found at ${BUNDLE_PATH}`);
  console.error('[bundle-size] Run `npm run build` first.');
  process.exit(1);
}

const raw = readFileSync(BUNDLE_PATH);
const gzipped = gzipSync(raw, { level: 9 });

const rawKb = formatKb(raw.length);
const gzipKb = formatKb(gzipped.length);
const budgetBytes = BUDGET_KB * 1024;

console.log(`[bundle-size] keystone-dashboard-layout-react.es.js: ${rawKb} KB raw / ${gzipKb} KB gzip`);
console.log(`[bundle-size] Budget: ${BUDGET_KB} KB gzip (unverified placeholder — see this script's own top comment)`);

if (gzipped.length > budgetBytes) {
  console.error('');
  console.error(
    `[bundle-size] FAILED: ${gzipKb} KB gzip exceeds the ${BUDGET_KB} KB budget ` +
      `(over by ${formatKb(gzipped.length - budgetBytes)} KB).`,
  );
  console.error(
    '[bundle-size] If this growth is expected (a real feature that needs the extra ' +
      'bytes), bump BUDGET_KB in scripts/check-bundle-size.js in this PR, with a reason.',
  );
  process.exit(1);
}

console.log(`[bundle-size] OK — ${formatKb(budgetBytes - gzipped.length)} KB under budget.`);
