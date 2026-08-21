# React Port — Parity-Gap Implementation Plan

Closes the gaps `docs/PARITY_GAP_VUE.md` found — the same "how to close
them" role `docs/IMPLEMENTATION_PLAN.md` played for the original phased
port, continued here for the items that plan's own Phase 10 didn't
cover because they were only discovered by the later, verified
prop-by-prop pass against Vue's actual interface files. Read
`docs/PARITY_GAP_VUE.md` first — every phase below cites the exact row
in its two tables it closes.

## A verified finding that changes several effort estimates below

Before designing any of this, `packages/core/src/helpers/native-interaction.ts`
(the shared pointer-driven engine both Vue and React already use) was
read directly rather than assumed. It turns out `INativeDraggableOptions`
already has `allowFrom`/`ignoreFrom`/`activationDistance` fields, and
`INativeResizableOptions` already has `ignoreFrom` — full
`passesDragFilters()`/per-handle `ignoreFrom` logic already implemented,
already used by Vue. **React's own `useGridItemDrag.ts`/
`useGridItemResize.ts` simply never populate these fields in their own
`getOptions()` callbacks** (`() => ({ enabled })` only). Phase 11 below
is therefore "thread three already-working fields through," not new
design — a materially smaller effort than `docs/PARITY_GAP_VUE.md`'s own
priority list assumed before this file was actually opened.

## Phase 11 — Drag/resize start-region restriction + activation distance — done

**Shipped in full**, confirming the effort estimate above: the actual
code changes were exactly "read four more fields off the resolved
item, forward them" — no new logic in either hook, since
`passesDragFilters()`/`resolveActivationDistance()` inside
`native-interaction.ts` already did the real work. The one thing this
phase's own planning got right in advance and worth restating: testing
any of this needed *real* `PointerEvent` dispatch, not this suite's own
`dispatchDragEvent`/`dispatchResizeEvent` backdoor helpers — that
backdoor calls the drag/resize callback directly, bypassing the real
`onPointerDown` listener entirely, which is exactly where the new
filtering/threshold logic runs.

Closes `PARITY_GAP_VUE.md`'s `dragAllowFrom`/`dragIgnoreFrom`/
`resizeIgnoreFrom`/`dragActivationDistance` rows (GridItem-level table).
Grouped together because all four are thin wiring onto the same
already-built mechanism in `native-interaction.ts`, confirmed above.

**Source:** Vue's own four `GridItem` props of the same names — a CSS
selector narrowing which descendant can start a drag (`dragAllowFrom`),
excluding specific elements from starting one (`dragIgnoreFrom`,
defaulting to `` `a, button` ``), the resize equivalent
(`resizeIgnoreFrom`), and a per-pointer-type activation threshold
(`dragActivationDistance`).

**Design:**
- Add `dragAllowFrom?: string | null`, `dragIgnoreFrom?: string`
  (default `` `a, button` ``, matching Vue's own default exactly),
  `resizeIgnoreFrom?: string | null`, and
  `dragActivationDistance?: TDragActivationDistance | null` to
  `ILayoutItem`/`TLayoutItem` in `core` — four more small additive
  fields, same non-breaking pattern as `zIndex`/`showCloseButton`/
  `autoScroll`/etc. (Vue reads these as separate `GridItem` props, not
  layout-item fields — adding them here doesn't change Vue's own
  behavior.)
- `useGridItemDrag.ts`'s own `getOptions()` callback (currently
  `() => ({ enabled: optionsRef.current.enabled })`) grows to also
  return `allowFrom`, `ignoreFrom`, and `activationDistance` straight
  from the resolved item fields — no new logic in the hook itself,
  since `passesDragFilters()`/`resolveActivationDistance()` already do
  the actual work inside `native-interaction.ts`.
