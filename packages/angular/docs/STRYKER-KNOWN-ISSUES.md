# Known, understood limitation: min/max clamp boundary mutants are equivalent

`grid-item.component.ts`'s `EqualityOperator` mutants on its several
min/max/floor clamps (`autoSize()`'s own `pos.w < this.minW` etc. at
lines 1021/1024/1027/1030/1043/1046, and `handleResize`'s identical
pattern at lines 1341/1344/1347/1350/1353/1356) survive Stryker's own
`<` → `<=` (and `>` → `>=`) mutation, and — unlike the pattern
documented in `packages/core/docs/STRYKER-KNOWN-ISSUES.md` — this one
is genuinely **understood**, not a mystery. No test can kill these; more
test-writing effort here is wasted effort, not an unexplored gap.

## Why these are equivalent, not a coverage gap

Every one of these follows the same shape:

```ts
if(pos.w < this.minW) {
  pos.w = this.minW;
}
```

The assignment inside the `if` sets `pos.w` to exactly the value it's
being compared against. The only place `<` and `<=` could ever disagree
is the exact boundary (`pos.w === this.minW`) — but at that exact
point, the correct code (`<`, false, skip the assignment) and the
mutant (`<=`, true, run the assignment) produce the **identical final
value** of `pos.w`: the already-current `minW`, whether by leaving it
untouched or by reassigning it to itself. There is no way to construct
a test whose observable output differs between the two — a
`toStrictEqual`/`toBe` assertion on the resulting value sees the same
thing either way.

This was actually confirmed by trial, not just reasoned in the
abstract: a test was added specifically isolating `handleResize`'s own
`minW` clamp (verified via the reported eventBus payload, matching the
existing pattern for `minH`/`maxW`/`maxH`) — shrinking the item well
past `minW` down to grid-unit `0` before the clamp applies. The mutant
still survived, because `0 < minW` and `0 <= minW` both evaluate `true`
identically; the test never actually reached the *exact* boundary
where the two operators would disagree, and — per the reasoning
above — reaching that boundary wouldn't have helped either, since the
assigned value is identical either way there too.

## The same pattern already confirmed elsewhere in this codebase

`packages/core/tests/layout-validator.ts`'s own data-fixture mutants hit
a related (not identical) flavor of this same "no observable
difference" conclusion — see that package's own investigation for the
precedent. This file's own instance is a cleaner, more general case: a
self-referential clamp assignment (`x = boundary` when `x` is already
compared against that exact `boundary`) is equivalent for *any* such
pattern, not specific to this codebase's own validators.

## For whoever picks this up next

Don't spend more time writing tests to try to kill these specific
`EqualityOperator` mutants on a min/max/floor clamp shaped like the one
above — verified unfixable by direct trial, not merely predicted. If a
future refactor changes the clamp to *not* assign the same boundary
value back (e.g., some rounding/adjustment happens as part of the
clamp, not a bare reassignment), re-evaluate whether the equivalence
still holds — it was specific to the exact code shape at the time of
this writing, not a general property of "any min/max clamp forever."
