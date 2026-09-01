# Mutation testing (Stryker)

Same tool, same rationale, and largely the same configuration shape as
the Vue package's own `docs/STRYKER.md` — read that document first for
the full "why mutation testing at all" case (coverage tells you which
lines *ran*, not whether an assertion would actually catch a bug); this
document only covers what's specific to this package.

## Status: configured, not run on every PR

Installed (`@stryker-mutator/core`, `@stryker-mutator/vitest-runner`)
and configured (`stryker.conf.json`), same as Vue — **not** wired into
a per-PR CI gate, for the identical reason: re-running the whole test
suite once per mutant is slow enough that it belongs on a periodic
schedule, not blocking every PR. A full run of this package's own
1560-mutant scope takes ~29 minutes in practice (confirmed via a real
run, not estimated) — well over 20 minutes, matching Vue's own doc's
expectation for its comparable scope.

## Running it locally

```sh
npm run test:mutation
```

Runs `stryker run` using `stryker.conf.json`. When it finishes, open
the HTML report:

```sh
open reports/mutation/index.html   # macOS
xdg-open reports/mutation/index.html  # Linux
```

Or read `reports/mutation/mutation.json` directly (via the `json`
reporter — see below) for a structured summary without opening a
browser.

### Running against a smaller scope while iterating

Edit `stryker.conf.json`'s own `mutate` array down to a single file
while actively closing gaps it finds — same convention as Vue's own
doc — then revert to the full scope below before committing.

## What's in scope, and why (differs from Vue's own scope)

```json
"mutate": [
  "src/components/Grid/GridLayout.tsx",
  "src/components/Grid/GridItem.tsx",
  "src/components/Grid/hooks/*.ts",
  "src/hooks/*.ts",
  "!src/**/*.d.ts"
]
```

**`GridLayout.tsx`/`GridItem.tsx` are included here, unlike Vue's own
`.vue` files.** Vue's own `docs/STRYKER.md` deliberately excludes `.vue`
SFCs, since Stryker's mutant placement for them isn't first-class the
way it is for plain `.ts`/`.tsx` — and after Vue's own Phase 2
composable extraction, most of its intricate logic already lives in
`.ts` composables outside the SFCs anyway. Neither exclusion reason
applies here: `.tsx` is ordinary TypeScript/JSX with no SFC-specific
tooling gap, and this port's own architecture (a single `GridItem` that
reads everything from `ILayoutItem` rather than ~30 direct component
props, see `docs/IMPLEMENTATION_PLAN.md`'s own architecture-translation
note) keeps a larger share of substantive logic directly in these two
files than Vue's own thin, wiring-only SFCs have left in theirs. Not
including them here would mean mutation-testing meaningfully less of
this package's own actual behavior than Vue's own scope covers of its.

Shared `core` package logic (collision detection, compaction,
responsive-breakpoint resolution, the native pointer-driven drag/resize
engine) is **not** in scope here — it's `keystone-dashboard-layout-core`'s
own concern, mutation-tested (if at all) from that package directly,
not duplicated into this config.

Pure type-only files (`grid-layout-props.interface.ts`,
`grid-item-props.interface.ts`, `grid-layout-handle.interface.ts`)
aren't explicitly excluded but contribute no mutants anyway — same as
Vue's own equivalent files.

## Reporter configuration

```json
"reporters": ["clear-text", "progress", "html", "json"],
"clearTextReporter": {
  "allowColor": true,
  "allowEmojis": true,
  "logTests": false,
  "maxTestsToLog": 3,
  "reportTests": true,
  "reportMutants": true,
  "reportScoreTable": true,
  "skipFull": false
},
"jsonReporter": {
  "fileName": "reports/mutation/mutation.json"
}
```

Worth knowing about a couple of the `clearTextReporter` fields
specifically: `logTests: false` suppresses the (often very long) list
of every test name covering each mutant in the console output, while
`reportTests: true` still reports *which tests* killed each mutant in
the summary — the two aren't the same toggle. `maxTestsToLog: 3` caps
how many of those covering tests print per mutant on the rare
occasions logging is on, so a single heavily-covered line can't flood
the terminal. `skipFull: false` means files with zero surviving
mutants still get a row in the score table, rather than being silently
omitted once they're "clean."

