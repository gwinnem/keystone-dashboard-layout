# Angular Port — Implementation Plan

Phase-by-phase tracking against `docs/PARITY_GAP_ANGULAR.md`'s own
architecture mapping and prop inventory, the same relationship the
React package's `IMPLEMENTATION_PLAN.md`/`PARITY_GAP_VUE.md` have to
each other. Each phase should be individually buildable and testable
before the next starts — not a single all-at-once port.

## Phase 0 — Real Angular CLI workspace (done, though not via the originally-planned route)

The originally-planned `ng generate library` + scratch-workspace route
hit a real wall: `ng generate library` requires a full Angular CLI
workspace (`angular.json` at the root, created via `ng new`), which
doesn't exist in this pnpm/turborepo monorepo. What actually landed:
a hand-assembled, project-scoped `angular.json` (just enough for
Karma's own `test` architect target), then a full pivot away from
Karma for *unit* tests entirely — Karma kept only for a possible future
full-app browser-flow e2e layer (still not started; see "Testing
strategy" below), with **Jest + `jest-preset-angular`** actually
running `GridItemComponent`/`GridLayoutComponent`'s own unit/component
tests. Two Vitest-based routes were tried first and abandoned for
concrete, confirmed reasons: Angular's own first-party Vitest builder
(`@angular/build:unit-test`) doesn't exist at all for this package's
Angular `^19.0.0` target (only v20+experimental/v21+stable), and the
third-party `@analogjs/vite-plugin-angular` route hit a genuinely
unresolved upstream bug (a duplicate `@angular/core/testing` module
instance between a setup file's own `TestBed.initTestEnvironment()`
call and what spec files actually get — matches
`analogjs/analog#1502`/`angular/angular-cli#31732`). `package.json`'s
own `_comment_scripts` note has the full, current picture.

## Phase 1 — Basic rendering (done)

`GridLayoutComponent` + `GridItemComponent`, position/size only:

- `GridItemComponent` accepts `h`/`w`/`x`/`y`/`i` plus the container
  measurements it needs (`colNum`/`rowHeight`/`margin`/`containerWidth`)
  — initially as direct `@Input()`s for a standalone-testable component,
  before the parent/child DI wiring in Phase 2 supplies them
  automatically.
- Computes pixel position/size via `core`'s own `calcPosition`-shaped
  math (**reuse `core`'s exported `setTransform`/`setTopLeft` helpers
  directly** rather than re-deriving the formula — confirmed these are
  plain functions with zero Vue/React dependency, exported from
  `@keystone-dashboard-layout/core`'s own `index.ts`).
- `GridLayoutComponent` accepts `layout: TLayout` (the required input),
  `colNum`/`rowHeight`/`margin`, measures its own container width via
  `ResizeObserver` (matching Vue's own `erd`/React's own
  `containerRef` + `ResizeObserver` pattern — no Angular-specific
  alternative needed here, `ResizeObserver` is a plain browser API).
  Consumer owns rendering each `GridItemComponent` themselves (see that
  component's own doc comment for why — content projection can't repeat
  distinct content per loop iteration the way a template-owned `@for`
  can), not this component's own internal loop.
- No drag, no resize, no compaction, no eventBus/DI wiring yet — a
  static, correctly-positioned grid is the whole scope.

## Phase 2 — Container-width cascade + `GridEventBusService` (done)

Wires `GridItemComponent` to receive `containerWidth`/`colNum`/
`rowHeight`/`margin`/`useCssTransforms` from its parent
`GridLayoutComponent` via the DI-scoped `GridEventBusService` (see
`PARITY_GAP_ANGULAR.md`'s own architecture-mapping table), rather than
requiring a consumer to pass them down manually. Uses RxJS
`BehaviorSubject`s per value, not a ported `mitt`-style emitter (`core`'s
own `IEventEmitter` is deliberately not part of its public API — see
the parity doc's own note on this).

## Phase 3 — Drag (done)

`native-interaction.ts`'s `createNativeDraggable` wired into
`GridItemComponent` in `ngOnInit`/torn down in `ngOnDestroy`, reporting
each tick to `GridLayoutComponent` via the eventBus's own `itemDrag$`
(a plain RxJS `Subject`, not a `BehaviorSubject` — a genuine one-shot
event stream). `GridLayoutComponent` resolves collisions via `core`'s
own `moveElement` and emits the result via a new `layoutChange`
`@Output()`. Scoped narrower than Vue/React's own full drag handling:
no RTL, no `autoScroll`, no `dragAllowFrom`/`dragIgnoreFrom`/
`dragActivationDistance` — each a real follow-up, not silently dropped.
(`bounded` clamping was originally scoped out here too, then
implemented in Phase 6 instead — see that phase's own note.)

## Phase 4 — Resize (done)

Same shape as Phase 3, for `createNativeResizable`/
`useGridItemResize.ts`'s own responsibilities — 8 resize-hint spans
(`@ViewChild`, wired up in `ngAfterViewInit` since resize needs the view
to already exist, unlike drag), left/top-edge anchor adjustment,
min/max clamping, reported via the eventBus's own new `itemResize$`.
Scoped narrower than Vue/React's own full resize handling: no RTL, no
`preserveAspectRatio`, no `autoScroll`, no `autoHeight`, no
`resizeIgnoreFrom`, no per-item `resizeHandles` restriction (all 8
always render) — each a real follow-up, not silently dropped.

## Phase 5 — preventCollision + compactType (done)

`GridLayoutComponent` gained `preventCollision` (threaded into
`moveElement`'s own 7th parameter — confirmed by reading its compiled
source directly that this reverts the dragged item's own position
entirely on a blocked collision, rather than pushing the colliding item
aside) and `compactType` (now resolved via `core`'s own `getCompactor`,
replacing the hardcoded always-vertical `compactLayout` call both
`handleItemDrag`/`handleItemResize` used through Phase 4).

## Phase 7 — alignment guides/spacing indicators/snapToGrid, multiSelect, enableUndoRedo, responsive breakpoints, transformScale/transition/resize-handle CSS cascade, per-item overrides (done)

`GridLayoutComponent` gained `showAlignmentGuides`/`showSpacingGuides`/
`snapToGrid`/`snapThreshold` (wired directly to `core`'s own
`findAlignmentGuides`/`findSpacingIndicators`/`findSnapAdjustment` —
pure functions, no translation needed), `multiSelect` (selection state
as a `Set`, click-to-select/Ctrl-toggle via a new `itemClicked$`
eventBus channel, group move/resize snapshotting and delta-applying
other selected items), `enableUndoRedo` (a pre-gesture snapshot stack,
capped at `undoHistoryLimit`), `responsive`/`breakpoints`/`cols`
(resolving an effective `colNum` from the measured container width via
`core`'s own `getBreakpointFromWidth`/`getColsFromBreakpoint`), and
`transformScale` (a new `transformScale$` eventBus channel, dividing
drag deltas in `GridItemComponent`)/`transitionDurationMs`/
`transitionTimingFunction`/grid-wide `showResizeHandles`/
`resizeHandleColor` (CSS custom properties, inherited naturally rather
than cascaded via the eventBus).

`GridItemComponent` gained `isMirrored` (RTL — verified directly
against `core`'s own `setTransformRtl`/`setTopRight` source before
trusting the parameter order and output format; the RTL *resize*
edge-swap sign logic is flagged in its own doc comment as
analogous-but-unverified, matching Vue's own identical "best-effort,
not exhaustively verified" caveat for this same corner), `zIndex`,
`autoScroll` (wired to `core`'s own `createNativeAutoScroll`),
`dragAllowFrom`/`dragIgnoreFrom`/`resizeIgnoreFrom`/
`dragActivationDistance` (threaded into the native engine's existing
options), `showResizeHandles`/`resizeHandleColor` (per-item CSS custom
property override), and a per-item `resizeHandles` subset (the
template now conditionally renders each of the 8 handle spans).

**A real, confirmed mistake corrected mid-phase, not a new finding**:
an earlier version of this document (see the old Phase 6 section,
before this rewrite) claimed `isBounded` was a no-op in Vue itself.
That claim was simply wrong — confirmed via a fresh, full re-read of
`useGridItemDrag.ts` (both Vue's and React's own versions), which show
`bounded`/`isBounded` genuinely destructured and used to clamp drag
position. See `docs/PARITY_GAP_ANGULAR.md`'s own corrected note.
`isBounded` itself was already implemented correctly in
`GridItemComponent` before this correction; only the doc's own
characterization of *why* was wrong.

Deliberately not attempted this phase: a real Shift-click
range-selection for `multiSelect` (currently just toggle-adds one item,
matching Ctrl-click — flagged inline in `handleItemClicked`'s own
comment); `preserveAspectRatio`/`autoHeight` on `GridItemComponent`
(both need a dedicated content-measurement pass this phase doesn't
attempt).

## Phase 8 — allowCrossGridDrag + allowOutsideDrop (done)

`allowCrossGridDrag`: registers this grid into `core`'s own shared,
module-level cross-grid registry (`registerCrossGridZone`/
`findCrossGridZoneAt`, reached via the same dedicated subpath export
(`@keystone-dashboard-layout/core/gridlayout/helpers/cross-grid-
registry`) React's own `useCrossGridDrag.ts` already uses — confirmed
by reading that file directly as the reference, since it's already a
clean, framework-agnostic mechanism with nothing React-specific left in
it beyond the hook wrapper). At `dragend`, before committing a normal
in-grid move, checks whether the drop point lands inside another
registered zone; if accepted, the item moves from source to target
layout instead. `layoutId` (auto-generated via a module-level counter
when unset, matching Vue's own `generateLayoutId`) identifies each grid
in the emitted `crossGridItemDropped`/`crossGridDropRejected` payloads.

`allowOutsideDrop`: the four native HTML5 drag-and-drop events
(`dragenter`/`dragover`/`dragleave`/`drop`) wired directly onto the
container element, ported from Vue's own `useOutsideDrop.ts` (React has
no equivalent to port from) — for dragging in an element that isn't a
`GridItemComponent` at all (a palette/sidebar entry). A net-entry-count
guard (Vue's own approach) avoids flickering the placeholder on/off as
`dragenter`/`dragleave` bubble from every descendant.

## Phase 9 — imperative API + useLayoutStorage/useLayoutPresets equivalents (done, this round)

Public `GridLayoutComponent` methods: `compactNow`/`rearrange` (forces
real compaction even when `compactType` is `NONE`, matching Vue's own
behavior — that value only governs *automatic* compaction during
drag/resize), `duplicateItem` (clones an item with a collision-safe
`-copy`-suffixed id, placed below the source, compaction resolves the
overlap), `alignSelected`/`distributeSelected` (`core`'s own
`computeAlignAdjustments`/`computeDistributeAdjustments`, pure
functions wired in directly — no translation needed), `exportLayoutAsSvg`
(same, a thin pass-through to `core`'s own function of the same name,
defaulting to this grid's own live `colNum`/`rowHeight`/`margin`/
`containerWidth`), and `scrollToItem`/`focusItem` (a `data-grid-item-id`
DOM lookup scoped to this grid's own container, not a global
`document.querySelector`).

`GridLayoutStorageService`/`GridLayoutPresetsService`
(`providedIn: 'root'`) wrap `core`'s own `serializeLayout`/
`deserializeLayout` — **deliberately not ref-bound
composables/hooks, unlike Vue's own `useLayoutStorage.ts`/
`useLayoutPresets.ts`**: this port's own `GridLayoutComponent` is a
fully controlled component throughout (the consumer owns `layout`,
this component only ever emits `layoutChange`), so there's no
Angular-idiomatic equivalent of "a ref this service can read and write
on its own" to bind to without reintroducing the kind of implicit,
framework-magic state this whole port's own `@Input()`/`@Output()`
convention was chosen to avoid. Both services' own methods take/return
a plain `TLayout` value directly instead — see
`grid-layout-storage.service.ts`'s own doc comment for the full
rationale. No `autoLoad`/`autoSave` for the same reason.

## Phase 12 — horizontalShift + restoreOnDrag (done, this round)

`horizontalShift` was already a real parameter on `core`'s own
`moveElement` (position 5) — this port's own `handleItemDrag` was
simply hardcoding it to `false` rather than exposing it as an
`@Input()` at all. Fixed by adding the `@Input()` and threading it
through directly; no new logic needed on this component's own side.

`restoreOnDrag` captures every item's own pre-drag x/y at `dragstart`
(`positionsBeforeDrag`), then at `dragend` passes that snapshot as
`context.minPositions` to whichever compactor runs — `core`'s own
built-in compactors (`verticalCompactor`/`noCompactor`/
`horizontalCompactor`) already fully understand and respect this field
(see `ICompactorContext.minPositions`'s own doc comment in
`compactor.ts`), so this was purely a capture-and-thread job, not new
compaction logic. The dragged item itself is temporarily marked static
during this one compaction pass so the compactor doesn't also try to
hold *it* to its own pre-drag position (its new, just-dropped position
is definitionally correct, not something to second-guess). Verified via
the same custom-compactor-spy pattern Vue's own test suite already
establishes for this (checking `context.minPositions` directly) plus a
behavioral test against the real built-in vertical compactor.

Deliberately simplified relative to Vue's own version in one respect
only: captures the `positionsBeforeDrag` snapshot unconditionally on
every `dragstart` when `restoreOnDrag` is on, rather than Vue's own
narrower `compactType !== ECompactType.VERTICAL` gate on the capture
itself — a deliberate simplification given the underlying
`minPositions` mechanism works identically regardless of `compactType`,
and the reason for Vue's own narrower condition couldn't be confirmed
without deeper history this session didn't have time for.

**A real bug found and fixed in this same round, not a design choice**:
an earlier version of this feature applied the `minPositions`-aware
compaction only at `dragend`, treating every other tick as an
intentional simplification ("a user watching the live drag can't tell
the difference anyway"). That reasoning was wrong — confirmed via a
real failing test ("keep every other item at or above its own pre-drag
position"): `dragstart` itself still runs a full, *ungated* compaction
pass regardless of gesture phase, which eagerly closes any pre-existing
layout gap before `dragend`'s own protection ever gets a chance to run,
permanently altering the very reference position `restoreOnDrag` is
supposed to hold items to. Fixed by applying the `minPositions`-aware
compaction on *every* tick once `positionsBeforeDrag` exists — matching
Vue's own `dragEvent`, which runs this identical branch unconditionally
on every call, `dragstart` included.

## Everything in the original prop inventory is now implemented

## Phase 13 — responsiveLayouts + distributeEvenly (done, this round)

A second real gap surfaced while implementing `responsiveLayouts`:
`distributeEvenly` turned out to be a genuine, separate `core` parameter
(`correctBounds`'s own third argument, threaded through
`findOrGenerateResponsiveLayout`) that this port had never surfaced at
all — not previously flagged anywhere in this document's own prop
inventory. Implemented together since `findOrGenerateResponsiveLayout`
requires both.

`responsiveLayouts` seeds a per-breakpoint layout cache (exposed
publicly as `layouts`, matching Vue's own `defineExpose`'d property of
the same name) at `ngOnInit`. `resolveResponsiveColNum` (previously
only resolving `effectiveColNum`) now also actually generates and
commits the layout for the resolved breakpoint via `core`'s own
`findOrGenerateResponsiveLayout` — caching the outgoing breakpoint's
current layout first, then bounds-correcting/compacting for the new
breakpoint's column count, then caching that result too. Matches Vue's
own `responsiveGridLayout` exactly, including running this full
regenerate-and-emit pass on *every* call while `responsive` is on, not
only when the breakpoint itself changes (confirmed by reading
`useResponsiveLayout.ts` directly, not assumed) — a same-breakpoint
resize still re-runs bounds-correction/compaction, normally a no-op
against an already-correct layout but not specially skipped.

`distributeEvenly` changes *how* an overflowing item gets corrected
when entering a narrower breakpoint: the default clamps it left within
the same row (`x = cols - w`); `distributeEvenly` instead resets it to
a new row entirely via `core`'s own `moveToCorrectPlace` and resolves
collisions from there. **Corrected a wrong premise in an early draft of
this feature's own tests**, not caught until actually reading
`correctBounds`'s source directly: both branches are gated on the exact
same overflow condition, so a non-overflowing item is left untouched
either way — `distributeEvenly` does not, as first assumed, redistribute
an item merely because "space is available" for it.

Every item from the original "Phase 7 onward" prop inventory has been
ported, `distributeEvenly` included even though it was never explicitly
listed there (see this phase's own note above on how it surfaced).
Remaining, smaller follow-ups, none of them blocking:

- Closing the remaining coverage gaps in `grid-item.component.ts`
  (~76% branch) and `grid-layout.component.ts` (~70% branch) as of the
  last coverage report — real gaps in the newer group-move/resize and
  responsive/cross-grid paths, not urgent but worth closing eventually

## Testing strategy

Jest + `jest-preset-angular` (see Phase 0 above) for unit/component
tests — mirroring Vue's own `tests/GridItem.spec.ts`/`GridLayout.spec.ts`
coverage, adapted to Angular's `@Input()`-then-`ngOnChanges` model.

**Mutation testing (Stryker), added this round**: `stryker.conf.json`
mirrors `packages/vue/stryker.conf.json`'s own conventions exactly
(reporters, `coverageAnalysis: perTest`, `timeoutMS`, `packageManager`,
the `reports/mutation/index.html` output path already anticipated by
the repo's own root `.gitignore`) — the only real differences are
`testRunner: jest` (via `@stryker-mutator/jest-runner`, pointed at this
package's own `jest.config.ts`) instead of Vue's `vitest`, and `mutate`
globs matching this package's own `src/lib/*.ts` layout instead of
Vue's `src/core`/`composables`/`hooks` split. Run via `pnpm
test:mutation` (`stryker run`) once `@stryker-mutator/core`/
`@stryker-mutator/jest-runner` are installed — added to this package's
own `package.json` `devDependencies` at the same `^9.6.1` version Vue
already uses, for consistency across the monorepo, but not yet
installed or run in this session; a real `pnpm install` followed by a
real `stryker run` is still needed to confirm the config actually works
end-to-end and to see the first real mutation score.

e2e (Karma, or a pivot to Playwright matching the Vue/React packages'
own convention — not yet decided, see `PARITY_GAP_ANGULAR.md`'s own
note that Karma isn't actually well-suited to real browser-navigation
e2e either) once enough interactive features exist to be worth testing
against a real browser — Phases 3/4 (drag/resize) already make this
worth revisiting sooner rather than later. Given this whole session's
own history of coverage-passing-but-real-bugs-present (RTL positioning,
cross-grid z-index, both found in the React port), each phase's own
e2e coverage should specifically include the same class of "does this
actually look right in a real browser" assertions (`elementFromPoint`,
real pixel bounding boxes) that caught those, not just DOM-presence/
class-name checks.
