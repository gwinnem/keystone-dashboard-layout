/**
 * Declaration (.d.ts) guard for the pack-and-install smoke tests.
 *
 * The runtime smoke tests only prove that `exports` resolve and named
 * exports import. They say nothing about the published `.d.ts` files, and
 * every other test imports from source via the `@/` alias, so a declaration
 * pointing at a file that is not in the tarball ships unnoticed (that is
 * how `../../../core/src/...` leaked into Vue/React 1.0.0).
 *
 * Checks, against the package as installed in the scratch consumer:
 *   1. Every relative specifier in every `.d.ts` (`from '...'`,
 *      `import('...')`, `export ... from '...'`, `/// <reference path>`)
 *      resolves to a file inside the installed package. Any `core/src`
 *      reference fails explicitly.
 *   2. Every bare specifier starting with `keystone-dashboard-layout-core`
 *      resolves against the installed core package's `exports` map (covers
 *      the `./types/*` subpath).
 *
 * Usage (from a package's check-package-install.js):
 *   checkDeclarations({ installedRoot, scratchDir, log });
 * Returns the list of problems; empty means clean. The caller decides how
 * to fail.
 */
import { execSync } from 'child_process';
import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from 'fs';
import path from 'path';

const CORE_PACKAGE = 'keystone-dashboard-layout-core';

// `from '...'`, `import '...'`, `import('...')`, `export * from '...'`.
const SPECIFIER_RE = /(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"\n]+)\1/g;
const REFERENCE_RE = /\/\/\/\s*<reference\s+path\s*=\s*(['"])([^'"\n]+)\1/g;

function walkDts(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walkDts(full, out);
    else if (/\.d\.[cm]?ts$/.test(entry)) out.push(full);
  }
  return out;
}

function isFile(p) {
  return existsSync(p) && statSync(p).isFile();
}

/** Candidate files a TypeScript relative specifier may refer to. */
function relativeCandidates(base) {
  const stripped = base.replace(/\.[cm]?js$/, '');
  return [
    base,
    `${base}.d.ts`,
    `${base}.d.mts`,
    `${base}.d.cts`,
    path.join(base, 'index.d.ts'),
    `${stripped}.d.ts`,
    `${stripped}.d.mts`,
    `${stripped}.d.cts`,
  ];
}

function isInside(root, target) {
  const rel = path.relative(root, target);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** Resolve `specifier` against the installed core's `exports` map (types condition). */
function resolveAgainstCore(coreRoot, coreExports, specifier) {
  const subpath = specifier === CORE_PACKAGE ? '.' : `./${specifier.slice(CORE_PACKAGE.length + 1)}`;
  const target = (entry) => (typeof entry === 'string' ? entry : entry && entry.types);

  const exact = coreExports[subpath];
  if (exact !== undefined) {
    const t = target(exact);
    return t ? path.join(coreRoot, t) : null;
  }

  for (const [key, value] of Object.entries(coreExports)) {
    const star = key.indexOf('*');
    if (star === -1) continue;
    const prefix = key.slice(0, star);
    const suffix = key.slice(star + 1);
    if (subpath.startsWith(prefix) && subpath.endsWith(suffix) && subpath.length >= key.length - 1) {
      const t = target(value);
      if (!t) return null;
      const matched = subpath.slice(prefix.length, subpath.length - suffix.length);
      return path.join(coreRoot, t.replace('*', matched));
    }
  }
  return null;
}

export function checkDeclarations({ installedRoot, scratchDir, log = () => {} }) {
  const problems = [];
  const files = walkDts(installedRoot);
  log(`Checking declarations: ${files.length} .d.ts file(s)`);

  const coreRoot = path.join(scratchDir, 'node_modules', CORE_PACKAGE);
  let coreExports = null;
  const corePkgPath = path.join(coreRoot, 'package.json');
  if (existsSync(corePkgPath)) {
    coreExports = JSON.parse(readFileSync(corePkgPath, 'utf-8')).exports || {};
  }

  for (const file of files) {
    const rel = path.relative(installedRoot, file);
    const text = readFileSync(file, 'utf-8');
    const specifiers = [];
    for (const re of [SPECIFIER_RE, REFERENCE_RE]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) specifiers.push(m[2]);
    }

    for (const specifier of new Set(specifiers)) {
      if (/(?:^|\/)core\/src(?:\/|$)/.test(specifier)) {
        problems.push(`${rel}: "${specifier}" references core/src, which is not published`);
        continue;
      }

      if (specifier.startsWith('.')) {
        const base = path.resolve(path.dirname(file), specifier);
        const hit = relativeCandidates(base).find(isFile);
        if (!hit) {
          problems.push(`${rel}: "${specifier}" does not resolve to a file in the package`);
        } else if (!isInside(installedRoot, hit)) {
          problems.push(`${rel}: "${specifier}" resolves outside the package (${path.relative(installedRoot, hit)})`);
        }
        continue;
      }

      if (specifier === CORE_PACKAGE || specifier.startsWith(`${CORE_PACKAGE}/`)) {
        if (!coreExports) {
          problems.push(`${rel}: "${specifier}" but ${CORE_PACKAGE} is not installed next to the package`);
          continue;
        }
        const resolved = resolveAgainstCore(coreRoot, coreExports, specifier);
        if (!resolved || !isFile(resolved)) {
          problems.push(`${rel}: "${specifier}" does not resolve against the installed ${CORE_PACKAGE} exports`);
        }
      }
    }
  }

  return problems;
}

/**
 * Packs the sibling `packages/core` (`pnpm pack`) and copies the tarball into
 * the scratch directory, so the smoke test installs THIS repo's core next to
 * the package instead of whatever version npm happens to have published.
 * Without it, the declarations are checked against an older published core
 * and a `./types/*` export added in the same release can never be verified
 * before that release exists.
 *
 * The package's own `workspace:*` dependency on core is rewritten by
 * `pnpm pack` to core's current version, so npm treats the local tarball as
 * satisfying it and does not fetch core from the registry.
 *
 * Returns the path of the tarball inside `scratchDir`; throws if core has no build.
 */
export function packLocalCore({ packageRoot, scratchDir, log = () => {} }) {
  const coreRoot = path.resolve(packageRoot, '..', 'core');
  if (!existsSync(path.join(coreRoot, 'dist'))) {
    throw new Error('packages/core has no dist/. Build core first (`pnpm build`).');
  }
  const corePkg = JSON.parse(readFileSync(path.join(coreRoot, 'package.json'), 'utf-8'));
  const tarballName = `${corePkg.name}-${corePkg.version}.tgz`;
  const tarballPath = path.join(coreRoot, tarballName);

  log(`Packing local ${corePkg.name}@${corePkg.version}...`);
  execSync('pnpm pack', { cwd: coreRoot, stdio: 'pipe' });
  if (!existsSync(tarballPath)) {
    throw new Error(`Expected core tarball not found after pack: ${tarballPath}`);
  }

  const scratchTarball = path.join(scratchDir, tarballName);
  copyFileSync(tarballPath, scratchTarball);
  rmSync(tarballPath);
  return scratchTarball;
}
