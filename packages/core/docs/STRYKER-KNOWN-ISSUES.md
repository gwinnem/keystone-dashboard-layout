# Known issue: some mutants survive despite 100% real test coverage

Stryker (`pnpm test:mutation`) reports a handful of specific mutants as
"Survived" in files where a direct, non-mutated test run
(`pnpm vitest run <file> --coverage`) confirms **100% statement, branch,
function, and line coverage**. This is not the usual, expected reason a
mutant survives (a genuine gap where no test exercises that code, or a
test that exercises it but doesn't assert precisely enough to notice a
behavioral change) — real coverage confirms the code runs and the tests
around it pass. Something about how Stryker's own mutant-substitution
process interacts with these specific lines isn't yet understood.

## Confirmed instances

**`native-interaction.ts`, `createNativeAutoScroll`'s `tick()` function**
(the auto-scroll pixel math, executed inside a `requestAnimationFrame`
callback triggered via `vi.advanceTimersByTime` under fake timers).
Hand-verified test assertions with exact expected values still show
several `EqualityOperator`/`ConditionalExpression` mutants there as
survived, across multiple independent test-writing attempts.

**`alignment-helper.ts`, `findAlignmentGuides`** (lines checking
`activeLeft === otherLeft || activeLeft === otherRight`, etc., each
gating a `Set.add(...)` call). Same shape: `ConditionalExpression`
mutants (`→ true`/`→ false`) reported as survived despite existing
tests that, traced by hand against the actual source, should exercise
every one of these conditions in both directions.

**`breakpoint-validator.ts`, `keysValidatorPayload.validKeys`** — a
different shape from the two above: this is an exported, module-level
`const` array literal (`['xxl', 'xl', 'lg', ...]`), directly consumed
by `breakpointsValidator`'s own real logic (not a test fixture, and not
gating a side effect inside a loop the way the other two are).
`StringLiteral`/`ArrayDeclaration` mutants on this array (individual
entries changed, or the whole array emptied) are reported as survived,
despite hand-tracing the existing "valid breakpoints"/"invalid keys"
tests against each specific mutation and confirming they should fail
under it: an emptied `validKeys` makes `keysValidator`'s own
`coincidenceKeys.length === requiredKeys.length` check pass vacuously
(both `0`), which the existing "invalid keys" test (a genuinely
incomplete key set) should catch as an incorrect `true` — and a single
entry changed (e.g. `'xxl'` → `''`) should make the "valid breakpoints"
test's own all-keys-present input fail to match, since the real `'xxl'`
key that test provides would no longer be in the mutated array. Neither
outcome should let the mutant survive; both do.

## What's been ruled out, with real evidence — not assumed

- **Not a `coverageAnalysis: "perTest"` attribution problem.** Switched
  `coverageAnalysis` to `"all"` (every test runs against every mutant,
  no coverage-based skipping at all) for the `native-interaction.ts`
  case specifically — the exact same mutants still survived. If
  Stryker's own dry-run coverage map were failing to attribute these
  tests to these mutants (so it never even attempted re-running them),
  `"all"` mode would have fixed it by construction. It didn't.
- **Not a real test-coverage gap.** `pnpm vitest run <file> --coverage`
  (a normal, non-mutated run) shows 100% statement/branch/function/line
  coverage for the first two files above, confirming the relevant code
  genuinely executes and the surrounding tests genuinely pass. (Not yet
  independently re-verified for `breakpoint-validator.ts` specifically
  — the reasoning there is from hand-tracing the existing tests against
  the mutation, not a coverage-report cross-check like the other two.)

## A pattern worth noting, not yet confirmed as the cause

The first two confirmed instances involve a boolean condition that
**gates a side-effecting call into a collection inside a loop** —
`Set.add(...)` in `findAlignmentGuides`, `container.scrollBy(...)` in
`tick()`. The third instance doesn't share that shape at all — it's a
static, module-level exported `const` array being mutated directly, no
loop or gating condition of that kind involved. Whether there even is
one common underlying cause across all three, or these are two (or
three) unrelated Stryker quirks that happen to produce the same
observable symptom, is a genuine open question. Worth specifically
testing next: whether Stryker has some difficulty with mutating
**exported, module-level `const` data** in general, regardless of how
it's later consumed — that would explain the third instance without
needing the "loop-gated side effect" theory to also apply to it.

## What would help resolve this

Direct inspection of Stryker's own mutated source for one of these
specific mutants (comparing the sandbox's actual generated code against
the original) would settle whether the mutation is being applied where
expected at all. This wasn't available in the environment this was
investigated in (file-system access only, no way to inspect Stryker's
own temp sandbox output or its internal mutant-application step
directly).

## For whoever picks this up next

Don't assume more/better tests will fix this — that's exactly what was
tried, repeatedly, for all three instances above, with hand-verified
correct assertions/reasoning that still didn't move these specific
mutants. Start instead by trying to reproduce each pattern in a
minimal, standalone Stryker project (a bare `Set.add()` in a loop gated
by a condition; a bare exported `const` array consumed by a plain
function) to confirm whether either is a genuine Stryker behavior worth
reporting upstream, or something specific to this project's own
config.
