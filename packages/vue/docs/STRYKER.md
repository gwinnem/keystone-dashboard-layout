# Enabling mutation testing (Stryker)

Coverage tells you which lines *ran*, not whether the assertions around
them would actually catch a bug — a test can execute a line and still
never check anything meaningful about what it did.
[Stryker](https://stryker-mutator.io/) is the systematic version of
catching that: it makes small deliberate changes to the source (a
"mutant" — e.g. flipping `>` to `>=`, or `&&` to `||`) and re-runs the
tests. If a mutant survives (the suite still passes), that's a line
whose behavior isn't actually pinned down by a test, coverage number
notwithstanding.

## Status: configured, not run on every PR

Stryker is already installed (`@stryker-mutator/core`,
`@stryker-mutator/vitest-runner`) and configured (`stryker.conf.json`) —
there's nothing to "enable" in the sense of adding new dependencies. What
this doc covers is *how to run it*, since it's deliberately **not** wired
into the main PR gate.

## Why it isn't a per-PR check

Mutation testing re-runs the test suite once per mutant. Even with
per-mutant optimizations Stryker already does (only re-running tests
that actually cover the mutated line, via `coverageAnalysis: "perTest"`),
that's still enough test-runner invocations to take a long time — expect
well over 20 minutes for a full run. That's why this isn't wired into a
per-PR gate; if a scheduled/on-demand CI workflow for this package is set
up, it should follow the same "periodic, not per-PR" shape.

## Running it locally

```sh
pnpm test:mutation
```

**This is not a plain `stryker run`.** The script itself is:

```json
"test:mutation": "cd ../.. && stryker run packages/vue/stryker.conf.json"
```

Stryker is invoked from the **monorepo root**, not from this package's
own directory — see [Why the monorepo root](#why-the-monorepo-root)
below for why that's necessary. `test:mutation:debug` is the same
command with `--fileLogLevel trace --logLevel debug` added, useful if a
future run breaks again and needs the same kind of diagnosis described
below.

When it finishes, open the HTML report (paths below are relative to
this package's own directory, `packages/vue/`, matching where the
`htmlReporter`/`jsonReporter` config below points, even though the run
itself started from the root):

```sh
open reports/mutation/index.html   # macOS
xdg-open reports/mutation/index.html  # Linux
```

It highlights every mutated line with a killed/survived/timeout badge —
survived mutants are the actionable output: each one is a specific,
concrete gap ("this line's behavior isn't pinned down by any assertion")
rather than a vague "coverage is low" signal. A `json` reporter is also
configured (`reports/mutation/mutation.json`) — smaller and easier to
grep/parse than the HTML report or the trace log when diagnosing a
config problem rather than reading real mutant results.

### Running against a smaller scope while iterating

Editing `stryker.conf.json`'s `mutate` array to a single file makes
local iteration much faster while closing gaps it finds, e.g.:

```json
"mutate": ["packages/vue/src/components/Grid/composables/useUndoRedo.ts"]
```

Note the `packages/vue/` prefix — see [Why the monorepo root](#why-the-monorepo-root)
below for why every path in this config is root-relative, not relative
to this package's own directory the way you might expect. Revert to the
full scope before committing — see [What's in scope](#whats-in-scope-and-why)
below for the actual configured value.

## What's in scope, and why

```json
"mutate": [
  "packages/vue/src/components/Grid/composables/*.ts",
  "packages/vue/src/composables/*.ts",
  "packages/vue/src/hooks/*.ts",
  "!packages/vue/src/**/*.d.ts"
]
```

**`.vue` files are not directly mutated** — Stryker's mutant placement
for Vue SFCs isn't first-class the way it is for plain `.ts`/`.js`, and
the bulk of the intricate, worth-mutation-testing logic (drag/resize
math, responsive breakpoint resolution, collision handling) already
lives in these `.ts` composables, not in the `.vue` files' `<script
setup>` blocks themselves (which are mostly wiring: props, watchers,
calling into the composables).

That said, **the `.vue` files are not irrelevant to this config** — the
tests that actually exercise most of these composables do so by
mounting `GridItem.vue`/`GridLayout.vue` (via `@vue/test-utils`), so
those files' own ability to compile correctly inside Stryker's sandbox
directly determines whether the composables above get real mutation
coverage at all, or silently show as "no coverage" — see the next
section for a real case of exactly that.

Pure type-only files (interfaces, enums with no runtime logic) aren't
explicitly excluded but contribute no mutants anyway — there's nothing
in them for Stryker to mutate.

## Why the monorepo root

This package's own `src/` reaches into a sibling workspace package,
`packages/core`, via the `@/core` path alias (`vitest.config.js`'s own
`resolve.alias`, backed by `packages/core` being a real dependency in
`package.json`). Stryker's *default* sandboxing only copies the current
project's own directory into its temp sandbox — it has no built-in
awareness of an alias reaching outside that directory, so `packages/core`
was simply absent, and any file importing from `@/core` failed to
compile with `[@vue/compiler-sfc] Failed to resolve import source
"@/core/..."` the moment Stryker tried to run it.

The fix — confirmed, not assumed, via multiple real runs — is invoking
`stryker run` from the **monorepo root** (`packages/vue/package.json`'s
own `test:mutation` script does `cd ../..` first), so both
`packages/vue` and `packages/core` fall inside Stryker's own sandbox
discovery scope together. Every path in `stryker.conf.json` (`mutate`,
`ignorePatterns`, `vitest.configFile`) is root-relative as a direct
consequence of this — a change made without updating every one of those
paths silently matches nothing (Stryker doesn't error on a glob that
matches zero files, it just contributes zero mutants from it).

This single structural fact — everything root-relative, root-invoked —
is what several other, more specific issues below trace back to.

### Follow-on issues this surfaced, and how each was diagnosed

Running from a different directory than this package's own turned out
to have several second-order consequences, each one only found by
actually running Stryker and reading the real error, not by guessing at
config options in advance:

- **Vitest's own `root`.** `vitest.config.js` never set an explicit
  `root`, so Vite/Vitest's own default (`process.cwd()` *at invocation
  time*, not the config file's own directory) meant `test.include`'s
  relative globs resolved against the monorepo root once Stryker's own
  cwd moved there, matching nothing (`No tests were executed`). Fixed
  with `root: __dirname` in that file, which resolves to the exact same
  value it always implicitly had when invoked normally — a no-op for
  every already-working invocation.
- **The monorepo's own root `tsconfig.json`.** A TypeScript "solution
  style" config (`{ "files": [], "references": [...packages/core,
  packages/vue, packages/react, packages/angular] }`) that got copied
  into the sandbox along with everything else, since nothing excluded
  it. Vite's own TS tooling discovered it and tried to resolve its
  `references` — including `packages/react`, which this config's own
  `ignorePatterns` deliberately excludes from the sandbox (Vue doesn't
  depend on it) — so the reference pointed at something that genuinely
  didn't exist inside the sandbox (`[TSCONFIG_ERROR] Failed to load
  tsconfig "packages/react"`). Fixed by adding the root-level
  `tsconfig.json` (not this package's own, unaffected
  `packages/vue/tsconfig.json`) to `ignorePatterns`.
- **`@vue/compiler-sfc`'s own type resolution for `defineEmits<T>()`.**
  Even after both fixes above, `GridItem.vue`, `GridLayout.vue`, and
  `CustomCloseButton.vue` — every file whose `defineEmits<{...}>()` used
  an imported type from `@/core` — still failed, silently: Vitest
  simply never registered their tests at all, no error printed, no
  crash. Confirmed, via a direct side-by-side comparison (`npx vitest
  run` against the same file, same coverage flags, once from the real
  directory and once from a persisted Stryker sandbox — sandboxes can
  be kept around for exactly this kind of diagnosis via `cleanTempDir:
  false`), that this reproduces *only* inside a Stryker sandbox, not
  from a normal invocation — something about the sandbox's own symlinked
  `node_modules` or nested path structure breaks this one, separate,
  compile-time type-resolution path (distinct from Vite's own bundler
  `resolve.alias`, which was never the problem here). Root cause not
  fully pinned down at the mechanism level; instead, fixed at the
  source: all three files now declare `defineEmits` using the runtime-
  array form (`defineEmits([EGridItemEvent.REMOVE_ITEM, ...])`) rather
  than the generic/type-argument form, which needs no compile-time type
  resolution at all. See the comment directly above each of those three
  `defineEmits` calls for the full account and the accepted trade-off
  (event *names* are still checked; payload argument types on `emit(...)`
  call sites no longer are).

If mutation testing for this package breaks again, start by checking
whether it's one of these same three categories before assuming
something new — and if it does turn out to be genuinely new, the
`cleanTempDir: false` + direct-`npx vitest run`-against-the-sandbox
technique above is the fastest way to get a real, unambiguous error
message rather than guessing at Stryker/Vitest config options blind.

## Interpreting results going forward

Not every survived mutant is worth chasing — some represent genuinely
equivalent code (a mutant that changes behavior in a way no reasonable
input could distinguish) or low-value edge cases. Treat the report as a
prioritized list of *candidates* for a new test: read the surviving
mutant, decide whether the untested behavior it represents matters, and
either add an assertion for it or note why not.
