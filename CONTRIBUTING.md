# Contributing to keystone-dashboard-layout

Thanks for considering a contribution. This is a monorepo with four
packages — [`@keystone-dashboard-layout/core`](./packages/core)
(framework-agnostic shared engine),
[`@keystone-dashboard-layout/vue`](./packages/vue) (the reference
implementation),
[`@keystone-dashboard-layout/react`](./packages/react), and
[`@keystone-dashboard-layout/angular`](./packages/angular) — each
independently versioned and released. Most contributions target one
package specifically; this document covers the practical mechanics
common to all of them. For the bigger picture of how a given package is
organized, see that package's own `docs/` folder (e.g.
[`packages/vue/docs/ARCHITECTURE.md`](./packages/vue/docs/ARCHITECTURE.md));
for the current state of known gaps and in-progress work, see
[`packages/vue/docs/REFACTOR_STRATEGY.md`](./packages/vue/docs/REFACTOR_STRATEGY.md)
and [`packages/vue/docs/REFACTORING.md`](./packages/vue/docs/REFACTORING.md).

## Getting set up

```sh
git clone https://github.com/gwinnem/keystone-dashboard-layout.git
cd keystone-dashboard-layout
pnpm install
```

Node `^18.0.0 || ^20.0.0 || >=22.0.0` (see `engines` in `package.json`).
This root `pnpm install` covers `packages/*` only — the documentation
site (`astro-docs/`) and Angular's own standalone examples app
(`angular-examples-app/`) are each deliberately separate projects with
their own `pnpm install`/`pnpm dev`; see the root
[`README.md`](./README.md)'s own "Documentation & examples" section.

Useful commands while working, run from the repo root (via
[Turborepo](https://turborepo.com), across every package at once) or
scoped to one package with `--filter`:

```sh
pnpm dev                                                  # turbo run dev, every package
pnpm --filter @keystone-dashboard-layout/vue dev          # just Vue
pnpm test                                                 # turbo run test
pnpm typecheck                                            # turbo run typecheck
```

## Before opening a PR

Run the same checks CI runs:

```sh
pnpm typecheck
pnpm lint:style          # must be clean on packages that define it — a hard gate
pnpm lint                # advisory for now; see the note below
pnpm test:coverage       # must stay at or above each package's own configured floor
pnpm build
```

See each package's own `docs/TESTING.md` (where one exists — currently
Vue and React) for how that package's own test suite is organized
(unit, component, e2e) and what's mocked and why.

### About the ESLint gate

`pnpm lint` is advisory in CI (`continue-on-error: true`) across every
package, not blocking, specifically so it doesn't fail your PR over debt
you didn't introduce — both Vue's and React's own configs currently
carry a real number of pre-existing issues that predate (or, for React,
predate a later tightening of) their own ESLint setup. Please don't add
*new* lint issues, but you're not expected to fix unrelated pre-existing
ones in an unrelated PR.

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/),
enforced informally via [Commitizen](https://commitizen-tools.github.io/commitizen/):

```sh
pnpm commit
```

walks you through generating a properly-formatted commit message. This
matters beyond style — each package's own `semantic-release` config
(scoped to that package's own path via `semantic-release-monorepo`; see
`packages/*/.releaserc.json` and `.github/workflows/release.yml`) parses
commit messages to decide *that package's own* next version number and
generate its own `CHANGELOG.md` automatically on every merge to `main`.
A `fix:` commit triggers a patch release, `feat:` a minor release, and
`feat!:`/a `BREAKING CHANGE:` footer a major release, for whichever
package(s) the commit's own changed files fall under — get the type
wrong and you'll get the wrong kind of release for that package.

## Tests are not optional

Vue's own codebase has a specific, documented history of bugs that
survived because tests didn't actually assert what they looked like
they asserted, and multiple real bugs found specifically *because*
someone was writing a test — see
[`packages/vue/docs/REFACTORING.md`](./packages/vue/docs/REFACTORING.md)
for the individually-logged findings. A PR that changes behavior
without a test covering that behavior will be asked for one — not as a
formality, but because that's literally how this codebase has found its
worst bugs, across all three framework packages.

## How releases happen

Nothing manual: merging to `main` triggers
`.github/workflows/release.yml`, which runs `semantic-release`
separately for each of Vue, React, and Angular (in that order, chained
rather than parallel, to avoid a `git push` race between the three) —
each determines its own version bump from commit messages touching its
own package path since its own last release, updates its own
`CHANGELOG.md`, publishes to npm, and creates a GitHub release. See that
workflow file's own top comment for the full account, including what
still requires a maintainer's one-time setup (an `NPM_TOKEN` secret,
branch protection).

### Generating a package tarball locally

Each package that defines `check:bundle-size`/`check:package-install`
scripts (currently Vue; React and Angular have their own versions too,
though newer and less battle-tested — see each script's own top comment)
can be inspected locally before a release:

```sh
pnpm --filter @keystone-dashboard-layout/vue run build
pnpm --filter @keystone-dashboard-layout/vue run check:bundle-size
pnpm --filter @keystone-dashboard-layout/vue run check:package-install
```

Actually publishing is left to the automated release pipeline above,
not a manual `npm publish` — the pipeline's own sequencing (build, test,
bundle-size check, then release) is the source of truth for what a real
release actually runs.

## Reporting bugs / requesting features

Open an issue on
[GitHub](https://github.com/gwinnem/keystone-dashboard-layout/issues).
Please say which package (Vue/React/Angular/core) the issue concerns.
For a bug report, a minimal reproduction (a fork of one of the
[live examples](https://github.com/gwinnem/keystone-dashboard-layout/tree/main/astro-docs/src/components/examples)
is a good starting point for Vue or React; see
[`angular-examples-app/README.md`](./angular-examples-app/README.md)
for Angular's own, separate examples app) makes it much faster to
confirm and fix.

## Reporting security issues

Please don't open a public issue for a security vulnerability — see
[`SECURITY.md`](./SECURITY.md) for the disclosure process.
