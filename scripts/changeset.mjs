#!/usr/bin/env node
/**
 * Records a changeset for the package it is run from: asks which version the package is being updated to and for a one-line
 * summary, then writes `.changeset/<name>-<id>.md`. `changeset version` later consumes these files to bump the version and
 * write the package's CHANGELOG.md.
 *
 * Run it from a package directory: `pnpm changeset` (each package's package.json points here). The root `pnpm changeset`
 * is the stock Changesets CLI, for status and for changes spanning several packages.
 *
 * Changesets records a bump LEVEL (patch, minor, major), not a literal version, so the choices below are those three levels,
 * each shown with the version it produces from the current one. Typing a version is accepted when it is one of the three.
 * If several changesets are pending for one package, the highest bump wins and is applied once, not once per changeset.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = join(ROOT, 'packages');
const CHANGESET_DIR = join(ROOT, '.changeset');
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

if(!stdin.isTTY) {
  fail('This script is interactive and needs a terminal.');
}
if(dirname(process.cwd()) !== PACKAGES_DIR || !existsSync(join(process.cwd(), 'package.json'))) {
  fail(`Run this from a package directory (packages/<name>), e.g. \`pnpm changeset\`. Current directory: ${process.cwd()}`);
}
if(!existsSync(join(CHANGESET_DIR, 'config.json'))) {
  fail(`${CHANGESET_DIR} has no config.json: Changesets is not set up.`);
}

const { name, version } = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
const match = SEMVER.exec(version);
if(!match) {
  fail(`${name} is at version "${version}". This script only handles plain MAJOR.MINOR.PATCH versions (no pre-release tags).`);
}
const [major, minor, patch] = match.slice(1).map(Number);

const choices = [
  { bump: 'patch', next: `${major}.${minor}.${patch + 1}`, note: 'bug fix, nothing changes for consumers' },
  { bump: 'minor', next: `${major}.${minor + 1}.0`, note: 'new backwards-compatible feature' },
  { bump: 'major', next: `${major + 1}.0.0`, note: 'breaking change' },
];

function pick(answer) {
  const text = answer.trim().toLowerCase();
  return choices.find((choice, index) => text === String(index + 1) || text === choice.bump || text === choice.next);
}

const rl = createInterface({ input: stdin, output: stdout });
try {
  console.log(`\n${name} is at ${version}. Which version is it being updated to?\n`);
  choices.forEach((choice, index) => {
    console.log(`  ${index + 1}) ${choice.bump.padEnd(5)} -> ${choice.next.padEnd(10)} ${choice.note}`);
  });
  console.log('');

  let chosen;
  while(!chosen) {
    chosen = pick(await rl.question('Choose 1-3, a bump name, or one of the versions above: '));
    if(!chosen) {
      console.log('Not one of the options.');
    }
  }

  let summary = '';
  while(!summary) {
    summary = (await rl.question('One-line summary for the changelog: ')).trim();
    if(!summary) {
      console.log('A summary is required.');
    }
  }

  const id = `${name.replace(/^keystone-dashboard-layout-/, '')}-${randomBytes(4).toString('hex')}`;
  const file = join(CHANGESET_DIR, `${id}.md`);
  writeFileSync(file, `---\n"${name}": ${chosen.bump}\n---\n\n${summary}\n`, 'utf8');

  console.log(`\nRecorded ${chosen.bump} (${version} -> ${chosen.next}) for ${name}:\n  ${file}`);
  console.log('Commit it together with the change it describes.');
} finally {
  rl.close();
}
