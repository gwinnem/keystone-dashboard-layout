#!/usr/bin/env node
/**
 * Pack-and-install smoke test — the one check that verifies the
 * *published* package works, not just `src/`. Adapted directly from
 * packages/vue/scripts/check-package-install.js — same mechanism and
 * rationale, pointed at this package's own shape (Angular Package
 * Format via ng-packagr, `@angular/core`/`@angular/common`/`rxjs` as
 * peer dependencies rather than a single UI-framework peer).
 *
 * What this does, concretely: `pnpm pack` the current package, install
 * the resulting tarball into a genuinely separate scratch directory (no
 * shared node_modules, no source aliasing), then confirm every `exports`
 * subpath resolves to a real file and the main entry's expected named
 * exports actually import successfully.
 *
 * Run after `npm run build` — this checks the built `dist/` output as
 * packaged, not the raw source.
 *
 * Packs from THIS package's own root (`packages/angular/`), not from
 * `dist/keystone-dashboard-layout-angular/` directly — an earlier
 * version of this script packed from that nested `ng-packagr` output
 * directory instead, which was a real, confirmed mismatch with how this
 * package is actually released: the real release pipeline
 * (`@anolilab/semantic-release-pnpm`, invoked from this exact directory
 * per `.github/workflows/release.yml`) packs and publishes from here,
 * using this file's own `package.json` — whose `files` array already
 * declares `dist/keystone-dashboard-layout-angular/*` as what gets
 * included, `main`/`types` pointing at paths inside it. Packing from
 * the nested directory instead tested a different, non-representative
 * artifact — and `dist/keystone-dashboard-layout-angular/` isn't even a
 * declared pnpm workspace member on its own, so `pnpm pack` run there
 * couldn't reliably resolve the `workspace:*` protocol below at all.
 */
import { execSync, execFileSync } from 'child_process';
import { existsSync, mkdtempSync, rmSync, readFileSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Kept in sync with packages/angular/src/index.ts's own export list —
// update both together if that file's own exports ever change.
const EXPECTED_NAMED_EXPORTS = [
  'GridLayoutComponent',
  'GridItemComponent',
  'GridItemHeaderDirective',
  'GridLayoutStorageService',
  'GridLayoutPresetsService',
  'GridItemDragHandleComponent',
  'GridItemCloseButtonComponent',
];

function log(msg) {
  console.log(`[pack-install-smoke] ${msg}`);
}

function fail(msg) {
  console.error(`[pack-install-smoke] FAILED: ${msg}`);
  process.exit(1);
}

if (!existsSync(path.join(ROOT, 'dist', 'keystone-dashboard-layout-angular'))) {
  fail('Expected build output not found at dist/keystone-dashboard-layout-angular/. Run `npm run build` first.');
}

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
let scratchDir;
let tarballName;

try {
  log('Packing tarball...');
  // Deliberately `pnpm pack`, not `npm pack` — a real, confirmed bug
  // found via a live run of this exact script, not a stylistic
  // preference: this package's own `dependencies` includes
  // `"keystone-dashboard-layout-core": "workspace:*"`, a pnpm-specific
  // protocol plain `npm` has no concept of at all. `npm pack` copies
  // that literal string into the tarball's own package.json unchanged;
  // installing that tarball then fails outright with
  // `EUNSUPPORTEDPROTOCOL: Unsupported URL Type "workspace:"`, since npm
  // doesn't know how to resolve it. `pnpm pack` performs the same
  // workspace-protocol-to-real-version rewrite `pnpm publish` does
  // before packing, so this tarball's own package.json ends up with the
  // same, real, resolvable version a genuine release would — exactly
  // what this script exists to verify. The following `npm install` step
  // deliberately stays plain `npm`, not `pnpm` — simulating what an
  // actual downstream consumer using npm (not pnpm) would experience.
  execSync('pnpm pack', { cwd: ROOT });
  // Known, expected limitation until keystone-dashboard-layout-core's
  // own first real npm release: the `npm install` below now correctly
  // resolves the rewritten "workspace:*" -> a real version number (e.g.
  // "0.1.0"), confirmed via a live run — but npm then tries to fetch
  // that exact version of `core` from the real npm registry, which
  // 404s until `core` has actually been published there at least once.
  // Not a bug in this script; nothing to fix here until that first
  // publish happens.
  tarballName = `${pkg.name.replace(/^@/, '').replace(/\//g, '-')}-${pkg.version}.tgz`;
  if (!existsSync(path.join(ROOT, tarballName))) {
    fail(`Expected tarball not found after \`pnpm pack\`: ${tarballName}`);
  }
  const tarballPath = path.join(ROOT, tarballName);

  scratchDir = mkdtempSync(path.join(tmpdir(), 'pack-install-smoke-'));
  log(`Installing into scratch directory: ${scratchDir}`);

  const scratchTarball = path.join(scratchDir, tarballName);
  copyFileSync(tarballPath, scratchTarball);

  execSync('npm init -y', { cwd: scratchDir, stdio: 'ignore' });
  try {
    execSync(
      `npm install ${JSON.stringify(scratchTarball)} @angular/core@^19 @angular/common@^19 rxjs@^7 zone.js@^0.15`,
      { cwd: scratchDir, encoding: 'utf-8' },
    );
  } catch (err) {
    fail(`npm install into the scratch directory failed:\n${err.stdout || ''}\n${err.stderr || ''}`);
  }

  const installedRoot = path.join(scratchDir, 'node_modules', pkg.name);
  if (!existsSync(installedRoot)) {
    fail(`Package did not install to the expected location: ${installedRoot}`);
  }

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
