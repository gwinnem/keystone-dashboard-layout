#!/usr/bin/env node
/**
 * Bundle size regression check — run after `npm run build:only`.
 *
 * Fails (non-zero exit) if the published ES bundle's gzipped size grows
 * past a threshold without an explicit bump to that threshold in this
 * file. This exists specifically because of the class of regression
 * documented in docs/BUNDLE_ANALYSIS.md — an unnoticed dependency import
 * (e.g. the full `@interactjs/modifiers` barrel, or `element-resize-detector`
 * creeping back in) silently doubling the bundle size between releases.
 *
 * The threshold is deliberately a bit above the current measured size
 * (see docs/BUNDLE_ANALYSIS.md's "Headline numbers" section) — enough
 * headroom for normal, incremental growth, not so much that a real
 * regression slips through. When a *legitimate* increase happens (a new
 * feature that genuinely needs the extra bytes), bump `BUDGET_KB` below
 * in the same PR, with a one-line reason in the commit message.
 */
import { gzipSync } from 'zlib';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE_PATH = path.resolve(__dirname, '../dist/keystone-dashboard-layout-vue.es.js');

// Current measured size, re-confirmed via a direct build measurement:
// ~22.3 KB gzip (an earlier docs/BUNDLE_ANALYSIS.md-derived comment here
// claimed ~42.6 KB — that was stale; the real, current bundle is
// meaningfully smaller). 55 KB gives substantial headroom over this
// real baseline for normal, incremental growth before this needs
// another deliberate bump — consider tightening this budget closer to
// the real ~22-25 KB range if a tighter regression gate is wanted.
const BUDGET_KB = 55;

function formatKb(bytes) {
  return (bytes / 1024).toFixed(2);
}

if (!existsSync(BUNDLE_PATH)) {
  console.error(`[bundle-size] Expected build output not found at ${BUNDLE_PATH}`);
  console.error('[bundle-size] Run `npm run build:only` first.');
  process.exit(1);
}

const raw = readFileSync(BUNDLE_PATH);
const gzipped = gzipSync(raw, { level: 9 });

const rawKb = formatKb(raw.length);
const gzipKb = formatKb(gzipped.length);
const budgetBytes = BUDGET_KB * 1024;

console.log(`[bundle-size] keystone-dashboard-layout-vue.es.js: ${rawKb} KB raw / ${gzipKb} KB gzip`);
console.log(`[bundle-size] Budget: ${BUDGET_KB} KB gzip`);

if (gzipped.length > budgetBytes) {
  console.error('');
  console.error(
    `[bundle-size] FAILED: ${gzipKb} KB gzip exceeds the ${BUDGET_KB} KB budget ` +
      `(over by ${formatKb(gzipped.length - budgetBytes)} KB).`,
  );
  console.error(
    '[bundle-size] If this growth is expected (a real feature that needs the extra ' +
      'bytes), bump BUDGET_KB in scripts/check-bundle-size.js in this PR, with a reason. ' +
      'Otherwise, see docs/BUNDLE_ANALYSIS.md for likely culprits (an unscoped dependency ' +
      'import is the most common cause here historically).',
  );
  process.exit(1);
}

console.log(`[bundle-size] OK — ${formatKb(budgetBytes - gzipped.length)} KB under budget.`);
