#!/usr/bin/env node
/**
 * Bundle size regression check — run after `npm run build`.
 *
 * Adapted from packages/vue/scripts/check-bundle-size.js — same
 * rationale (an unnoticed dependency import silently doubling bundle
 * size between releases), but measuring differently: Vue's and React's
 * own scripts gzip one specific, known bundle file, since each has a
 * `main`/`module` field naming an exact filename to check. This
 * package's own build (`ng-packagr`, Angular Package Format) doesn't
 * offer an equally certain single filename to point at without actually
 * running the build first — `ng-package.json`'s own `lib.flatModuleFile`
 * is unset, so the generated FESM2022 bundle's own exact name isn't
 * knowable from configuration alone. Rather than hardcode a guessed
 * filename that might not exist, this instead sums the gzipped size of
 * every file under the whole package output directory — a coarser
 * measure, but one that doesn't depend on knowing ng-packagr's own
 * internal naming.
 *
 * IMPORTANT, unverified budget: BUDGET_KB below has never been checked
 * against a real build of this package (this script itself has never
 * been run). Run it once for real, note the actual measured total in
 * this comment, and tighten BUDGET_KB to a real headroom-above-baseline
 * value rather than leaving this guess in place indefinitely.
 */
import { gzipSync } from 'zlib';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../dist/keystone-dashboard-layout-angular');

// Unverified placeholder — see this file's own top comment.
const BUDGET_KB = 150;

function formatKb(bytes) {
  return (bytes / 1024).toFixed(2);
}

function collectFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(fullPath);
    }
    // .map files aren't shipped to a browser at runtime the way the
    // code itself is — excluded so this measures what a consumer
    // actually downloads, not debug metadata alongside it.
    return entry.name.endsWith('.map') ? [] : [fullPath];
  });
}

if (!existsSync(OUTPUT_DIR)) {
  console.error(`[bundle-size] Expected build output not found at ${OUTPUT_DIR}`);
  console.error('[bundle-size] Run `npm run build` first.');
  process.exit(1);
}

const files = collectFiles(OUTPUT_DIR);
let totalRaw = 0;
let totalGzip = 0;

for (const file of files) {
  const raw = readFileSync(file);
  totalRaw += raw.length;
  totalGzip += gzipSync(raw, { level: 9 }).length;
}

const rawKb = formatKb(totalRaw);
const gzipKb = formatKb(totalGzip);
const budgetBytes = BUDGET_KB * 1024;

console.log(`[bundle-size] keystone-dashboard-layout-angular (${files.length} files): ${rawKb} KB raw / ${gzipKb} KB gzip (summed, not a single-file bundle — see this script's own top comment)`);
console.log(`[bundle-size] Budget: ${BUDGET_KB} KB gzip (unverified placeholder — see this script's own top comment)`);

if (totalGzip > budgetBytes) {
  console.error('');
  console.error(
    `[bundle-size] FAILED: ${gzipKb} KB gzip exceeds the ${BUDGET_KB} KB budget ` +
      `(over by ${formatKb(totalGzip - budgetBytes)} KB).`,
  );
  console.error(
    '[bundle-size] If this growth is expected (a real feature that needs the extra ' +
      'bytes), bump BUDGET_KB in scripts/check-bundle-size.js in this PR, with a reason.',
  );
  process.exit(1);
}

console.log(`[bundle-size] OK — ${formatKb(budgetBytes - totalGzip)} KB under budget.`);