- `useGridItemResize.ts`'s own `getOptions()` grows the same way, just
  `ignoreFrom` (resize has no `allowFrom`/activation-distance concept
  in Vue's own version either).
- `GridItem.tsx` resolves `item.dragIgnoreFrom ?? DEFAULT_DRAG_IGNORE_FROM`
  (a new module-level `` `a, button` `` constant, matching Vue's own
  default) and passes the four resolved values into each hook's own
  options object.
- **No grid-wide default for any of these** — confirmed by reading
  Vue's own `IGridLayoutProps` in the parity pass: none of these four
  appear there at all, only on `GridItem`. Matching that exactly (not
  adding a grid-wide layer Vue itself doesn't have).

**Effort:** small — the hard part (`passesDragFilters`/
`resolveActivationDistance`/the whole activation-threshold state
machine) already exists and is already exercised by Vue; this is
strictly "read four more fields off the resolved item, forward them."

**Tests:**
- A `<button>` inside a `GridItem`'s own `children`, clicked-and-dragged
  — should **not** start a drag, using the new default `dragIgnoreFrom`
  (the specific regression `docs/PARITY_GAP_VUE.md` flagged as the
  actual real-world risk on this whole list).
- Same for a resize-hint span containing custom content via
  `renderResizeHandle` with its own interactive child, gated by
  `resizeIgnoreFrom`.
- `dragAllowFrom` restricting drag-start to one specific child selector,
  confirming a click elsewhere on the item no longer starts a drag once
  set.
- `dragActivationDistance` as a plain number and as a
  `{ touch: 8 }`-shaped object, confirming the *other* pointer types
  fall back to the 3px default in the object-form case specifically
  (the exact "unset fields don't silently become instant-activation"
  behavior `resolveActivationDistance`'s own doc comment already
  documents and presumably already tests on the Vue side).

---

## Phase 12 — `restoreOnDrag` — done

**Shipped.** Two things resolved during implementation that the plan
below left open, one of them a real bug found in `core` itself:

1. **A pre-existing `core` bug, not something introduced by this
   port:** `compactItem`'s own code only consulted `minPositions` in
   its `else if(minPositions)` branch — i.e. only when
   `verticalCompact` is `false`. Since `ECompactType.VERTICAL` (the
   default) passes `verticalCompact: true`, `restoreOnDrag` silently
   had **no effect at all** under the default compact type, directly
   contradicting `ICompactorContext.minPositions`'s own doc comment
   (which explicitly documents `y` as applying to `VERTICAL` too). The
   identical bug existed in `compactItemHorizontal` for
   `ECompactType.HORIZONTAL`. Fixed directly in
   `packages/core/src/helpers/utils.ts` (both functions) rather than
   worked around in this package's own tests — this is shared code, so
   Vue had the identical latent bug. The fix is a single line each
   (`const minY = minPositions?.[layoutItem.i]?.y ?? 0;`, replacing the
   hardcoded `0`), fully backward compatible: any caller not passing
   `minPositions` at all sees byte-identical behavior to before.
2. `core`'s own `ICompactorContext.minPositions` doc comment literally
   says minPositions is "present only during a `restoreOnDrag`-gated
   compaction (**drag end**)" — read strictly, that would mean only the
   *final* commit gets the restriction, not every intermediate
   `dragmove` tick. Implemented here to apply during *both* `dragmove`
   and `dragend` instead, since that's what actually delivers the
   feature's own real intent ("other items don't compact past their
   pre-drag position **while the drag is still in progress**", per
   `docs/PARITY_GAP_VUE.md`'s own summary) — a `dragend`-only
   interpretation would mean other items visibly jump out of the way
   mid-drag and only snap back retroactively once you release, which
   defeats the whole point of a *live* visual restraint. Confirmed via
   a dedicated mid-drag (`dragmove`) assertion in the test suite, not
   just a final-`dragend` one — which is exactly the assertion that
   caught bug #1 above once real gesture tests were run, rather than
   this staying a latent, undiscovered issue.

Closes `PARITY_GAP_VUE.md`'s `restoreOnDrag` row (GridLayout-level
table).

**Source:** Vue's own `restoreOnDrag` — during an active drag, other
items don't compact past their own pre-drag position until the drag
ends, via `ICompactorContext.minPositions` (already implemented in
every built-in compactor in `core`, confirmed by reading
`compactor.ts` directly during the parity pass — this is "thread an
existing mechanism through," not new algorithm work).

**Design:**
- Add `restoreOnDrag?: boolean` prop to `IGridLayoutProps`, default
  `false` (matching Vue's own default).
- `handleItemDrag` needs a per-gesture snapshot of every *other* item's
  own pre-drag `y` (or `x`, for `ECompactType.HORIZONTAL`) — a new ref,
  `dragMinPositionsRef` (gesture-scoped bookkeeping, not state, same
  category as `groupMoveStartPositions`/`groupResizeStartSizes` already
  established), captured on `dragstart` from `workingLayoutRef.current`.
- `commitLayout` needs an optional third parameter for the
  `minPositions` to forward into the compactor call's own
  `ICompactorContext` — `(next, minPositions?)` — passed only from
  `handleItemDrag` while `restoreOnDrag` is on and only for
  `dragmove`/`dragend` (not `dragstart`, matching Vue's own
  "no minPositions during the very first tick" gating already noted
  in `compactor.ts`'s own doc comment), `undefined` from every other
  call site (`handleItemResize`, `compactNow`, `duplicateItem`,
  `alignSelected`/`distributeSelected`), preserving their own existing
  behavior exactly.
- Cleared (ref reset to `undefined`) on `dragend`, so a subsequent
  `compactNow()` or unrelated resize doesn't accidentally inherit a
  stale snapshot.

**Effort:** small-to-moderate — `commitLayout`'s signature change
touches every one of its own call sites (a small edit each, but there
are several), and the compaction axis (`y` vs `x`, matching
`compactType`) needs picking correctly for the snapshot's own shape,
mirroring `verticalCompactor`'s `Record<id, {y}>` vs
`horizontalCompactor`'s `Record<id, {x}>` typing already established
in `compactor.ts`.

**Tests:**
- Dragging item A away from a resting position that had item B
  vertically compacted right underneath it — B should **not** rise
  past its own pre-drag `y` while the drag is still in progress (only
  once it ends, when `restoreOnDrag` no longer applies).
- Same scenario with `restoreOnDrag` off (the default) — B rises
  immediately during the drag, matching current (pre-this-phase)
  behavior exactly, confirming no regression for anyone not using the
  prop.
- `ECompactType.HORIZONTAL` variant, confirming the snapshot uses `x`
  instead of `y`.
- A resize (not a drag) with `restoreOnDrag` on — should behave exactly
  as if `restoreOnDrag` were off, since Vue's own prop name and
  `ICompactorContext`'s own doc comment both scope this to drag
  specifically, not resize.

---

## Phase 13 — `enableEditMode` — done

**Shipped in full**, exactly matching the effort estimate — a handful of
`&&` terms across `GridItem.tsx`'s own `resolvedDraggable`/
`resolvedResizable`/`resolvedShowCloseButton`, no new logic. One thing
confirmed rather than assumed during implementation: folding
`resolvedEnableEditMode` into those two resolved booleans (instead of
checking it separately inside `handleKeyDown`) was enough on its own to
block keyboard arrow-key move/resize too, since `handleKeyDown` already
reads those same two values — no separate keyboard-specific check was
needed, confirmed by the dedicated keyboard test rather than assumed.

Closes `PARITY_GAP_VUE.md`'s `enableEditMode` row (both tables).

**Source:** Vue's own grid-wide + per-item master interactivity switch
— `false` disables dragging/resizing/closing for the whole grid (or
just one item) at once, without touching `isDraggable`/`isResizable`
individually.

**Design:**
- Add `enableEditMode?: boolean` to `IGridLayoutProps` (default `true`)
  and `ILayoutItem`/`TLayoutItem` (default `undefined`, deferring to
  the grid-wide value) — the exact same
  grid-wide-default-plus-per-item-override shape already established
  for `isDraggable`/`isResizable`/`showCloseButton`/etc., not a new
  pattern.
- `GridItem.tsx`'s own `resolvedDraggable`/`resolvedResizable`
  computations each gain one more `&&` term:
  `(item.isDraggable ?? context.isDraggable) && resolvedEnableEditMode
  && !isStatic` (and the resize equivalent) — `resolvedEnableEditMode =
  item.enableEditMode ?? context.enableEditMode`.
- The close button (`resolvedShowCloseButton`) needs the same
  `&& resolvedEnableEditMode` term — Vue's own doc comment for this
  prop explicitly includes "closing" alongside drag/resize.
- Keyboard move/resize (`handleKeyDown`) needs the same guard — an
  item with edit mode off shouldn't become move/resizable via arrow
  keys just because the mouse-driven paths are already blocked via
  `resolvedDraggable`/`resolvedResizable` being false (which
  `handleKeyDown` already reads, so this actually falls out for free
  once the two resolved booleans above already include the new term —
  worth double-checking during implementation rather than assuming,
  but likely needs no separate change).

**Effort:** small — structurally identical to props already built
across Phases 2 and 7; the actual code changes are a handful of `&&`
terms across `GridItem.tsx`, not new logic.

**Tests:**
- `enableEditMode={false}` grid-wide — no item drags, resizes, or
  shows a close button, even with `isDraggable`/`isResizable`/
  `showCloseButton` all still `true`.
- Per-item `enableEditMode: false` overriding a grid-wide `true` for
  just one item.
- Per-item `enableEditMode: true` overriding a grid-wide `false` for
  just one item (the "un-lock one panel in an otherwise view-only
  dashboard" use case Vue's own doc comment describes).
- Keyboard arrow-key move/resize also blocked when edit mode is off,
  not just the mouse-driven paths.

---

## Phase 14 — Per-item `resizeHandles`/`isMirrored`/`isBounded` — done

**Shipped in full**, all three following the identical
`item.xxx ?? context.xxx` shape already established for
`showCloseButton`/`autoScroll`/`preserveAspectRatio`/`ariaLabels` — no
surprises. `resizeHandles` used `??` (not `||`) specifically to
preserve an empty array (`[]`) as a distinct, valid value from
`undefined`/`null`, matching Vue's own documented behavior. `isMirrored`
is the one field with a different-*direction* default (`true`, meaning
"participate") rather than the more common "defer to grid-wide"
`undefined` default the others use — resolved as
`context.isMirrored && (item.isMirrored ?? true)` so an item can never
end up mirrored on its own when the grid itself isn't mirrored at all.

Closes three (partial-parity) rows across both `PARITY_GAP_VUE.md`
tables — grouped together since all three are the exact same shape: a
grid-wide default that already exists in React, missing only its
per-item override layer.

**Source:** Vue's own per-item overrides for all three, each deferring
to the matching `GridLayout`-level prop when unset.

**Design (identical shape, done three times):**
- `ILayoutItem.resizeHandles?: TResizeHandle[] | null` — `GridItem.tsx`'s
  own `resolvedResizeHandleEdges` becomes `item.resizeHandles ??
  context.resizeHandles` instead of reading `context.resizeHandles`
  directly. Vue's own doc comment (read during the parity pass) notes
  an empty array (`[]`) is a deliberate, valid "no handle-driven resize
  for this item at all" value distinct from `isResizable: false` (still
  keyboard-resizable) — the `??` (nullish coalescing, not `||`) is what
  preserves that distinction correctly, since `[]` is truthy but not
  nullish.
- `ILayoutItem.isMirrored?: boolean` (default `true`, matching Vue's own
  per-item default of "participate in the parent's mirroring") — every
  `context.isMirrored` read inside `GridItem.tsx`'s own style
  computation and the two hooks' own options becomes
  `context.isMirrored && (item.isMirrored ?? true)`.
- `ILayoutItem.isBounded?: boolean | null` — `useGridItemDrag`'s own
  `isBounded` option becomes `item.isBounded ?? context.isBounded`
  instead of reading `context.isBounded` directly.

**Effort:** small — three independent, mechanically identical additions
following an already-established pattern exactly (this phase's own
description is close to a template instantiated three times, not three
separate designs).

**Tests:** one no-op-when-unset test plus one override-in-each-direction
test per field (6 total), matching the density already used for
`showCloseButton`/`autoScroll`/`preserveAspectRatio` in earlier phases.

---

## Phase 15 — `showResizeHandles`/`resizeHandleColor` — done

**Shipped.** The prop/context/resolution plumbing followed the exact
grid-wide-plus-per-item shape already established (small, as expected).
The visual design itself — the one genuinely open question this phase
flagged in advance — landed as a `::after` pseudo-element layered on
top of each existing (always-present, invisible) `.kdl-resize-hint` hit
zone: a short bar for edge handles, a small square for corners. The
real hit zone/grabbable area is completely unchanged either way; only
the visual layer differs, gated entirely behind the new
`.kdl-grid-item--show-resize-handles` class so the previously-existing
default (off) rendering stays byte-for-byte identical.

Closes `PARITY_GAP_VUE.md`'s two rows of the same names (both tables).

**Source:** Vue's own opt-in **visible** resize-handle affordance (a
small triangle/bar per edge/corner) — React's current resize-hint spans
are always present in the DOM once an item is resizable, styled only
with a `cursor: *-resize` rule, with no dedicated "make it visually
obvious" mode or color to configure.

**Design:**
- Add `showResizeHandles?: boolean` to `IGridLayoutProps` (grid-wide
  default, `false`) and `ILayoutItem` (per-item override) — same
  established shape as Phase 14.
- Add `resizeHandleColor?: string` similarly, applied via a
  `--kdl-resize-handle-color` CSS custom property on `GridItem`'s own
  root `style` (inherited-via-CSS-variable, matching Vue's own
  documented mechanism for this exact prop, not an eventBus/context
  cascade — no new plumbing needed beyond setting the one custom
  property).
- New CSS: `.kdl-grid-item--show-resize-handles .kdl-resize-hint`
  becomes visually solid (background color from
  `var(--kdl-resize-handle-color, <semi-transparent gray default>)`,
  matching Vue's own default color, confirmed during the parity pass)
  instead of the current fully-transparent hit-zone-only styling; the
  class only applies when the resolved `showResizeHandles` is true, so
  the default (off) case's rendering is completely unchanged.

**Effort:** moderate — the actual visual design (triangle/bar shape vs.
Vue's own, sizing per corner vs. per edge) needs a genuine small design
pass, not just wiring; the prop/context/resolution plumbing itself is
the same small shape as every other grid-wide-plus-per-item prop.

**Tests:**
- Class presence/absence based on the resolved (grid-wide ?? per-item)
  boolean.
- `resizeHandleColor` producing the correct CSS custom property value.
- Confirms the *default* (off) rendering is byte-for-byte unchanged
  from before this phase (a snapshot-style assertion on the existing
  resize-hint tests, not a new mechanism to test).

---

## Phase 16 — `transformScale` — done

**Shipped.** Confirmed during implementation, not just assumed: only
the per-tick pixel *delta* (`dragmove`'s own `coreEvent.deltaX`/`deltaY`,
`resizemove`'s own `dx`/`dy`) needs dividing by `transformScale` before
being applied — the `dragstart`/`resizestart`-derived *absolute*
position read (via `getBoundingClientRect()`) already reflects the
real, on-screen post-scale position directly, with nothing to divide
out of a single absolute read the way a delta needs. Since jsdom applies
no real CSS transforms at all (the same limitation Phase 7's own RTL
tests worked around), this was verified via hand-computed pixel math
against a stubbed `containerWidth` rather than an actual rendered,
scaled ancestor — confirming the arithmetic is correct, not that a real
browser's own rendering matches it pixel-for-pixel.

Closes `PARITY_GAP_VUE.md`'s `transformScale` row (GridLayout-level
table).

**Source:** Vue's own CSS-transform-scale compensation for drag/resize
math, when the whole grid renders inside a scaled ancestor (e.g. a
zoomed-out canvas view).

**Design:**
- Add `transformScale?: number` to `IGridLayoutProps`, default `1`,
  threaded into `GridContext`.
- `useGridItemDrag.ts`'s `handleDrag`: every pixel delta derived from
  `createCoreData` (`coreEvent.deltaX`/`deltaY`) needs dividing by
  `transformScale` *before* being added to `draggingRef.current`'s own
  running position — a scaled-down ancestor makes a real 10px pointer
  movement correspond to more than 10px of the item's own unscaled
  pixel space, and the reverse for a scaled-up ancestor.
- `useGridItemResize.ts`'s `handleResize`: the same division applied to
  `dx`/`dy` before they're added to `prevWidth`/`prevHeight`/
  `prevHorizontal`/`prevTop`.
- `dragstart`'s own initial `getBoundingClientRect()`-based position
  read does *not* need scaling (a real, already-rendered element's own
  rect is already in the correct, actually-on-screen scaled pixels —
  only the *deltas* computed from raw pointer movement need
  compensating, not a one-time absolute read).

**Effort:** moderate — touches the actual drag/resize pixel math
directly in both hooks (every delta, not just one call site), closer
in shape and risk to Phase 7's own RTL work (which also touched core
per-gesture math in both hooks) than to a simple additive prop.

**Tests:** wrap a `GridLayout` in a container styled with
`transform: scale(0.5)` (jsdom doesn't apply real CSS transforms to
`getBoundingClientRect()`, so this needs the math verified directly
against `transformScale`'s own prop value with hand-computed expected
deltas, the same "compute expected pixel-to-grid-unit math by hand
rather than guessing" convention already established for this test
suite) — a drag/resize with `transformScale={0.5}` should land at
double the *unscaled* grid-unit distance a real pointer movement of a
given size would produce at `transformScale={1}`.

---

## Phase 17 — Styling configurability — done

**Shipped in full**, exactly matching the effort estimate. The
transition pair became a genuine CSS-custom-property with a fallback
(`var(--kdl-transition-duration, 200ms)`), so a consumer who never sets
either prop sees byte-identical rendered output to before this phase.
`borderRadiusPx`/`useBorderRadius` followed the exact
grid-wide-default-plus-per-item-override shape already established, and
plugged into `GridItem.tsx`'s own existing `style` computation right
alongside `zIndex` — same "plain inline style, not a CSS custom
property" treatment, since the value is already fully resolved per-item
in JS by that point either way.

Closes `PARITY_GAP_VUE.md`'s `transitionDurationMs`/
`transitionTimingFunction`/`borderRadiusPx`/`useBorderRadius` rows
(both tables) — grouped together as the lowest-urgency items on the
whole list (React's current hardcoded values are reasonable defaults,
just not configurable).

**Source:** Vue's own four styling props, all applied via CSS custom
properties inherited naturally through the DOM (confirmed during the
parity pass — none of these use an eventBus cascade), not per-item
JavaScript computation.

**Design:**
- `transitionDurationMs`/`transitionTimingFunction`: grid-wide only
  (confirmed — neither appears on Vue's own `GridItem` props), applied
  as `--kdl-transition-duration`/`--kdl-transition-timing` custom
  properties on `GridLayout`'s own root `style` object; `styles/
  index.css`'s existing hardcoded `.kdl-grid-item` transition rule
  becomes `transition: left var(--kdl-transition-duration, 200ms)
  var(--kdl-transition-timing, ease), ...` (repeated per property),
  inherited down to every `GridItem` automatically.
- `borderRadiusPx`/`useBorderRadius`: grid-wide default + per-item
  override (both appear on both Vue interfaces), same established
  shape as Phase 14 — `GridItem.tsx` applies
  `borderRadius: resolvedUseBorderRadius ? \`${resolvedBorderRadiusPx}px\`
  : undefined` directly in its own inline `style` object (a plain
  numeric value computed in JS, not a CSS custom property this time,
  matching how `zIndex` is already applied — simpler than the other
  two props above since there's no grid-wide-CSS-inheritance benefit
  to gain from a custom property here, given the value is already
  fully resolved per-item in JS either way).

**Effort:** small — four independent, low-risk styling props; the
CSS-custom-property duration/timing pair needs a small `styles/
index.css` edit, the border-radius pair is a one-line inline-style
addition following the `zIndex` precedent exactly.

**Tests:** one prop-to-rendered-value test per field (4 total) — plain
assertions on the resulting inline style/custom property, no gesture
simulation needed for any of these.

---

## Phase 18 — `distributeEvenly`/`horizontalShift` — done

**Shipped**, after reading `move-helper.ts`/`responsive-utils.ts`
directly (confirming this plan's own least-reliable estimate needed
real verification, not just wiring blind): both `moveElement`'s
`horizontalShift` parameter and `correctBounds`'s `distributeEvenly`
parameter were **already fully implemented and working** in `core` —
React's own call sites (`handleItemDrag`'s `moveElement(...)` call, and
the responsive-breakpoint effect's `findOrGenerateResponsiveLayout(...)`
call) simply hardcoded `false` for both, regardless of anything a
consumer might set. Both fixes are a single hardcoded `false` replaced
with the new resolved prop value at its own existing call site —
genuinely "thread an existing mechanism through," the same shape as
Phase 12's own `restoreOnDrag`, just without a bug blocking it this
time.

**A separate, pre-existing `core` bug found while reading this closely
(not fixed as part of this phase — out of scope, flagged for a
dedicated look):** `moveElementAwayFromCollision`'s own recursive
`$default`-branch call to `moveElement` passes its arguments in the
wrong order relative to `moveElement`'s real signature
(`layout, l, x, y, isUserAction, horizontalShift, preventCollision?`).
The recursive call passes only 6 arguments
(`layout, itemToMove, x, y, horizontalShift, preventCollision`), which
means `isUserAction` for that inner call silently receives whatever
`horizontalShift` actually was, and `horizontalShift` itself receives
`preventCollision`'s own *local* value inside
`moveElementAwayFromCollision` (always `false`, hardcoded at that
function's own top) — so a *cascading* collision (the pushed item
itself colliding with something else) never actually sees the real
`horizontalShift` value, only the top-level, first collision does. This
is shared code, so Vue has the identical latent bug; it predates
`horizontalShift` ever being wired up as a prop on either platform (it
was dormant, since `horizontalShift` was never `true` anywhere until
now), so it's a separate, deeper issue in cascading collision
resolution rather than something this phase's own scope covers. The
test suite for this phase deliberately uses geometry that stays clear
of triggering a cascading collision at all, so as not to conflate the
two.

Closes `PARITY_GAP_VUE.md`'s two rows of the same names (GridLayout-
level table).

**A separate, genuine bug found and fixed while writing this phase's
own tests (not a parity gap — a real, user-facing defect this phase's
own work happened to surface):** `containerWidth`'s state seeds at
`100` (`useState(100)`), and the responsive-breakpoint effect used to
guard only on `containerWidth < 1` — meaning on any mount where
`responsive` is already `true`, that effect's *very first* run (in the
same commit as the initial render, before the separate container-width
measuring effect's own `setContainerWidth` call from a *real*
measurement has had a chance to land in a later render) saw the seed
value `100`, not the real width. At `100`, `getBreakpointFromWidth`
resolves to `'xxs'` (`IBreakpoints`'s own default threshold for it is
`0`) — meaning **every real consumer mounting with `responsive` on
briefly had their layout bounds-corrected and compacted for a
2-column grid, regardless of the actual container size**, before the
real measurement ever landed. Caught by a `distributeEvenly` test that
kept failing in a way inconsistent with the arithmetic, traced back to
this rather than a bug in `distributeEvenly` itself. Fixed with a
dedicated `hasMeasuredWidth` flag (not `containerWidth` itself, which
can't distinguish "never measured" from "measured, and it's a small
number" — a real container can legitimately be under 480px wide too)—
the responsive effect now waits for a genuine first measurement before
ever resolving a breakpoint at all. This is React-only (Vue's own
`useResponsiveLayout.ts` composable wasn't checked in this pass to
confirm whether it has the identical bug — worth a look, since it may
share the same "seed value looks like a real one" shape depending on
how its own initial `width` ref is seeded).

**Source:** Vue's own `distributeEvenly` (spread overflowing items
evenly across available columns instead of clamping) and
`horizontalShift` (which direction a colliding item gets shifted
*mid-gesture*, distinct from `compactType`'s own "how the whole layout
settles afterward" scope).

**Design (as actually shipped):**
- `distributeEvenly?: boolean` added to `IGridLayoutProps`, default
  `false`. The one, and only, call site that ever consults it in
  `core` is `correctBounds`, itself only ever called from
  `findOrGenerateResponsiveLayout` — meaning this prop has an effect
  *only* during a responsive breakpoint change that shrinks `colNum`
  enough to push an item out of bounds; it is not consulted by
  ordinary drag/resize/compaction at all, matching `core`'s own actual
  scope for the parameter (verified directly, not assumed from the
  name). Threaded straight into the existing
  `findOrGenerateResponsiveLayout(...)` call in place of the hardcoded
  `false`.
- `horizontalShift?: boolean` added to `IGridLayoutProps`, default
  `false`. Threaded straight into `handleItemDrag`'s existing
  `moveElement(next, item, resolvedX, resolvedY, true, horizontalShift,
  preventCollision)` call in place of the hardcoded `false` — the sixth
  positional argument `moveElement` already expects.

**Tests:**
- `distributeEvenly`: a responsive breakpoint change that pushes an
  item out of bounds, with a static item positioned specifically so
  vertical compaction (which always runs *after* `correctBounds`)
  can't undo the redistribution effect by pulling the item straight
  back up — confirming `false` clamps to the right edge on the same
  row, `true` wraps to the next row instead.
- `horizontalShift`: two adjacent (touching, not overlapping) items,
  the first dragged onto the second's exact original spot (a full-
  overlap collision, vacating the first item's own starting spot in
  the process) — confirming `false` pushes the second item straight
  down a row (unchanged `x`), `true` pushes it sideways into the now-
  empty spot instead (unchanged `y`). Item heights and starting
  positions chosen deliberately so neither scenario's own push creates
  a *second* collision, which would otherwise exercise the separate,
  pre-existing recursive-argument bug described above rather than the
  one thing this test actually needs to check.

---

## Phase 19 — Per-item `autoHeight` — done

**Shipped**, after reading Vue's own `GridItem.vue`/`useGridItemResize.ts`
directly rather than working from this plan's own earlier description
(itself based on an even earlier summary) — several details only
surfaced that way:

- The wrapper needs `height: auto` (not just any wrapper) specifically
  so it can grow past the item's own current fixed height; a wrapper
  inheriting a fixed/percentage height would never register a larger
  size for the `ResizeObserver` to detect in the first place. Vue's own
  code has a dedicated bug-fix comment for exactly this failure mode.
- Vue's own `calcWH` has an `autoSizeFlag` parameter most of this port's
  own earlier planning never mentioned: with it set, **height rounds up
  (`Math.ceil`)**, not to the nearest unit — deliberately, so content
  that's grown slightly past an exact row-height multiple lands on the
  next full row rather than being clipped by a downward rounding. Width
  is unaffected either way. Confirmed with a dedicated test asserting a
  height that would round *down* to the item's current `h` under normal
  rounding, but *up* to a new one here.
- The actual commit is a single `resizeend`-style call with no synthetic
  `resizestart`/`resizemove` at all — this isn't a pointer gesture, so
  there's no "start" to synthesize.
- Testing this exposed a real gap in the shared `ResizeObserver` test
  mock: its own doc comment assumed exactly one `ResizeObserver` exists
  per test (true before this phase, since only `GridLayout`'s own
  container-width observer existed) — an `autoHeight`-enabled `GridItem`
  now constructs a *second* one in the same test. Extended the mock to
  track every constructed instance (not just the most recent), added a
  `beforeEach` reset (the array is module-level state `setupFiles`
  otherwise only clears once per test *file*, not per test — confirmed
  as a real bug while writing this, not assumed), and kept the existing
  `triggerResizeObserverMock()` operating on the last entry so every
  pre-existing test's own behavior is unchanged.

Closes `PARITY_GAP_VUE.md`'s `autoHeight` row (GridItem-level table).

**Source:** Vue's own `ResizeObserver`-driven automatic re-measurement
of an item's own height whenever its own content changes size (a chart
rendering taller with more data points), independent of the whole grid
being `autoSize`d.

**Design:** A new `ILayoutItem.autoHeight?: boolean` field. `GridItem.tsx`
needs its own `ResizeObserver` on the rendered content's own root
(separate from `GridLayout`'s own container-width observer), calling
`context.onItemResize(i, 'resizeend', item.x, item.y, item.w, newH)`
directly (not through the drag/resize gesture path at all — this isn't
a pointer gesture, it's a content-driven size change) whenever the
observed content's own height crosses into a different grid-row-unit
boundary. Needs its own care around not fighting the *resize gesture*
path (an item resizing via pointer shouldn't also be fighting its own
content-driven `ResizeObserver` mid-gesture) — likely gated to only
fire when `!isResizing`.

**Effort:** moderate — genuinely new mechanism (no existing "watch this
item's content and report a size change" plumbing anywhere in this
package today), and needs care around the interaction with an
in-progress pointer-driven resize specifically.

**Tests:** simulate a `ResizeObserver` callback firing with new content
dimensions (matching this suite's own `triggerResizeObserverMock`
convention already established for `GridLayout`'s own container-width
observer, reusable here for a *second*, item-scoped observer instance)
and confirm `h` updates accordingly; confirm no interference with an
active pointer resize gesture happening at the same time.

---

## Phase 20 — `responsiveLayouts` custom-breakpoint-name typing (🟡 gap) — done

Closes `PARITY_GAP_VUE.md`'s `responsiveLayouts` row (GridLayout-level
table) — the one row marked 🟡 rather than ✅/❌, since the capability
partially exists on both sides already; this phase is about the *type*
gap specifically, not a missing runtime feature.

**Source, re-verified directly for this plan (not carried over from the
earlier pass):** Vue's own `grid-layout-props.interface.ts` types
`responsiveLayouts?: { [key: string]: TLayout };` — a locally-defined,
fully open index signature, accepting *any* string key. React's own
`TResponsiveLayout` (`core/layout-definition.ts`) has exactly the 7
standard optional keys (`xxs`–`xxl`) and nothing else — a custom
breakpoint name isn't representable in the type system at all on the
React side, even though nothing in `findOrGenerateResponsiveLayout`'s
own runtime logic hardcodes those 7 names when *reading* a
`responsiveLayouts` entry (it's a plain object index lookup either
way).

**A finding worth being honest about, surfaced while re-checking this
directly rather than assuming the gap is a clean, obviously-useful
feature:** Vue's own `breakpoints`/`cols` props are typed as
`IBreakpoints`/`IColumns` — confirmed, by reading
`grid-layout-props.interface.ts` directly, to be the *exact same*
shared, fixed-7-key interfaces from `@keystone-dashboard-layout/core`
that React already uses (`export type { IBreakpoints, IColumns } from
'@keystone-dashboard-layout/core';` — not a Vue-local, separately
looser type). And `getBreakpointFromWidth`'s own `isBreakPointDefined`
guard (`breakpoints-helper.ts`, shared `core` code both frameworks call)
*requires* all 7 standard keys to be present, and can only ever
*resolve* to one of those 7 names — confirmed by reading its own
implementation, not assumed. Put together: on **both** Vue and React,
a `responsiveLayouts` entry keyed under some custom, non-standard name
can *never actually be reached* through the normal breakpoint-resolution
path (`getBreakpointFromWidth` → `findOrGenerateResponsiveLayout`'s own
cache lookup), since the breakpoint that lookup ever uses as a key is
always one of the 7 fixed names. Vue's own looser `responsiveLayouts`
typing therefore looks like it may simply be **inconsistent with its
own, equally-fixed `breakpoints`/`cols` typing** — not a deliberately
designed "bring your own breakpoint names" feature with a working
runtime path behind it. This phase closes the *type-level* parity gap
`PARITY_GAP_VUE.md` named either way (matching Vue's own declared
type, for consistency and so a consumer moving between the two
packages doesn't hit a type error passing the same object), while
documenting plainly that a custom-named entry won't be *reachable* on
either side without also loosening `breakpoints`/`cols` (out of scope
here, and not something Vue itself does either).

**Design:**
- Add an index signature to `TResponsiveLayout`
  (`core/layout-definition.ts`), alongside its existing 7 named
  optional keys, rather than replacing them — keeps the existing named
  keys as autocomplete-friendly convenience properties (so
  `responsiveLayouts.lg` still type-checks and autocompletes exactly as
  before) while also accepting an arbitrary string key:
  ```ts
  export type TResponsiveLayout = {
    xxl?: TLayout;
    xl?: TLayout;
    lg?: TLayout;
    md?: TLayout;
    sm?: TLayout;
    xs?: TLayout;
    xxs?: TLayout;
    [key: string]: TLayout | undefined;
  };
  ```
  Purely additive at the type level — every existing call site
  constructing a `TResponsiveLayout` with only the 7 standard keys
  keeps compiling unchanged, since a stricter-shaped object is always
  assignable to a looser one with a compatible index signature.
- No runtime code changes needed at all: `findOrGenerateResponsiveLayout`
  and `GridLayout.tsx`'s own `layoutsCacheRef` already do a plain
  `layouts[breakpoint]`-style lookup (an ordinary object index, not a
  hardcoded switch over the 7 names) — confirmed directly, not assumed
  — so the type change alone is sufficient to let a consumer *pass* an
  object with extra custom keys without a compile error; those extra
  keys are simply never looked up today; see the finding above for why
  that's an accurate reflection of the feature's *actual* reach on both
  platforms, not a new limitation this phase introduces.
- `IGridLayoutProps.responsiveLayouts` in React's own
  `grid-layout-props.interface.ts` already types this field as
  `TResponsiveLayout` (re-exported from `core`), so no separate edit is
  needed there beyond the `core` type itself changing.

**Effort:** small — a single type-level change to one shared `core`
type, no runtime logic to write or touch.

**Tests:** primarily a type-level check (a `.ts` fixture asserting an
object with a custom breakpoint key alongside the 7 standard ones
compiles as a valid `TResponsiveLayout`, and that the 7 standard keys
still autocomplete/type-check individually) rather than a behavioral
test — there's no new *runtime* behavior this phase adds to verify,
per the finding above. Worth one small runtime test confirming a
custom-keyed entry is silently ignored (not thrown on, not read) during
a real breakpoint change, to lock in and document the "present in the
object, inert at runtime" behavior explicitly, rather than leave it
implicit.

**Shipped exactly as planned.** The index signature was added to
`TResponsiveLayout` alongside its existing 7 named keys (purely
additive — confirmed no existing call site needed a change). One new
test in `GridLayoutResponsive.spec.tsx` covers both halves at once: the
test file compiling with a custom `'tablet-landscape'` key present in
`responsiveLayouts` *is* the type-level check (no separate `.ts`
fixture needed, since a real component test already exercises the
type), and its own runtime assertion confirms that key is silently
ignored during an actual breakpoint change — the resolved layout is a
freshly-generated "xs" one, not the inert custom-keyed entry.

---

## Phase 21 — `moveElementAwayFromCollision` recursive argument-order bug (`core`) — done

Not a `PARITY_GAP_VUE.md` row — this is a genuine, pre-existing **bug**
in shared `core` code, found (not introduced) while implementing
`horizontalShift` in Phase 18, affecting Vue and React equally. Tracked
here as its own phase specifically because Phase 18 deliberately left
it unfixed and flagged it for a dedicated pass rather than a rushed
patch alongside unrelated work.

**Source — the bug itself, re-confirmed directly against
`move-helper.ts` for this plan rather than relying on Phase 18's own
summary alone:**

`moveElement`'s real signature is
`(layout, l, x, y, isUserAction, horizontalShift, preventCollision?)`
— 7 parameters. `moveElementAwayFromCollision`'s own recursive
`$default`-branch call at the end of that function passes only 6
positional arguments:

```ts
return moveElement(
  layout,
  itemToMove,
  movingCordsData.$default.x,
  movingCordsData.$default.y,
  horizontalShift,
  preventCollision,
);
```

Every argument after `y` silently shifts one slot to the left relative
to the real signature:
- `isUserAction` (5th parameter) receives whatever `horizontalShift`
  actually was.
- `horizontalShift` (6th parameter) receives `preventCollision`'s own
  *local* value inside this function (always `false`, hardcoded at its
  own top — `// we're already colliding`).
- `preventCollision` (7th parameter) is never passed at all (`undefined`,
  which behaves like `false` given `moveElement`'s own
  `if(preventCollision && collisions.length)` check).

**A materially worse practical impact than Phase 18's own summary
stated**, found by tracing the actual data flow for this plan rather
than re-describing the earlier finding as-is: since every *current*
call site threading into this function passes `isUserAction: true`
(confirmed — `GridLayout.tsx`'s own `handleItemDrag`, the only
real entry point, always calls `moveElement(next, item, ..., true,
horizontalShift, preventCollision)`), and `isUserAction` is otherwise
passed through *unchanged* at every other level of the cascade,
`isUserAction` is effectively always `true` throughout an entire
collision cascade today — **except** at this one buggy recursive call,
where it silently becomes whatever `horizontalShift` is instead. With
`horizontalShift` at its own default (`false`), this means **any
multi-level collision cascade reaching this branch has always had
`isUserAction` incorrectly reset to `false`**, suppressing this
function's own "try moving directly above the collision first, if
there's room" optimization (the `if(isUserAction) { ... }` block at the
top of the function) for that inner call — a *pre-existing* defect,
latent since before `horizontalShift` was ever wired up as a prop on
either platform, not something newly introduced by Phase 18's own
work. `horizontalShift: true` happens to *mask* the symptom (since
`isUserAction` then coincidentally still reads `true`), which is
likely why this went unnoticed — the bug was only fully exposed by
deliberately tracing every argument position for this plan, not by a
failing test.

**Design:**
- The fix is a single added argument at the one buggy call site —
  restoring the missing `isUserAction` in its correct position:
  ```ts
  return moveElement(
    layout,
    itemToMove,
    movingCordsData.$default.x,
    movingCordsData.$default.y,
    isUserAction,
    horizontalShift,
    preventCollision,
  );
  ```
  Nothing else in the function needs to change — `isUserAction` is
  already an in-scope parameter of `moveElementAwayFromCollision`
  itself, simply never threaded into this one call.
- This is shared `core` code (`packages/core/src/gridlayout/helpers/
  move-helper.ts`) — the fix applies once, to both the Vue and React
  ports, with no framework-specific change needed on either side.
- No new prop/parameter/type surface — this phase is a correctness fix
  to existing, already-shipped behavior, not a new feature.

**Risk assessment before implementing:** this function is on the
collision-cascade hot path for every drag (`moveElement`'s own
collision-resolution loop calls it once per colliding item found), so
this fix's own blast radius is every layout dense enough for a drag to
cause more than one item to shift. The fix only *restores* previously-
intended behavior (making `isUserAction`/`horizontalShift` correct
again, not introducing new logic) — but "only ever wrong before, now
correct" can still visibly change existing snapshot/pixel-position
test expectations in *either* package's own test suite if any existing
test happens to exercise a multi-level cascade today (even inadvertently,
without intending to). Run each package's **full** existing suite after
the fix, not just this phase's own new tests, specifically watching for
any pre-existing cascade-related test whose expected values shift.

**Tests:**
- A dedicated multi-level cascade: three (or more) items positioned so
  that pushing item A into item B's own collision-resolution *also*
  pushes item B into item C — the exact scenario Phase 18's own tests
  deliberately avoided. Confirm C ends up at the position `isUserAction:
  true`'s own "try moving directly above first" optimization would
  produce, not the position a (buggy) `isUserAction: false` cascade
  would.
- The identical scenario with `horizontalShift: true`, confirming the
  fix doesn't regress the *already-masked-correct* case (this is the
  one Phase 18's own tests already partially covered by avoiding
  cascades — this phase's own test should deliberately *include* one,
  unlike Phase 18's, to close that gap directly).
- A single-level (non-cascading) collision, confirming this fix has no
  observable effect there at all — this bug was always scoped to the
  recursive branch specifically, never the first-level, directly-called
  path.

**Shipped exactly as planned.** The fix is the single added
`isUserAction` argument at the buggy call site, restoring
`moveElementAwayFromCollision`'s own recursive call to `moveElement`'s
real 7-parameter signature. Three new tests added to
`packages/core/tests/move-helper.spec.ts` (a dedicated `describe` block
within the existing `moveElementAwayFromCollision` suite), using a
four-item geometry engineered specifically to force the outer
collision into the `$default` branch (blocking its own "move directly
above" shortcut) and land exactly on a third item, triggering the
previously-buggy inner recursive call — the isUserAction test confirms
the fixed inner resolution lands at the position its own "move above"
shortcut produces (not the `$default`-only position a suppressed
`isUserAction` would have given); the horizontalShift test confirms
the already-coincidentally-correct case isn't regressed; the
single-level test confirms the fix has zero effect outside the
recursive branch it targets.

Per the risk assessment above, the full existing `core` test suite was
also run after the fix (not just these three new tests) — no other
test's own expected values shifted, meaning no existing test happened
to exercise a multi-level cascade before this fix landed.

---

## Summary table

| Phase | Item | Effort | Confidence |
|---|---|---|---|
| 11 | `dragAllowFrom`/`dragIgnoreFrom`/`resizeIgnoreFrom`/`dragActivationDistance` | Small | High — mechanism read and confirmed already built — **done** |
| 12 | `restoreOnDrag` | Small-Moderate | High — `core`'s own `minPositions` mechanism confirmed already built — **done** |
| 13 | `enableEditMode` | Small | High — identical shape to already-shipped props — **done** |
| 14 | Per-item `resizeHandles`/`isMirrored`/`isBounded` | Small | High — identical shape to already-shipped props — **done** |
| 15 | `showResizeHandles`/`resizeHandleColor` | Moderate | Medium — needs a real (if small) visual design pass — **done** |
| 16 | `transformScale` | Moderate | Medium — touches core gesture math directly, not yet prototyped — **done** |
| 17 | `transitionDurationMs`/`transitionTimingFunction`/`borderRadiusPx`/`useBorderRadius` | Small | High — **done** |
| 18 | `distributeEvenly`/`horizontalShift` | Moderate | **Low** — `moveElement`'s real signature and current `correctBounds` call sites not yet verified in this pass — **done** (both were already fully implemented in `core`; React's own call sites just hardcoded `false`) |
| 19 | Per-item `autoHeight` | Moderate | Medium — genuinely new mechanism, not just wiring — **done** |
| 20 | `responsiveLayouts` custom-breakpoint-name typing | Small | High — a single shared `core` type change, no runtime logic — **done** |
| 21 | `moveElementAwayFromCollision` recursive argument-order bug (`core`) | Small | High — a single-line fix at a precisely identified call site, but needs the full existing test suite re-run given the shared-code blast radius — **done** |

## Recommended sequencing

1. **Phase 11** — highest real-world severity (per `PARITY_GAP_VUE.md`'s
   own priority note) and now confirmed to be the smallest effort on
   this entire list, having verified the mechanism already exists.
   Clear first choice.
2. **Phase 13** and **Phase 14** — both small, both identical in shape
   to patterns already proven across the original 10-phase port; safe,
   fast wins alongside Phase 11.
3. **Phase 12** — still small-to-moderate, but the underlying `core`
   mechanism is confirmed, making it a reliable next step once the
   `commitLayout` signature change is planned out.
4. **Phase 17** — independent, low-risk, can slot in anywhere.
5. **Phase 15** — do after 14 (shares the same per-item resolution
   pattern, so the muscle memory is fresh) once its own small visual
   design question is settled.
6. **Phase 16** — save for its own focused pass; the actual gesture-math
   changes deserve the same care Phase 7's RTL work got, not a rushed
   add-on to a batch of smaller items.
7. **Phase 19** — independent, can land whenever; genuinely new
   mechanism, budget real design time rather than treating it as
   wiring.
8. **Phase 18** — deliberately last: verify `moveElement`'s actual
   signature and every current bounds-correction call site *before*
   estimating this one further, let alone starting it. The effort
   estimate above is the least trustworthy number in this whole
   document for exactly that reason.
