#!/usr/bin/env node
/**
 * Pack-and-install smoke test — the one check in this project that
 * verifies the *published* package works, not just `src/`.
 *
 * Every other test here (unit, component, e2e, mutation, visual) imports
 * from source via the `@/` alias — including the demo app, sandbox, and
 * every VitePress example. None of them go through `package.json`'s
 * `exports` field the way an actual `npm install`'d consumer would. That
 * gap is exactly what let a real, published-package-breaking bug ship
 * undetected through 98%+ source coverage: `exports`'s `./style.css`
 * entry pointed at a file that doesn't exist (see docs/REFACTORING.md
 * #46). "Coverage of `src/`" and "the published artifact actually
 * resolves" are different claims, and only the first one was being
 * checked anywhere else in this project.
 *
 * What this does, concretely: `npm pack` the current source, install the
 * resulting tarball into a genuinely separate scratch directory (no
 * shared node_modules, no source aliasing — the only way to actually
 * exercise `exports` rather than quietly bypass it), then confirm every
 * `exports` subpath resolves to a real file and the main entry's expected
 * named exports actually import successfully.
 *
 * Run after `npm run build:only` (like check-bundle-size.js) — this
 * checks the built `dist/` output as packaged, not the raw source.
 */
import { execSync, execFileSync } from 'child_process';
import { existsSync, mkdtempSync, rmSync, readFileSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const EXPECTED_NAMED_EXPORTS = [
  'GridLayout',
  'GridItem',
  'CustomCloseButton',
  'CustomDragElement',
  'EGridItemEvent',
  'EGridLayoutEvent',
  'useLayoutStorage',
  'serializeLayout',
  'deserializeLayout',
  'useLayoutPresets',
  'readOutsideDropPayload',
  'exportLayoutAsSvg',
  'DEFAULT_ARIA_LABELS',
  'verticalCompactor',
  'noCompactor',
];

// Note: this used to also check a `./core` subpath (the framework-
// agnostic entry point). That entire directory has since been extracted
// into its own workspace package, @keystone-dashboard-layout/core (see
// ../core/) — this package no longer ships a `./core` export at all, so
// there's nothing left here to smoke-test for it. See vite.core.config.js
// for the full deprecation note.

function log(msg) {
  console.log(`[pack-install-smoke] ${msg}`);
}

function fail(msg) {
  console.error(`[pack-install-smoke] FAILED: ${msg}`);
  process.exit(1);
}

if (!existsSync(path.join(ROOT, 'dist'))) {
  fail('Expected build output not found at dist/. Run `npm run build:only` first.');
}

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
let scratchDir;
let tarballName;

try {
  log('Packing tarball...');
  // Deliberately `pnpm pack`, not `npm pack` — a real, confirmed bug
  // found via a live run, not a stylistic preference: this package's own
  // `dependencies` includes `"@keystone-dashboard-layout/core":
  // "workspace:*"`, a pnpm-specific protocol plain `npm` has no concept
  // of at all. `npm pack` copies that literal string into the tarball's
  // own package.json unchanged; a consumer's later `npm install` of that
  // tarball then fails outright with `EUNSUPPORTEDPROTOCOL: Unsupported
  // URL Type "workspace:"`, since npm doesn't know how to resolve it —
  // confirming that a plain `npm pack` here would let this same, real
  // publishing bug slip through undetected. `pnpm pack` performs the
  // same workspace-protocol-to-real-version rewrite `pnpm publish` does
  // before packing, so this tarball's own package.json ends up with the
  // same, real, resolvable version a genuine release would — exactly
  // what this script exists to verify. The following `npm install` step
  // deliberately stays plain `npm`, not `pnpm` — simulating what an
  // actual downstream consumer using npm (not pnpm) would experience.
  execSync('pnpm pack', { cwd: ROOT });
  // Known, expected limitation until @keystone-dashboard-layout/core's
  // own first real npm release: the `npm install` below now correctly
  // resolves the rewritten "workspace:*" -> a real version number (e.g.
  // "0.1.0"), confirmed via a live run — but npm then tries to fetch
  // that exact version of `core` from the real npm registry, which
  // 404s until `core` has actually been published there at least once.
  // Not a bug in this script; nothing to fix here until that first
  // publish happens.
  tarballName = `${pkg.name.replace(/^@/, '').replace(/\//g, '-')}-${pkg.version}.tgz`;
  if (!existsSync(path.join(ROOT, tarballName))) {
    fail(`Expected tarball not found after \`npm pack\`: ${tarballName}`);
  }
  const tarballPath = path.join(ROOT, tarballName);

  scratchDir = mkdtempSync(path.join(tmpdir(), 'pack-install-smoke-'));
  log(`Installing into scratch directory: ${scratchDir}`);

  const scratchTarball = path.join(scratchDir, tarballName);
  copyFileSync(tarballPath, scratchTarball);

  execSync('npm init -y', { cwd: scratchDir, stdio: 'ignore' });
  try {
    execSync(`npm install ${JSON.stringify(scratchTarball)} vue@^3`, {
      cwd: scratchDir,
      encoding: 'utf-8',
    });
  } catch (err) {
    fail(`npm install into the scratch directory failed:\n${err.stdout || ''}\n${err.stderr || ''}`);
  }

  const installedRoot = path.join(scratchDir, 'node_modules', pkg.name);
  if (!existsSync(installedRoot)) {
    fail(`Package did not install to the expected location: ${installedRoot}`);
  }

  // Resolve every declared exports subpath against the installed package,
  // exactly the way Node's own module resolution would — not by reading
  // package.json and assuming, actually asking Node to resolve it.
  const exportsMap = pkg.exports || {};
  const subpaths = Object.keys(exportsMap);
  log(`Checking ${subpaths.length} exports subpath(s): ${subpaths.join(', ')}`);

  for (const subpath of subpaths) {
    const specifier = subpath === '.' ? pkg.name : `${pkg.name}/${subpath.replace(/^\.\//, '')}`;
    try {
      execFileSync('node', ['-e', `console.log(require.resolve(${JSON.stringify(specifier)}))`], {
        cwd: scratchDir,
        encoding: 'utf-8',
      });
      log(`  OK: "${subpath}" -> resolves`);
    } catch (err) {
      fail(`"${subpath}" (specifier "${specifier}") did not resolve.\n${err.stdout || err.message}`);
    }
  }

  // Beyond resolution: confirm the main entry's actual named exports are
  // present after a real import, not just that the file exists.
  log('Checking named exports on the main entry...');
  const checkScript = `
    import(${JSON.stringify(pkg.name)}).then((mod) => {
      const expected = ${JSON.stringify(EXPECTED_NAMED_EXPORTS)};
      const missing = expected.filter((name) => !(name in mod));
      if (missing.length > 0) {
        console.error('Missing named exports: ' + missing.join(', '));
        process.exit(1);
      }
      console.log('All expected named exports present: ' + expected.join(', '));
    }).catch((err) => {
      console.error('Import failed: ' + err.message);
      process.exit(1);
    });
  `;
  execFileSync('node', ['--input-type=module', '-e', checkScript], {
    cwd: scratchDir,
    encoding: 'utf-8',
    stdio: 'inherit',
  });

  log('All checks passed — the published package resolves and imports correctly.');
} catch (err) {
  fail(err.message || String(err));
} finally {
  if (tarballName && existsSync(path.join(ROOT, tarballName))) {
    rmSync(path.join(ROOT, tarballName));
  }
  if (scratchDir && existsSync(scratchDir)) {
    rmSync(scratchDir, { recursive: true, force: true });
  }
}
