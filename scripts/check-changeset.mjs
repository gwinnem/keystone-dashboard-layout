#!/usr/bin/env node
/**
 * Fails when a package's published source changed in this branch with no changeset recorded for it.
 *
 * "Changed" means a file under `packages/<name>/src/`, ignoring test files (`*.spec.*`, `*.test.*`, anything under `__tests__/`):
 * tests change nothing for a consumer, so by the project's own rule they need no changeset. Comparison is against the merge
 * base with the base branch (`git diff base...HEAD`), so only what this branch adds is looked at.
 *
 * A package passes when a changeset ADDED by this branch names it. A changeset that is already on the base branch does not
 * count: it was written for an earlier change. It also passes when the package's own CHANGELOG.md changed in this branch:
 * `pnpm version-packages` consumes the changesets (deleting the files) and writes that changelog, so a branch that has already
 * versioned its changes has no changeset file left to find. An EMPTY changeset (`pnpm changeset --empty`) means "this branch
 * deliberately needs no release" and passes for every package, which is the way out for refactors and the like.
 *
 * Usage: `node scripts/check-changeset.mjs [baseRef]`, or `pnpm run check:changeset`. The base ref defaults to `origin/main`
 * and can also come from the BASE_REF environment variable (CI sets it). It needs enough git history to find the merge base,
 * so a shallow clone has to be deepened first (CI checks out with `fetch-depth: 0`).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.argv[2] ?? process.env.BASE_REF ?? 'origin/main';

const SOURCE_FILE = /^packages\/([^/]+)\/src\//;
const TEST_FILE = /(^|\/)__tests__\/|\.(spec|test)\.[cm]?[jt]sx?$/;
const CHANGESET_FILE = /^\.changeset\/[^/]+\.md$/;
const CHANGELOG_FILE = /^packages\/([^/]+)\/CHANGELOG\.md$/;

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

let changedFiles;
let addedFiles;
try {
  changedFiles = git('diff', '--name-only', `${BASE}...HEAD`);
  addedFiles = git('diff', '--name-only', '--diff-filter=A', `${BASE}...HEAD`, '--', '.changeset');
} catch(error) {
  fail(`Could not compare against ${BASE}: ${error.message}\nThe base ref has to exist locally and the history has to reach the merge base (CI: fetch-depth: 0).`);
}

const changedByPackage = new Map();
for(const file of changedFiles) {
  const match = SOURCE_FILE.exec(file);
  if(match && !TEST_FILE.test(file)) {
    changedByPackage.set(match[1], [...(changedByPackage.get(match[1]) ?? []), file]);
  }
}

if(changedByPackage.size === 0) {
  console.log(`No package source changed against ${BASE}; no changeset needed.`);
  process.exit(0);
}

/** Package names listed in a changeset's frontmatter (`"name": patch`); empty for an empty changeset. */
function packagesNamedIn(file) {
  const match = /^---\r?\n([\s\S]*?)---/.exec(readFileSync(join(ROOT, file), 'utf8'));
  if(!match) {
    return [];
  }
  return match[1]
    .split('\n')
    .map(line => /^\s*"?([^":\s]+)"?\s*:\s*(major|minor|patch)\s*$/.exec(line))
    .filter(Boolean)
    .map(line => line[1]);
}

const named = new Set();
let declaredNoRelease = false;
for(const file of addedFiles.filter(entry => CHANGESET_FILE.test(entry))) {
  const packages = packagesNamedIn(file);
  if(packages.length === 0) {
    declaredNoRelease = true;
  }
  packages.forEach(name => named.add(name));
}

if(declaredNoRelease) {
  console.log('An empty changeset is present: this change is declared as needing no release.');
  process.exit(0);
}

// A changed CHANGELOG.md means `pnpm version-packages` already ran for that package in this branch, consuming its changesets.
const versioned = new Set(changedFiles.map(file => CHANGELOG_FILE.exec(file)?.[1]).filter(Boolean));

const missing = [...changedByPackage.keys()].filter(dir => {
  if(versioned.has(dir)) {
    return false;
  }
  const manifest = join(ROOT, 'packages', dir, 'package.json');
  return !existsSync(manifest) || !named.has(JSON.parse(readFileSync(manifest, 'utf8')).name);
});

if(missing.length === 0) {
  console.log(`Every changed package has a changeset: ${[...changedByPackage.keys()].join(', ')}.`);
  process.exit(0);
}

const details = missing.map(dir => {
  const files = changedByPackage.get(dir);
  const shown = files.slice(0, 3).map(file => `      ${file}`).join('\n');
  return `  packages/${dir}  (${files.length} source file${files.length === 1 ? '' : 's'} changed)\n${shown}${files.length > 3 ? '\n      ...' : ''}`;
});
fail(
  `Source changed with no changeset recorded for:\n\n${details.join('\n')}\n\n` +
  'Record one from each package directory with `pnpm changeset`, and commit the file with the change.\n' +
  'If this change needs no release (a refactor, say), add an empty changeset from the repo root: `pnpm changeset --empty`.',
);
