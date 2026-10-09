#!/usr/bin/env node
/**
 * Production-dependency license check, run once per package under `packages/`.
 *
 * Why per package, not once from the repo root: the root `package.json` has no `dependencies` of its own (only
 * `devDependencies`), so `license-checker --production` run from there scans an empty set and passes whatever the licenses
 * are. What actually ships to consumers is declared in each package's own `dependencies`, so that is where the scan has
 * to start. Dev-only tooling is deliberately out of scope: it never reaches anyone who installs a published package.
 *
 * The allowlist is permissive licenses only. It exists mainly to catch a copyleft license sneaking in, which would put
 * obligations on every consumer of a published package. Add a license to ALLOWED only after deciding that it is
 * acceptable for a published package, not to make a failing run go green.
 *
 * Usage: `pnpm run check:licenses` (from anywhere in the repo). Exits non-zero if any package fails.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED = ['MIT', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Apache-2.0', '0BSD', 'CC0-1.0', 'Unlicense'];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = join(ROOT, 'packages');

const packageDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && existsSync(join(PACKAGES_DIR, entry.name, 'package.json')))
  .map(entry => join('packages', entry.name));

if(packageDirs.length === 0) {
  console.error(`No packages found under ${PACKAGES_DIR}; refusing to report a pass for a scan that looked at nothing.`);
  process.exit(1);
}

const failed = [];
for(const dir of packageDirs) {
  console.log(`\n== ${dir} ==`);
  // One command string rather than a command plus an args array: Node deprecates the array form together with `shell: true` (DEP0190),
  // as the arguments are then concatenated unescaped. The shell is needed so `pnpm` resolves on Windows (a .cmd shim there), and the
  // allowlist is quoted because its `;` separators would otherwise end the command.
  const command = [
    'pnpm exec license-checker-rseidelsohn',
    `--start "${dir}"`,
    '--production',
    '--excludePrivatePackages',
    `--onlyAllow "${ALLOWED.join(';')}"`,
    '--summary',
  ].join(' ');
  const result = spawnSync(command, {
    cwd: ROOT,
    // license-checker-rseidelsohn passes an invalid argument type to fs.existsSync, which Node reports as DEP0187 once per scan. It is
    // harmless and not ours to fix, so only that one warning is silenced for the scan; every other warning still shows.
    env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --disable-warning=DEP0187`.trim() },
    shell: true,
    stdio: 'inherit',
  });
  if(result.status !== 0) {
    failed.push(dir);
  }
}

if(failed.length > 0) {
  console.error(`\nLicense check FAILED for: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`\nLicense check passed for ${packageDirs.length} packages (allowed: ${ALLOWED.join(', ')}).`);
