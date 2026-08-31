# Test skip/disable audit and fix implementation plan

**Prepared:** this session, via a direct read of every test file in the
monorepo — all e2e specs (Vue: 10, React: 12, Angular: 11) and all unit
specs (Core: 32, Vue: 14, React: 33, Angular: 8), 120 files total,
grepped and read for `.skip(`, `.only(`, `.todo(`, `xit(`, `xdescribe(`,
and commented-out test blocks. Not sampled — every file was checked.

## Headline result

**Zero skips or disabled tests exist anywhere in unit test suites** (Core,
Vue, React, Angular — 87 files, 0 findings) with **one exception**: a
single commented-out test in Core, which turned out to be masking a real,
confirmed library bug, not a flaky or broken test. Every other finding is
in the **e2e suites**, and every one of those is a conditional,
browser-specific skip with a documented reason — not a disabled test
hiding a real problem.

| Category | Count | Fixable? |
|---|---|---|
| A. WebKit-skipped e2e tests (native HTML5 drag-and-drop) | 16 tests across 3 packages | Partially — see below |
| B. Chromium-only e2e tests (touch input via CDP) | 4 tests across 2 packages | Partially — see below |
| C. Disabled unit test masking a real bug | 1 test, 1 real bug | **Fixed in this pass** |
| D. Tests with no committed baseline yet | 7 tests, 1 package | **Yes — mechanical** |
| E. Missing test file entirely (not a skip, a gap) | 1 file, 1 package | **Yes — already scoped** |

---

## Category A: WebKit-skipped tests — native HTML5 drag-and-drop

**Root cause, confirmed identically in all three files' own header
comments**: Chromium's DevTools Protocol (CDP) can translate synthetic
`page.mouse` events into real `dragstart`/`dragover`/`drop` events for a
native `draggable="true"` element. WebKit has no equivalent translation
layer, so a native HTML5 drag-and-drop sequence never fires there at
all — a Playwright/browser-engine limitation, not an application bug.

### Affected tests

**`packages/vue/e2e/external-drop.spec.ts`** (6 tests):
1. `dropping a widget onto the right (initially empty) grid adds it there`
2. `dropping a widget onto the left grid adds it alongside the existing item`
3. `releasing a widget away from either grid drops nothing`
4. `dragging from one grid's area to the other without dropping only leaves a preview in the last one hovered`
5. `reset clears both grids back to their starting layout`
6. `compactType controls whether a dropped item settles upward into a gap or stays exactly where it was dropped`

