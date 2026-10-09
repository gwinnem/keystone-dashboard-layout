# Changelogs, changesets and releases

How a change in this repository becomes a versioned, published release with a changelog entry. Versions and changelogs
come from **Changesets**; commit messages play no part in them.

## The short version

| Step | Command | Where | When |
| --- | --- | --- | --- |
| 1. Record a change | `pnpm changeset` | a package directory | with every change a consumer would notice |
| 2. Version | `pnpm version-packages` | repo root | when you decide to publish |
| 3. Publish | the `Release` workflow | GitHub Actions | after step 2 is merged to `main` |

Step 1 happens many times, step 2 and 3 once per release. Nothing publishes on its own.

## Why Changesets

This repository used to use `semantic-release`, which derived each version from Conventional Commit messages. It was replaced
because the release is manual anyway, and because a person writing a one-line summary while the change is fresh produces a
better changelog than a commit subject does. Commits are still written in Conventional Commit style (`pnpm commit`) for a
readable history, but no tool reads them to decide a version.

## The pieces

| Path | What it is |
| --- | --- |
| `.changeset/config.json` | Changesets configuration: independent versioning, `main` as the base branch |
| `.changeset/*.md` | pending changesets, one small file per recorded change. Consumed (deleted) by `pnpm version-packages` |
| `scripts/changeset.mjs` | the per-package prompt behind `pnpm changeset` run from a package directory |
| `scripts/check-changeset.mjs` | the check behind the CI job `Changeset recorded` and `pnpm check:changeset` |
| `packages/*/CHANGELOG.md` | each package's changelog, written by `pnpm version-packages` |
| `.github/workflows/release.yml` | the manual publish workflow |
| `astro-docs/scripts/sync-changelogs.mjs` | copies the package changelogs into the docs site |

Each package (`core`, `vue`, `react`, `angular`) is versioned **independently**. There are no `fixed` or `linked` groups.

## 1. Recording a change

From the directory of the package you changed:

```sh
pnpm changeset
```

It shows the current version and asks which version the package is being updated to:

```
keystone-dashboard-layout-core is at 1.0.1. Which version is it being updated to?

  1) patch -> 1.0.2      bug fix, nothing changes for consumers
  2) minor -> 1.1.0      new backwards-compatible feature
  3) major -> 2.0.0      breaking change
```

Answer `1`, `patch`, or the version itself, then give a one-line summary. It writes `.changeset/<package>-<id>.md`:

```md
---
"keystone-dashboard-layout-core": patch
---

Fix: removing an item through the layout prop now re-compacts the remaining items.
```

Commit that file with the change it describes.

### What needs one

Ask whether someone upgrading would care.

| Change | Changeset? |
| --- | --- |
| Bug fix that changes behaviour | yes, `patch` |
| New feature, option or export | yes, `minor` |
| Breaking change to props, events or the public API | yes, `major` |
| Tests, mutation-test suppressions, lint fixes | no |
| Docs, CI, build tooling | no |
| Refactor with no behaviour change | no |

Several commits that make up one fix need **one** changeset. Write the summary for the person upgrading, not for a reviewer:
it becomes the changelog line. "Minor bug fixing" tells a consumer nothing.

### Bump levels, not free-typed versions

Changesets records a bump **level** (patch, minor, major), not a literal version. The prompt shows the version each level
produces so you are choosing a number, but `1.3.7` typed freehand is not something it can record. If several changesets are
pending for one package, the **highest bump wins and is applied once**: ten `patch` files and one `minor` give one minor
release that lists all eleven lines.

### Other ways to record one

| Need | Command | From |
| --- | --- | --- |
| A change spanning several packages, or the stock Changesets prompt | `pnpm changeset` | repo root |
| What is waiting to be released | `pnpm changeset status` | repo root |
| This change deliberately needs no release | `pnpm changeset --empty` | repo root |

An **empty changeset** has no packages in its frontmatter. It tells the CI check "I considered this and no release is
needed", and it passes the check for everything in that pull request. It does nothing else, and it must not be left
committed when you release (see below).

## 2. CI: the `Changeset recorded` check

On every pull request, the job `Changeset recorded` runs `scripts/check-changeset.mjs`. It fails when a package's source
changed and nothing records it. To run the same check against `main` locally: `pnpm check:changeset`.

**What counts as changed:** a file under `packages/<name>/src/`, **ignoring test files** (`*.spec.*`, `*.test.*`, anything
under `__tests__/`). Tests change nothing for a consumer.

**A package passes if any of these holds:**

1. a changeset **added by this pull request** names it (a changeset already on `main` does not count);
2. an **empty changeset** was added by this pull request; or
3. the package's own **`CHANGELOG.md` changed** in this pull request. `pnpm version-packages` deletes the changeset files, so
   a branch that already ran it has no changeset left to find, but its changelog changed.

Limitation of rule 3: it checks that the changelog *changed*, not that it covers every later source change. If you version
and then change `src/` again in the same branch, the check passes. That is accepted: telling the cases apart would mean
comparing commit order.

The job only runs on pull requests (a push to `main` has no base branch to compare with). To make it block merging, mark
`Changeset recorded` as a required check in the repository's branch protection settings.

## 3. Versioning

When you want a release, from the **repo root**:

```sh
pnpm version-packages
```

This runs `changeset version`. For every package with pending changesets it:

- bumps `version` in `package.json` (highest pending bump wins);
- writes a new section at the top of that package's `CHANGELOG.md`;
- **deletes the consumed changeset files**.

Then review the diff and commit it as an ordinary commit:

```sh
git add -u
git commit -m "chore: version packages"
```

(`git add -u` stages modifications and deletions but not new files, which keeps a stray untracked changeset out.)