`json` was added to `reporters` (alongside the `jsonReporter.fileName`
setting) after the fact specifically so `reports/mutation/mutation.json`
exists as a small, structured, script/grep-friendly summary — the HTML
report is a self-contained ~1.7MB SPA with its own data bundled inline,
not something easily read or diffed directly; the JSON file is a much
more practical source for "what's the current score" without opening a
browser.

## `plugins`: explicit, not left to auto-discovery

```json
"plugins": ["@stryker-mutator/vitest-runner"]
```

Stryker's default plugin loading globs `node_modules` for anything
matching `@stryker-mutator/*` — a real, first-run failure
(`Cannot find TestRunner plugin "vitest"`) showed that glob-based
discovery has a gap with this monorepo's pnpm-workspace `node_modules`
layout, even with `@stryker-mutator/vitest-runner` genuinely installed.
Declaring the plugin explicitly bypasses that discovery step entirely.
`packageManager` is also set to `"pnpm"` here (not `"npm"`, which is
what Vue's own config — and this package's own first draft — had
copied forward incorrectly; this monorepo's root `package.json` has
pnpm-specific `overrides`/`onlyBuiltDependencies` config, confirming
it's genuinely pnpm-managed).

## The "zero coverage on everything except useLayoutStorage.ts" saga — root cause, fix, and confirmed result

This took three attempts to actually diagnose, worth recording
honestly rather than just documenting the final answer as if it were
obvious from the start.

**Attempt 1 (wrong):** two consecutive real runs — one under
`coverageAnalysis: "perTest"`, one under `"all"` — both reported
`NoCoverage` on essentially every mutant in `GridLayout.tsx`,
`GridItem.tsx`, and all three `hooks/*.ts` files, while
`useLayoutStorage.ts` scored normally both times. Getting the identical
result under both coverage modes ruled out a per-test mapping bug
(`"all"` doesn't depend on that mapping at all), which was the first
guess.

**Attempt 2 (also wrong, but closer):** tracing the import graph,
`src/components/Grid/hooks/useCrossGridDrag.ts` imported via the raw
`@/core` alias (`vitest.config.ts`'s own `resolve.alias` pointing at
`../core/src`, a directory outside `packages/react` entirely), and
`GridLayout.tsx` imports that hook directly — so the theory was that
Stryker's sandbox doesn't mirror sibling monorepo packages reached via
a relative path escaping its own root. The attempted fix — an explicit
`files` array in `stryker.conf.json` including `../core/src/**/*.ts` —
had zero effect.

**The actual, confirmed root cause:** running
`npx stryker run --fileLogLevel trace --logLevel debug` and reading
the resulting `stryker.log` directly (Stryker writes this file to disk
in the directory it's run from) showed the real error, at test
*collection* time, for every affected spec file:

```
Error: Failed to resolve import "@/core/gridlayout/helpers/cross-grid-registry"
from "src/components/Grid/hooks/useCrossGridDrag.ts". Does the file exist?
```

The `files` array fix in attempt 2 couldn't have worked, and here's
why: Stryker's sandbox lives at `packages/react/.stryker-tmp/sandbox-XXXX/`
— one directory level *deeper* than `packages/react/` itself.
`vitest.config.ts`'s own alias is computed as `resolve(__dirname, '../core/src')`
— a relative path resolved from wherever that specific config file
lives. Once Vite copies `vitest.config.ts` into the sandbox, `__dirname`
becomes the sandbox's own directory, so `'../core/src'` resolves one
level short of the real `packages/core/src`. Copying extra files into
the sandbox (attempt 2's fix) doesn't change what path the *relocated*
alias computes at runtime — the mismatch is structural, not a missing-
files problem, and no `stryker.conf.json` setting can fix a relative
path that escapes the project root once something relocates the file
that path is computed from.

**The real fix:** made the import resolve through `node_modules`
instead of a relative path at all — stable regardless of where the
importing file gets relocated to, sandboxed or otherwise:

1. `keystone-dashboard-layout-core`'s own `package.json` gained two
   dedicated subpath exports (`./gridlayout/helpers/cross-grid-registry`,
   `./gridlayout/interfaces/cross-grid.interfaces`), pointing directly
   at the source `.ts` files rather than through a build step — this
   pair is explicitly not part of `core`'s main public API surface
   (mirroring the "excluded from the main barrel" framing that file's
   own header comment already documents), a deliberate internal escape
   hatch for monorepo siblings, not a general-purpose export.
2. `cross-grid-registry.ts` itself (inside `core`) had its own internal
   `@/core` import fixed to a plain relative path (`../interfaces/cross-grid.interfaces`)
   — it was *also* using the alias internally (a carryover from when
   this code lived inside the Vue package's own `src/core/`), which
   would have broken the exact same way once loaded from outside
   `core`'s own build, regardless of the new subpath export.
3. `useCrossGridDrag.ts` (this package) now imports through the two new
   subpaths instead of `@/core/...`.

**Confirmed result — a real, subsequent full run, not a projection:**

```
Ran 13.06 tests per mutant on average.
-------------------------|------------------|-----------|------------|-------------|-----------|-----------|
                         | % Mutation score |           |            |             |           |           |
File                     |  total | covered | ✅ killed | ⌛️ timeout | 👽 survived | 🙈 no cov | 💥 errors |
-------------------------|--------|---------|-----------|------------|-------------|-----------|-----------|
All files                |  72.19 |   75.54 |       954 |        170 |         364 |        69 |         3 |
 components              |  72.56 |   75.82 |       943 |        170 |         355 |        66 |         3 |
  Grid                   |  72.56 |   75.82 |       943 |        170 |         355 |        66 |         3 |
   hooks                 |  68.92 |   72.59 |       223 |         63 |         108 |        21 |         0 |
    useCrossGridDrag.ts  |  82.98 |   86.67 |        33 |          6 |           6 |         2 |         0 |
    useGridItemDrag.ts   |  70.45 |   71.26 |        54 |          8 |          25 |         1 |         0 |
    useGridItemResize.ts |  66.07 |   70.61 |       136 |         49 |          77 |        18 |         0 |
   GridItem.tsx          |  86.12 |   87.55 |       181 |         30 |          30 |         4 |         3 |
   GridLayout.tsx        |  70.48 |   73.95 |       539 |         77 |         217 |        41 |         0 |
 hooks                   |  47.83 |   55.00 |        11 |          0 |           9 |         3 |         0 |
  useLayoutStorage.ts    |  47.83 |   55.00 |        11 |          0 |           9 |         3 |         0 |
-------------------------|--------|---------|-----------|------------|-------------|-----------|-----------|
```

"13.06 tests per mutant on average" (up from "0.03" in the broken
runs) confirms the per-test coverage mapping is now working correctly
across the board — `useCrossGridDrag.ts` specifically, the file whose
broken import caused this entire saga, now scores 82.98%, in line with
every other file. `useLayoutStorage.ts`'s own 47.83% is unchanged from
before (it was never affected by this bug) and is a separate, genuine
"real test gaps exist here" finding — see its own `👽 Survived` count,
not a leftover symptom of the sandbox issue.

The remaining `👽 Survived`/`🙈 No cov` counts across the other files
are now exactly what mutation testing is *for*: a real, prioritized
list of untested-behavior candidates to work through (per the
"Interpreting results going forward" section of Vue's own doc), not a
sign anything is still broken.

**This section is intentionally left detailed rather than trimmed to
just the final fix** — the two wrong turns are exactly the kind of
thing worth knowing about if a *different* zero-coverage pattern shows
up again someday: check the actual `stryker.log` (`--fileLogLevel
trace`) for a real collection-time error before reaching for a
coverage-mode or `files`-array change, since both of those looked
individually plausible and were both wrong.

## The one Vue-specific pitfall that also applies here

Per Vue's own doc: **don't add `src/components/Grid/__tests__` (or any
test directory) to `ignorePatterns`.** Stryker's `vitest` runner needs
the test files themselves visible in the sandboxed project copy it
builds to resolve which tests cover which mutated line — excluding them
produces a `No tests were executed` failure that looks like a
test-runner integration problem but isn't.