**`packages/react/e2e/external-drop.spec.ts`** (5 tests — same list as
Vue's, minus #4, which React's own fixture doesn't have):
1. `dropping a widget onto the right (initially empty) grid adds it there`
2. `dropping a widget onto the left grid adds it alongside the existing item`
3. `releasing a widget away from either grid drops nothing`
4. `reset clears both grids back to their starting layout`
5. `compactType controls whether a dropped item settles upward into a gap or stays exactly where it was dropped`

**`packages/angular/e2e/external-drop.spec.ts`** (5 tests — identical
names to React's list above).

Each file's one exception, never skipped: *"dragging an existing item
already in one grid moves it into the other grid, not just new items
from the palette"* — uses the library's own pointer-based
`allowCrossGridDrag`, not native HTML5 DnD, so the WebKit gap doesn't
apply to it.

### Implementation plan

1. **Investigate a JS-level `DragEvent`/`DataTransfer` dispatch as a
   WebKit-specific alternative.** Rather than relying on CDP to
   translate real pointer input, construct and dispatch real
   `DragEvent` objects (with a populated `DataTransfer`) directly via
   `page.evaluate()` on WebKit specifically. This is a genuinely
   different technique from what these tests currently do, not a minor
   tweak — budget it as a real spike, not a guaranteed fix. `DataTransfer`
   construction has its own cross-browser quirks (some engines restrict
   constructing one outside a trusted event), so this may only partially
   work.
2. **If the spike above doesn't pan out**, formally document this as an
   accepted, permanent limitation rather than an open TODO — link to
   Playwright's own GitHub issue tracker if an existing tracked issue
   covers WebKit CDP drag-and-drop support (search
   `github.com/microsoft/playwright/issues` for "webkit" + "drag" before
   concluding none exists), and reference it directly in each file's own
   header comment in place of the current, more general explanation.
3. **Do not attempt to force these to run via a synthetic
   `element.dispatchEvent(new DragEvent(...))` fallback** without first
   confirming (via a real, observed pass) that it actually exercises the
   same code path a genuine native drag would — a synthetic event that
   merely avoids throwing, without actually triggering the library's own
   `dragover`/`drop` handlers the way a real gesture would, is worse than
   an honest skip: it would silently stop testing the real behavior
   while reporting green.

---

## Category B: Chromium-only tests — touch input via CDP

**Root cause, confirmed identically in both files' own header
comments**: `Input.dispatchTouchEvent` (the only way to genuinely
exercise the touch-input path, as opposed to a synthetic `TouchEvent`
that wouldn't reliably translate to the Pointer Events the native
engine listens for) is only available through a Chromium CDP session.

### Affected tests

**`packages/vue/e2e/touch-input.spec.ts`** (both tests, skipped on
Firefox + WebKit via a `beforeEach`-level `test.skip`):
1. `a touch drag moves an item, the same way a mouse drag does`
2. `a touch drag on the bottom-right resize handle resizes an item, the same way a mouse drag does`

**`packages/react/e2e/touch-input.spec.ts`** (same 2 tests, identical
names, same skip mechanism).

Angular has no `touch-input.spec.ts` at all — see Category E.

### Implementation plan

1. **Check Playwright's own CDP support roadmap for Firefox/WebKit**
   before assuming this is permanent — Playwright's own BiDi-based
   Firefox support has been evolving; confirm directly (via Playwright's
   own release notes/changelog, not assumption) whether an equivalent
   touch-dispatch mechanism has since become available for either
   engine.
2. **If not available**, same recommendation as Category A: document
   as a permanent, cross-engine testing limitation with a citation,
   rather than an open-ended gap. The existing comments already explain
   *why* thoroughly — the fix here is confirming there's genuinely
   nothing better available yet, not assuming there isn't.
3. **Do not lower the bar to a synthetic `TouchEvent`** for the sake of
   running on more browsers — both files' own comments already explain
   directly why that specific approach was rejected (it doesn't reliably
   trigger the same native Pointer Events translation), and that
   reasoning still holds.

---

## Category C: A disabled test masking a real, confirmed library bug — FIXED

**Status: implemented and verified in this pass.** Root cause diagnosed,
fix applied to `layout-validator.ts`, the disabled test re-enabled, and
every other test in the same file hand-traced against the fix to
confirm no regressions before committing to it.

**File**: `packages/core/tests/layoutValidator.spec.ts`

**Disabled test** (was commented out, with a `// TODO Fix this test it
should be working` note):
```ts
// it(`Should return false When layout with required keys is invalid`, () => {
//   const data = Array.from({ length: 5 }, () => invalidRequiredLayout);
//   const result = layoutValidator(data);
//   expect(result).toBe(false);
// });
```

### Root cause — confirmed via a direct read of `layout-validator.ts`, not assumed

`layoutValidator`'s own type-checking loop reads:
```ts
const validLayoutIndexable = validLayout as Record<string, unknown>;
return layoutItemKeys
  .map(k => (validLayoutIndexable[k] ? typeof l[k] === typeof validLayoutIndexable[k] : true))
  .includes(false);
```

The ternary condition `validLayoutIndexable[k] ? ... : true` checks the
**truthiness of the reference value itself**, not whether the key is
present. `validLayout` is `{ ...validRequiredLayout, ...validOptionalLayout }`,
and the merged reference values for `i`, `x`, and `y` all resolve to
`0` — a falsy number. For every one of those three keys, on every
layout item ever checked, the ternary takes its `: true` branch
unconditionally, **completely skipping the type check** regardless of
what the real item's value actually is.

This is exactly why `invalidRequiredLayout`'s `y: 'a'` (a string, where
every other field is a number) never gets caught: `validLayout.y` is
`0`, so `y`'s own type is never actually compared at all. The
originally-intended test wasn't flaky or wrong — the validator it was
exercising has a real, reachable bug, confirmed by tracing the exact
values involved, not by guessing.

### Implementation — done

1. **Fixed `layout-validator.ts`**: replaced the truthiness check with a
   real presence check —
   ```ts
   // Before (buggy — skips the check whenever the reference value is falsy):
   validLayoutIndexable[k] ? typeof l[k] === typeof validLayoutIndexable[k] : true
   // After:
   Object.hasOwn(validLayoutIndexable, k) ? typeof l[k] === typeof validLayoutIndexable[k] : true
   ```
2. **Verified no regressions by hand, before applying anything** — traced
   all 10 existing test cases in this file against the fixed logic one
   by one. Confirmed every currently-passing test still passes: each
   field newly subject to a type check (`i`, `isResizable`, `isStatic`,
   `maxH`, `maxW`, `minH`, `minW`, `x`, `y` — all resolve to a falsy
   reference value, `0` or `false`) either already matched its expected
   type in every existing fixture, or (for `invalidOptionalLayout`
   specifically) has the *same type* as the reference value even though
   its *value* is wrong — confirming the file's own existing comment that
   this validator checks type, not value. The `data`-payload tests are
   unaffected for a different reason: `data` is never a key on the
   reference shape at all, so `Object.hasOwn` correctly returns `false`
   for it exactly as the old truthy check did on `undefined`.
3. **Re-enabled the test**, renamed for clarity since it now sits
   alongside a second, genuinely different invalid-shape test that
   previously shared its exact name:
   - `Should return false when a required key has the wrong type (y as
     a string, not a number)` — the newly-fixed one, using
     `invalidRequiredLayout`
   - `Should return false when a required key is missing entirely (y
     absent, not just wrong-typed)` — the pre-existing one, using
     `invalidRequiredLayoutTwo`
4. Both are kept — they exercise genuinely distinct invalid shapes
   (wrong type vs. missing key entirely), not a redundant pair.

---

## Category D: Tests with no committed baseline yet

**File**: `packages/vue/e2e/visual-regression.spec.ts` (7 tests, no
Angular/React equivalent exists)

Not a `.skip()` — these tests run and will fail (not skip) until
baseline screenshots exist, per the file's own header comment.

### Affected tests
1. `basic grid`
2. `drag & resize (initial state, before any interaction)`
3. `add / remove items (initial state)`
4. `responsive breakpoints at a fixed (desktop) viewport`
5. `cross-grid drag/drop (initial state, before any interaction)`
6. `per-item overrides (initial state)`
7. `drag from outside, multi-grid (initial state, before any interaction)`

### Implementation plan

1. In an environment with real Playwright browsers installed
   (`npx playwright install`), run:
   ```sh
   npx playwright test visual-regression --update-snapshots
   ```
2. Review each generated image once by hand before committing — this
   is the one chance to confirm the baseline itself is correct, since
   every future run only diffs against whatever gets committed here.
3. Commit the resulting `visual-regression.spec.ts-snapshots/`
   directory.
4. Consider whether React/Angular should get an equivalent
   visual-regression suite — currently Vue-only; not scoped further
   here since that's a larger, separate decision (a new suite, not a
   fix to an existing one).

---

## Category E: Missing test file (a gap, not a skip)

**Angular has no `packages/angular/e2e/touch-input.spec.ts`** — already
identified and tracked on Angular's own Roadmap prior to this audit;
included here only for completeness, since it's adjacent to Category B.

### Implementation plan

Port Vue's/React's own `touch-input.spec.ts` directly — both already
use identical CDP-based dispatch logic and near-identical test names
(`a touch drag moves an item...` / `a touch drag on the bottom-right
resize handle resizes an item...`), so this is a translation exercise
(Angular's own test-id conventions, component selectors) rather than
new test design.

---

## What this document is not

Not a claim that these are the only tests worth reviewing for quality —
this audit specifically targeted **skipped, disabled, or conditionally-
excluded** tests. It says nothing about test *correctness* for the
~1,600+ tests that run and pass normally across all four packages.