The commit is yours to edit: you can reword a changelog line before it lands. After a release is published, the old text
stays in the released changelog, so this is the cheapest moment to fix it.

### What a changelog entry looks like

```md
## 1.0.2

### Patch Changes

- e82c175: Minor bug fixing
- Updated dependencies [e82c175]
  - keystone-dashboard-layout-core@1.0.2
```

The hash is the commit that added the changeset. "Updated dependencies" lines appear in a package that depends on one that
was bumped.

### Changelog file format

Each `CHANGELOG.md` must **start with `# <package name>`** followed directly by the release sections, with no introductory
paragraph. Changesets prepends new entries after that title line and removes a duplicate title if it finds one. A different
title (`# Changelog`) or an intro paragraph would leave a second heading, and the paragraph would end up below the newest
entries. Older entries (`1.0.0`, `1.0.1`) were written by hand before Changesets and are left as they are.

### Dependents

`vue`, `react` and `angular` depend on `core` as `workspace:*`. When `core` is bumped, `pnpm version-packages` adds an
"Updated dependencies" line to them. **Unconfirmed:** whether a dependent with *no* changeset of its own is bumped
automatically, because every dependent in the first run had its own changeset. If a `core` change must reach a framework
package's consumers as a new version of that package, record a changeset in that package too, and check
`pnpm changeset status` before relying on the automatic behaviour.

## 4. The docs-site changelog pages

`astro-docs/scripts/sync-changelogs.mjs` copies each package's `CHANGELOG.md` into the docs site's Changelog page for that
package. It runs before `astro dev` and `astro build`, so a docs build always has current changelogs. The generated
`changelog.mdx` files are also committed, so they only change when someone starts or builds the docs site. After running
`pnpm version-packages`, restarting `astro dev` (or building) refreshes them.

Core is included. Vue also appends a hand-maintained seed (`scripts/changelog-seeds/vue.md`) with the release history from
before the package was renamed. The script takes everything from the first `## ` heading onward as release entries, and
each release heading stands on its own.

## 5. Publishing

The `Release` workflow (`.github/workflows/release.yml`) is **manual only**. Run it from GitHub: Actions, Release, Run
workflow, on `main`, or `gh workflow run release.yml`.

It does, in order:

1. refuses to run if any `.changeset/*.md` is left (step 2 was skipped);
2. typechecks, runs the tests with the coverage gate, and builds every package;
3. checks the bundle size (Vue's blocks; React's and Angular's are advisory until verified);
4. runs `changeset publish`, which publishes every package whose current version is **not on npm yet**, `core` before the
   packages that depend on it, and skips versions already published, so re-running after a partial failure is safe;
5. pushes the git tags it created (`<package name>@<version>`, for example `keystone-dashboard-layout-core@1.0.2`).

### Before the first publish

- **`NPM_TOKEN` repository secret.** An npm automation token with publish rights. Without it the publish step fails
  without publishing anything.
- **The version commit has to be on the branch you run it from**, normally `main`. Releasing from a branch that does not
  contain the `chore: version packages` commit publishes the old versions.
- **No stray changesets.** In particular an empty one such as `.changeset/small-bobcats-serve.md` must not be committed: the
  workflow counts any `.md` there as pending and refuses to run. Do not add a README to `.changeset/` for the same reason.
- **The first run publishes whatever is not on npm yet**, including versions that were never published.

### What is no longer created

`semantic-release` also created a GitHub Release for each version. This workflow pushes **tags** only. Say if you want
GitHub Releases back.

## What the pre-commit hook does not do

`.husky/pre-commit` runs `typecheck` and `lint` (through Turborepo, for the packages you changed and their dependents) and
nothing else. It never writes a changelog, bumps a version or syncs the docs. Versioning in a hook would run on every
commit instead of once per release, and syncing in a hook would modify files after you staged them.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `Release` fails at "Refuse to release with unconsumed changesets" | a `.changeset/*.md` is committed. Run `pnpm version-packages` and commit, or remove a stray empty one |
| `Changeset recorded` fails | source changed with no changeset naming the package. Run `pnpm changeset` from that package, or `pnpm changeset --empty` from the root if no release is needed |
| `Changeset recorded` fails on a branch that already ran `pnpm version-packages` | the package's `CHANGELOG.md` should have changed in the branch. If it did not, the version commit is missing from the branch |
| `pnpm changeset` says to run it from a package directory | it only runs from `packages/<name>`. From the root, `pnpm changeset` is the stock Changesets CLI |
| Changelog has two titles, or an intro paragraph below new entries | the file did not start with `# <package name>`. See "Changelog file format" |
| Docs-site changelog is behind a package's `CHANGELOG.md` | it only regenerates on `astro dev` or `astro build`. Restart it |
| Publish step fails | check `NPM_TOKEN` exists and has publish rights. A version already on npm is skipped, not an error |
| Several identical lines in one changelog section | several changesets with the same summary. Merge them, or edit the changelog before committing the version commit |

## Command cheat sheet

| Command | From | What it does |
| --- | --- | --- |
| `pnpm changeset` | package directory | record a change for that package (prompts for the version and a summary) |
| `pnpm changeset` | repo root | the stock Changesets prompt, for several packages |
| `pnpm changeset --empty` | repo root | record that a change needs no release |
| `pnpm changeset status` | repo root | list what is waiting to be released |
| `pnpm check:changeset` | repo root | run the pull-request check locally against `origin/main` |
| `pnpm version-packages` | repo root | consume changesets, bump versions, write changelogs |
| `pnpm release:publish` | repo root | what the workflow runs to publish (normally you do not run this yourself) |
| `pnpm commit` | repo root | guided Conventional Commit message |
