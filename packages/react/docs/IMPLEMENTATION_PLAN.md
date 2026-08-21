# React Port — Implementation Plan

Tracks how `@keystone-dashboard-layout/react` closes the gap to the Vue
package's own feature set, phase by phase — the same "how to close them,"
not "what's missing" role `docs/PARITY_GAP_PLAN.md` plays for the Vue
package's own parity work against external libraries. See
`packages/react/README.md`'s own "What's not ported yet" list for the
current, at-a-glance gap summary this document expands on.

## Status recap — what's already shipped

A real, tested foundation, not a shallow pass: `GridLayout`/`GridItem`,
controlled `layout`/`onLayoutChange`, `colNum`/`rowHeight`/`margin`/
`maxRows`, `isDraggable`/`isResizable`/`isBounded` (grid-wide defaults;
per-item overrides on each `ILayoutItem`), `preventCollision`,
`autoSize`, `useCssTransforms`, `compactType` (all 5 `ECompactType`
variants), drag (all directions, `isBounded` clamping) and resize (all 8
edges/corners, `minW`/`maxW`/`minH`/`maxH` clamping) via the shared
native pointer-driven engine in `@keystone-dashboard-layout/core`.
99.65%+ line coverage, one documented, deliberate gap (`calcPosition`'s
`Infinity` h/w special case — see `useGridItemResize.ts`'s own comment).

## Architecture translation guide

Every phase below leans on these same five translations of a Vue
concept into its React equivalent — established once, during the
initial port, and reused rather than re-derived each time:

| Vue concept | React equivalent | Where it lives today |
|---|---|---|
| `provide`/`inject` eventBus | `createContext`/`useContext` | `grid-context.ts` |
| Composable (`useXxx` returning Vue `ref`s) | Hook (`useXxx` returning state) — a plain `ref` (not a Vue `ref`) holds the live value during a gesture for synchronous read/write within one native-engine callback, mirrored into `useState` purely so the component re-renders | `hooks/useGridItemDrag.ts`, `hooks/useGridItemResize.ts` |
| `v-model:layout` (in-place mutation + reactivity) | Controlled component: `layout` prop (never mutated) + `onLayoutChange` callback | `GridLayout.tsx` |
| `watch(props.xxx)` cascade to children | Not needed — a Context value change already re-renders every consumer | `grid-context.ts` |
| `defineExpose` (template-ref method access: `compactNow()`, `undo()`, `selectItem()`, etc.) | **Not yet built** — needs `forwardRef` + `useImperativeHandle`. See Phase 2, item 2.1 — this blocks several later phases. | — |

Two additional translations phases below will each need, decided once
here rather than re-litigated per phase:

- **Vue named slots** (`#header`, `#resize-handle`, `#placeholder`) →
  React render props (a function-as-child or an explicit
  `renderHeader`/`renderPlaceholder` prop). No slot mechanism exists in
  React; a render prop is the idiomatic equivalent.
- **Vue eventBus emits for lifecycle events** (`MOVE`/`MOVED`/`RESIZE`/
  `RESIZED`, `itemClicked`) → additional callback props on `GridItem`
  itself (e.g. `onClick`), or additional fields on the shared
  `GridContext` value (for events `GridLayout` itself needs to react
  to, like `itemClicked` feeding `multiSelect`).

## Phase 2 — Small, foundational, low-risk — done

**Shipped in full.** All 8 items landed: the `forwardRef`/
`useImperativeHandle` handle (`IGridLayoutHandle`, exposing
`compactNow`/`rearrange`/`duplicateItem`), `heightMode`, grid-wide
`resizeHandles`, per-item `zIndex`, `showGridLines`, and
`showCloseButton` (grid-wide default + per-item override +
`onItemClose`). `zIndex`/`showCloseButton` needed two small additive
fields on `core`'s own shared `ILayoutItem` (`zIndex?: number | null`,
`showCloseButton?: boolean`) — purely additive, doesn't change Vue's
own behavior at all, since Vue reads these as separate `GridItem` props
rather than layout-item fields.

Ordered so each item either has no dependents below it, or is itself a
dependency several later phases need.

### 2.1 Imperative handle (`forwardRef` + `useImperativeHandle`)

**Why first:** `compactNow`/`rearrange`, `duplicateItem`,
`scrollToItem`/`focusItem`, `undo`/`redo`, `selectItem`/`clearSelection`,
and `alignSelected`/`distributeSelected` are all only reachable in Vue
through `defineExpose`'s template-ref API. Every one of Phases 4, 5, and
8 below needs a way to expose its own new methods the same way — better
to build the mechanism once, now, than retrofit it into three later
phases.

**Design:** `GridLayout` becomes `forwardRef<GridLayoutHandle,
IGridLayoutProps>(...)`. `GridLayoutHandle` starts with just
`compactNow()`/`rearrange()`/`duplicateItem(id)` (the two Phase 2 items
below), then grows a field per later phase (`undo`/`redo`/`canUndo`/
`canRedo` in Phase 4, `selectedItems`/`selectItem`/etc. in Phase 4,
`alignSelected`/`distributeSelected` in Phase 8) — additive each time,
never restructured.

**Effort:** small (the mechanism itself); each later phase's own
addition to the handle is counted in that phase's own effort instead.

**Tests:** a `ref` attached in a test component, confirming each
exposed method is callable and does what it claims — same shape as
Vue's own `wrapper.vm.compactNow()` tests, just via `ref.current.compactNow()`.

### 2.2 `compactNow()`/`rearrange()`

**Source:** Vue's own exposed methods — a manual "Tidy up" trigger,
independent of the automatic per-tick compaction already in place.

**Design:** Exposed via 2.1's handle. Reuses `commitLayout`'s own
compaction call, but — mirroring Vue's own `compactNow()` fix (see
`docs/REFACTORING.md` in the Vue package) — forces real compaction even
when `compactType` is `NONE`, the same "manual tidy-up always tidies
up regardless of the ambient auto-compact setting" behavior.

**Effort:** small.

### 2.3 `duplicateItem(id)`

**Source:** Vue's own exposed method — clone an item with a new,
collision-safe id, placed directly below the source.

**Design:** Same algorithm as Vue's own (try `${id}-copy`, then
`${id}-copy-2`, etc.; copies every field except `i`/`moved`); calls
`commitLayout` afterward the same way `handleItemDrag`/`handleItemResize`
already do. Returns the new id (or `null` if `id` doesn't match).

**Effort:** small.

### 2.4 `heightMode`

**Source:** Vue's own `heightMode` (`'auto' | 'fixed' | 'scroll' |
'fit' | null`), replacing/extending `autoSize`'s boolean toggle — see
`docs/PARITY_GAP_PLAN.md` item 5 in the Vue package for the original
design (directly reusable here, same four modes, same precedence rule).

**Design:** `heightMode?: 'auto' | 'fixed' | 'scroll' | 'fit' | null`
prop, default `null` deferring to `autoSize` exactly like the Vue
version. `containerHeight`'s computed string becomes a small `switch`;
a new `containerOverflow` value feeds an additional `overflowY` field
in the root `<div>`'s inline `style` object (React's own `style` prop
takes a plain object, so this is simpler here than Vue's separate
`mergeStyle` ref merge — no cascade needed).

**Effort:** small.

**Tests:** one per mode, matching Vue's own `heightMode` describe block
almost line for line.

### 2.5 `resizeHandles` (restricted edge set)

**Source:** Vue's own `resizeHandles` prop (`GridLayout`-level default,
`null` per-item override via `ILayoutItem.resizeHandles` — a new
optional field to add to `ILayoutItem` in `@keystone-dashboard-layout/core`,
or a plain `GridLayout`-level-only prop for a smaller first pass, since
per-item override isn't strictly required to close this specific gap).

**Design:** `resizeHandles?: TResizeHandle[]` prop on `GridLayout`
(already-shared `TResizeHandle` type from `core`), default all 8.
`useGridItemResize`'s own attach-effect already only wires up handles
it finds a real `handleRefs[key].current` for — the change is
`GridItem`'s own render, conditionally rendering only the resolved
subset of the 8 `<span>`s instead of always all 8.

**Effort:** small.

### 2.6 `zIndex`

**Source:** Vue's own per-item `zIndex` prop
(`ILayoutItem`-level, already a natural fit given this port's own
"config lives on the layout item" convention).

**Design:** New optional `zIndex?: number | null` field read directly
off the matched `ILayoutItem` in `GridItem`'s own style computation —
applied as an inline `style.zIndex`, always winning over the
`kdl-grid-item--static`/`--dragging`/`--resizing` CSS-class-based
`z-index` defaults when set, exactly like Vue's own version.

**Effort:** small.

### 2.7 `showGridLines`

**Source:** Vue's own `showGridLines` — visible background grid lines
behind the items, sized to the actual `colNum`/`rowHeight` (not a fixed
pattern — see the Vue package's own `docs/REFACTORING.md` #63 for the
bug this design already avoids by construction).

**Design:** Boolean prop; when on, computes `--grid-line-column-size`/
`--grid-line-row-size` CSS custom properties the same way Vue's own
`gridLinesStyle` computed does (`calcColWidth` + margin), applied to
the root `<div>`'s inline style, with a `.kdl-grid-layout--grid-lines`
class adding the actual `background-image` pattern in
`styles/index.css`.

**Effort:** small.

### 2.8 `showCloseButton`

**Source:** Vue's own per-item close button, with a `remove-grid-item`-
equivalent event so a consumer's own handler decides what actually
happens (removing from `layout` is the consumer's job, same as Vue).

**Design:** `showCloseButton?: boolean` grid-wide default (context
value), per-item override via `ILayoutItem.showCloseButton`. A new
`onItemClose?: (id: string | number) => void` prop on `GridLayout`,
called when the button is clicked — deliberately not auto-removing
from `workingLayout` itself, mirroring Vue's own "the library doesn't
decide what removal means" stance.

**Effort:** small.

**Phase 2 total effort:** small × 8 — a few focused sessions, each
independently shippable and testable; no item in this phase blocks on
another item in this phase.

---

## Phase 3 — Drag-time visual feedback — done

**Shipped in full.** `snapToGrid`/`snapThreshold`, `showAlignmentGuides`,
and `showSpacingGuides` all landed, wired into both `handleItemDrag` and
`handleItemResize` (guides/indicators render and clear correctly for
both gesture types, not just drag). No `core` changes needed —
`findAlignmentGuides`/`findSnapAdjustment`/`findSpacingIndicators` were
already framework-agnostic and directly reusable; this phase was purely
the rendering/wiring layer, as planned.

Three closely-related, independently-toggleable features, all reusing
`@keystone-dashboard-layout/core`'s existing pure functions
(`findAlignmentGuides`/`findSnapAdjustment`/`findSpacingIndicators`) —
no new core algorithm work, purely the rendering/wiring layer.

### 3.1 `snapToGrid`/`snapThreshold`

**Source:** Vue's own magnetic snapping during drag.

**Design:** In `handleItemDrag` (`GridLayout.tsx`), before calling
`moveElement`, call `findSnapAdjustment(workingLayoutRef.current, {...},
snapThreshold)` when `snapToGrid` is on, and use its adjusted x/y if
provided — same call site Vue's own `applySnapToGridAdjustment` uses,
just inlined into the existing handler rather than its own extracted
function (React's smaller `handleItemDrag` doesn't yet have Vue's own
"function got too large, extract sub-functions" pressure — revisit
extraction only if that changes).

**Effort:** small — the hard part (`findSnapAdjustment` itself) already
exists in `core`.

### 3.2 `showAlignmentGuides`

**Source:** Vue's own alignment guide lines.

**Design:** New `alignmentGuides` state in `GridLayout`, updated from
`findAlignmentGuides(workingLayoutRef.current, {...})` on every drag/
resize tick (mirroring Vue's `updateAlignmentGuides`/
`clearAlignmentGuides`), converted to pixel `left`/`top` via the same
`calcColWidth`-based formula Vue's own `alignmentGuideStyles` computed
uses. Rendered as sibling `<div className="kdl-grid-alignment-guide">`
elements alongside the `GridContext.Provider`'s children, matching
Vue's own template structure.

**Effort:** moderate — new state, new render output, but the geometry
itself is a direct `core` function call.

### 3.3 `showSpacingGuides`

**Source:** Vue's own labeled distance badges ("2 cols").

**Design:** Same shape as 3.2, using `findSpacingIndicators` instead —
a `spacingIndicators` state, pixel conversion via the same formula
Vue's own `spacingIndicatorStyles` computed uses (including the
singular/plural label ternary), rendered as
`<div className="kdl-grid-spacing-indicator">` elements.

**Effort:** moderate, same shape as 3.2.

**Phase 3 total effort:** small + moderate + moderate. No dependency on
Phase 2's imperative-handle work — purely additive `GridLayout` props/
internal state.

---

## Phase 4 — `multiSelect`, group move/resize, undo/redo — done

**Shipped in full.** All three parts landed on the Phase 2.1 imperative
handle: `selectedItems`/`selectItem`/`deselectItem`/`toggleItemSelection`/
`clearSelection`, and `undo`/`redo`/`canUndo`/`canRedo`. Group move/
resize wired into the existing `handleItemDrag`/`handleItemResize`
handlers directly, reusing the same snapshot-and-apply-delta shape Vue's
own `applyGroupMove`/`applyGroupResize` established. One React-specific
wrinkle worth flagging: `canUndo`/`canRedo` are computed from plain refs
(`historyRef`/`futureRef`, not React state, since the arrays themselves
don't need their own re-render) — a small `undoRedoVersion` state
counter, bumped alongside every history-affecting action, is what
actually forces `useImperativeHandle`'s factory to recompute them;
without it, `ref.current.canUndo` could go stale after an action that
didn't also happen to change `workingLayout` in the same tick.

The most involved phase in this plan — both features are substantial
in Vue, and React's version needs the Phase 2.1 imperative handle
already in place first (`selectItem`/`clearSelection`/`undo`/`redo` all
need to be externally callable, not just internal state).

### 4.1 `multiSelect` + selection state

**Source:** Vue's own `multiSelect` prop and click/Shift-click/Ctrl-click
selection model.

**Design:** New `selectedItemIds` state in `GridLayout` (a `Set`, same
O(1)-lookup rationale as Vue's own), exposed via the Phase 2.1 handle as
`selectedItems`/`selectItem`/`deselectItem`/`toggleItemSelection`/
`clearSelection`. `GridItem` needs an `onClick` handler reading
`event.shiftKey`/`ctrlKey`/`metaKey` (React's `onClick` prop already
receives a real `MouseEvent`, simpler than Vue's own eventBus
`itemClicked` round-trip — no cascade needed, `GridItem` can call a new
`context.onItemClick` directly). A `kdl-grid-item--selected` class
applied when `context.selectedItemIds.has(item.i)`.

**Effort:** moderate.

### 4.2 Group move/resize

**Source:** Vue's own scoped-down group transform (deliberately not
collision-aware for passengers — see the Vue package's own
`docs/REFACTORING.md` for the exact scope this ports directly).

**Design:** `handleItemDrag`/`handleItemResize` in `GridLayout.tsx` gain
the same "if the dragged/resized item is part of a >1-sized selection,
apply the same delta to every other selected item, skipping static/
non-draggable/non-resizable passengers" logic as Vue's own
`applyGroupMove`/`applyGroupResize`. A `groupMoveStartPositions`/
`groupResizeStartSizes` ref (not state — this is gesture-scoped
bookkeeping, never rendered) snapshotted on `dragstart`/`resizestart`.

**Effort:** moderate — direct port of already-designed, already-tested
logic; the main work is re-deriving it against React's own
`handleItemDrag`/`handleItemResize` shape rather than Vue's.

### 4.3 Undo/redo

**Source:** Vue's own `enableUndoRedo`/`undoHistoryLimit` props,
`undo()`/`redo()`/`canUndo`/`canRedo`.

**Design:** A `history`/`future` ref pair (arrays of cloned layouts, not
state — undo/redo stacks don't need to trigger their own re-render
independent of `canUndo`/`canRedo`, which *can* be small pieces of
state) in `GridLayout`. `commitUndoPoint(before)` called at the same
granularity Vue's own is: drag start, resize start, item add/remove
(`duplicateItem`, and any length change to the `layout` prop itself),
`compactNow()`. Exposed via the Phase 2.1 handle. Same `undoHistoryLimit`
cap, same "clear the redo stack on a fresh commit after an undo"
semantics.

**Effort:** moderate — same "well-designed already, needs re-deriving
against this package's own handler shapes" character as 4.2.

**Phase 4 total effort:** moderate × 3, but with real inter-dependency
(4.2 reads 4.1's own selection state) — do 4.1 before 4.2; 4.3 is
independent of both and could be reordered earlier if undo/redo alone
is wanted sooner.

---

## Phase 5 — Responsive breakpoints — done

**Shipped.** `responsive`/`breakpoints`/`cols`/`responsiveLayouts`/
`onBreakpointChange` all landed; `colNum` inside `GridLayout` is now a
derived local value shadowing the renamed `colNumProp` parameter,
resolved from the active breakpoint whenever `responsive` is on.

**One real design gap found and fixed while implementing, not assumed
from the plan above:** `findOrGenerateResponsiveLayout` itself never
consults the `layouts` cache parameter it takes — confirmed by reading
its actual source, not by assuming the plan's own description above was
complete. Tracing Vue's own `useResponsiveLayout.ts` composable
confirmed the caller is responsible for that lookup. The effect here
explicitly checks `layoutsCacheRef.current[newBreakpoint]` first (a
pre-defined `responsiveLayouts` entry, or a previously-cached "was there
before" state from an earlier visit to that breakpoint) before falling
back to `findOrGenerateResponsiveLayout` — without this, a
`responsiveLayouts` preset would have been silently ignored.

**Source:** Vue's own `responsive`/`breakpoints`/`cols`/
`responsiveLayouts`, backed by `findOrGenerateResponsiveLayout` (already
in `@keystone-dashboard-layout/core`, framework-agnostic).

**Design:** A `useResponsiveLayout`-equivalent hook, mirroring Vue's own
composable: tracks `lastBreakpoint`/a `layouts` cache keyed by
breakpoint name (state, since a breakpoint change needs to re-render
with a different layout), recomputing on `containerWidth` changes
(already tracked in `GridLayout`) via `getBreakpointFromWidth`/
`getColsFromBreakpoint` (also already in `core`). `colNum` inside
`GridLayout` becomes a derived value (`responsive ? colsFromBreakpoint :
props.colNum`) rather than the raw prop, feeding through to
`GridContext` the same way it already does.

**Effort:** moderate — the algorithm is already fully built and tested
in `core`; the work is the hook wiring and the `colNum`-becomes-derived
restructuring in `GridLayout.tsx`.

**Tests:** direct ports of Vue's own responsive-breakpoint test
scenarios (breakpoint transitions, per-breakpoint layout caching,
`colNum` as the more restrictive cap).

---

## Phase 6 — Cross-grid drag/drop, drag-from-outside — done

**Shipped in full.** Both parts landed. Reaching `cross-grid-registry.ts`
from React needed a `@/core/*` source-level alias in `vite.config.ts`/
`vitest.config.ts` (matching Vue's own identical alias exactly) plus a
corresponding `rootDir` widening in `tsconfig.json` (the same
cross-package-boundary situation, and the same fix, as Vue's own
tsconfig — confirmed by reading that file's own comment rather than
assuming). `allowOutsideDrop` turned out simpler in React than in Vue:
React exposes `onDragEnter`/`onDragOver`/`onDragLeave`/`onDrop` as
ordinary JSX synthetic-event props, so no manual
`addEventListener`/`removeEventListener` lifecycle management was needed
at all, unlike Vue's own version. `allowCrossGridDrag` needed one real
API extension: `onItemDrag`'s own callback signature grew two optional
trailing params (`clientX`/`clientY`, the native pointer event's
viewport coordinates) specifically for the cross-grid-zone lookup,
which operates in viewport space via `getBoundingClientRect()` — every
other caller of that callback simply ignores the two new params.

The largest remaining architectural piece — both features need
coordination *between* separate `GridLayout` instances (or with
arbitrary non-grid DOM), which is what makes them harder than anything
in Phases 2-5.

### 6.1 `allowCrossGridDrag`/`disableExternalDrop` — done

**Source:** Vue's own cross-grid drag/drop, backed by a
`cross-grid-registry.ts` singleton (already in `core`, but — per
`core/index.ts`'s own header comment — explicitly *not* part of the
framework-agnostic public surface, since it's a runtime coordination
singleton tied to component lifecycle, not a pure calculation. Reachable
the same way Vue reaches it: importing the file directly from within
this package, the same "physically in `core`'s source tree, not in its
public barrel" pattern `native-interaction.ts` used before Phase 1 of
the initial port promoted it to public).

**Design:** A `useCrossGridDrag`-equivalent hook mirroring Vue's own
composable: registers/deregisters this `GridLayout` instance with the
shared registry on mount/unmount (keyed by `layoutId`, auto-generated
like Vue's own if not provided), and on `dragend`, checks whether the
pointer's final position falls within another registered grid's own
bounds — if so, that other grid's own registered "accept" callback runs
instead of this grid's normal `moveElement`/compaction path.

**Effort:** significant — genuinely new coordination logic for this
package, even though the underlying registry already exists. (Turned
out accurate — the alias/rootDir setup plus the `onItemDrag` signature
extension were the two genuinely new pieces of plumbing needed beyond
the hook itself.)

### 6.2 `allowOutsideDrop` — done

**Source:** Vue's own native HTML5 drag-and-drop acceptance from
non-grid elements.

**Design:** `dragenter`/`dragover`/`dragleave`/`drop` listeners on the
root `<div>` (native DOM events, not the pointer-driven engine at all —
same as Vue's own version, which is a genuinely separate code path from
`createNativeDraggable`). An enter-count ref (not state) for the
"dragenter fires on every child element a drag passes over" workaround
Vue's own version already solved. `onOutsideDrop` prop, called with the
resolved grid position/size and the native `DataTransfer` — same
"library doesn't decide what to add to `layout`" stance as Vue's own.

**Effort:** moderate — self-contained, no dependency on 6.1. (Turned out
smaller than expected — React's own native `onDragEnter`/etc. JSX props
replace Vue's entire manual listener-lifecycle layer.)

**Phase 6 total effort:** significant + moderate, shipped together
rather than sequenced — both landed in the same pass once the shared
alias/rootDir plumbing was in place.

---

## Phase 7 — Drag/resize hook extensions — done

**Shipped in full.** All three landed: `isMirrored` (RTL), `autoScroll`,
and `preserveAspectRatio`. `autoScroll`/`preserveAspectRatio` are
grid-wide defaults with per-item `ILayoutItem` overrides (two more small
additive core fields, same non-breaking pattern as `zIndex`/
`showCloseButton`); `isMirrored` is grid-wide only (RTL direction isn't a
per-item concept). One real design subtlety worth flagging, confirmed by
reading Vue's own `createStyle()` rather than assumed: during a **drag**,
`dragging.left` always holds the value (RTL-negated or not) under that
same field name regardless of direction — it's `GridItem.tsx`'s own style
computation, not the hook, that decides whether it becomes CSS `left` or
`right`. During a **resize**, `calcPosition`/`resizing` genuinely use
different fields (`left` vs `right`) depending on RTL, matching
`calcPosition`'s own branch. Testing `autoScroll` needed mocking
`createNativeAutoScroll` itself (a real `requestAnimationFrame`-driven
engine, same as the Vue package's own test suite avoids exercising
directly) to assert on `start`/`update`/`stop` call timing instead.

Three independent extensions to the existing `useGridItemDrag`/
`useGridItemResize` hooks — grouped together because each is a
relatively small, targeted addition to code that already exists, not
because they depend on each other.

### 7.1 RTL (`isMirrored`)

**Source:** Vue's own RTL layout mirroring.

**Design:** `calcPosition`/`calcXY`/`handleResize`'s own edge-anchor
logic need the same `renderRtl`-aware branching Vue's own composables
already have fully designed (see the Vue package's own
`docs/REFACTORING.md` #53 for the exact left/right anchor-swap logic
this ports directly) — `left`/`right` style output swapped via
`setTransformRtl`/`setTopRight` (already exported from `core`) instead
of `setTransform`/`setTopLeft`.

**Effort:** moderate — direct port of already-solved logic, not new
design.

### 7.2 `autoScroll`

**Source:** Vue's own `requestAnimationFrame`-driven auto-scroll during
drag/resize near a container's edge.

**Design:** `createNativeAutoScroll()` (already exported from `core`,
framework-agnostic) — `useGridItemDrag`/`useGridItemResize` each start/
stop it at the same points Vue's own `handleDrag`/`handleResize` do
(`dragstart`/`resizestart` start, `dragend`/`resizeend`/`dragmove`'s own
`update()` call).

**Effort:** small — the engine itself already exists; this is wiring.

### 7.3 `preserveAspectRatio`

**Source:** Vue's own aspect-ratio-preserving resize.

**Design:** An `aspectRatio` ref (gesture-scoped, not state) captured at
`resizestart`, then `resizemove`'s own edge-handling block gains the
same "derive the undriven dimension from the driven one, adjusting
`top` for a corner+top-edge gesture" logic Vue's own `handleResize`
already has fully worked out.

**Effort:** small — direct port of already-solved logic.

**Phase 7 total effort:** moderate + small + small. All three are
independent of every other phase in this plan; could be done in any
order, including interleaved with other phases.

---

## Phase 8 — Align/distribute commands — done

**Shipped.** `alignSelected(edge)`/`distributeSelected(axis)` landed on
the Phase 2.1 handle, exactly as designed below — no surprises this
time, since both the geometry (`computeAlignAdjustments`/
`computeDistributeAdjustments`) and the apply/commit pattern
(`commitLayout`, `commitUndoPoint`) already existed and needed no
rework.

**Source:** Vue's own `alignSelected(edge)`/`distributeSelected(axis)`,
backed by `computeAlignAdjustments`/`computeDistributeAdjustments`
(already in `@keystone-dashboard-layout/core`, framework-agnostic, no
port work needed for the algorithm itself).

**Depends on:** Phase 4.1 (`multiSelect`'s own `selectedItemIds`) and
Phase 2.1 (the imperative handle these get exposed through).

**Design:** Two new handle methods, each computing an adjustment map
via the existing `core` functions against `workingLayoutRef.current`
and `Array.from(selectedItemIds)`, then applying it the same way Vue's
own `applyAlignDistributeAdjustments` does — including the
`preventCollision` guard (skip an adjustment landing on a non-selected
item) and running through `commitLayout` for the undo-snapshot +
compaction + `onLayoutChange` side effects for free.

**Effort:** small — both the hard geometry (in `core`) and the apply/
commit pattern (`commitLayout`) already exist; this is composition, not
new logic.

---

## Phase 9 — Keyboard accessibility — done

**Shipped.** Arrow-key move/Shift+arrow-key resize landed on `GridItem`'s
own root, including RTL-aware key-direction flipping and `multiSelect`
group-move/resize engagement (each keypress calls `context.onItemDrag`/
`onItemResize` with a synthetic `dragstart` immediately followed by
`dragend` — matching Vue's own "treat each keypress as a complete,
already-ended gesture" approach exactly, which is what lets it reuse
`GridLayout`'s existing compaction/collision/group-move handling
unchanged). A minimal `ariaLabels` prop landed alongside it as planned
(move/resize instruction strings, grid-wide only — per-item override
stays in Phase 10 along with the rest of Vue's own fuller `ariaLabels`
set).

**Source:** Vue's own single-unit-step arrow-key move/resize (see the
Vue package's own `docs/ACCESSIBILITY.md` for the deliberately-scoped
target this matches — not a full WAI-ARIA grid widget pattern).

**Depends on:** Phase 4.2 (group move/resize) for the "arrow key on a
selected item moves every other selected item too" behavior specifically
— the single-item case has no dependency.

**Design:** `GridItem`'s own root `<div>` gains `tabIndex={0}` (when
draggable/resizable/non-static, matching Vue's own condition) and an
`onKeyDown` handler translating arrow keys (± Shift for resize) into
the same `onItemDrag`/`onItemResize` calls a real gesture would make,
at `x±1`/`y±1` or `w±1`/`h±1`. `ariaLabels`-equivalent strings (English
defaults, overridable) for the announced move/resize instructions.

**Effort:** moderate.

---

## Phase 10 — Peripheral parity — done

**Shipped in full.** All 5 items landed. `ariaLabels` now covers Vue's
own fuller 4-field set (close-button label, item role description,
move/resize instructions) via `core`'s own `IGridAriaLabels`/
`resolveAriaLabels`/`DEFAULT_ARIA_LABELS` — newly exported from `core`'s
public barrel specifically for this, rather than re-deriving the same
merge logic a second time. A per-item `ariaLabels?: IGridAriaLabels`
field landed on `ILayoutItem`/`TLayoutItem` (same additive,
doesn't-change-Vue's-behavior pattern as `zIndex`/`showCloseButton`),
and `GridItem.tsx` does its own final merge layer via
`resolveAriaLabels(context.ariaLabels, item.ariaLabels)` — correct
since `context.ariaLabels` already holds the grid-wide-merged value,
so re-spreading `DEFAULT_ARIA_LABELS` a second time is a harmless no-op.
`header`/`renderResizeHandle` render props landed on `GridItem` (the
same two-region flex layout and per-edge customization Vue's own
`#header`/`#resize-handle` slots provide). `compactor` landed as a
straightforward override at both `commitLayout`/`commitForcedCompaction`'s
own single call sites. `useLayoutStorage` landed as a new hook (`src/
hooks/useLayoutStorage.ts`, exported from the package's main barrel,
alongside the other Grid-specific exports despite not needing
`GridContext` itself). `exportLayoutAsSvg()` landed on the imperative
handle, pre-filled with the grid's own actual dimensions.

Smaller items, each independent, gathered here rather than given their
own phase number since none are prerequisites for anything else in this
plan and none depend on each other.

- **`ariaLabels` per-item override** — Phase 9 already landed the
  grid-wide version (move/resize instructions); this is just the
  remaining per-item override layer, plus the rest of Vue's own fuller
  `ariaLabels` set (close-button label, item-role-description text,
  etc.) not yet ported.
- **Custom render for header/resize-handle** (Vue's `#header`/
  `#resize-handle` slots) — render props (`renderHeader`/
  `renderResizeHandle` functions) per the architecture translation
  guide above.
- **`useLayoutStorage`-equivalent hook** — thin wrapper over
  `serializeLayout`/`deserializeLayout` (already in `core`); genuinely
  small, since the hard part already exists.
- **`exportLayoutAsSvg` wiring** — already directly usable from `core`
  without any React-specific code at all (call it with
  `workingLayoutRef.current`, or expose a handle method that does);
  effort is close to zero, just needs someone to actually add the
  handle method.
- **`compactor` (pluggable compaction)** — `GridLayout` already calls
  `getCompactor(compactType).compact(...)` in one place
  (`commitLayout`); a `compactor?: ICompactor | null` prop overriding
  that single call site is a very small addition.

**Effort:** small × 5, no ordering constraints among them.

---

## Summary table

| Phase | Item | Depends on | Effort |
|---|---|---|---|
| 2.1 | Imperative handle (`forwardRef`/`useImperativeHandle`) | — | Small — **done** |
| 2.2 | `compactNow`/`rearrange` | 2.1 | Small — **done** |
| 2.3 | `duplicateItem` | 2.1 | Small — **done** |
| 2.4 | `heightMode` | — | Small — **done** |
| 2.5 | `resizeHandles` | — | Small — **done** |
| 2.6 | `zIndex` | — | Small — **done** |
| 2.7 | `showGridLines` | — | Small — **done** |
| 2.8 | `showCloseButton` | — | Small — **done** |
| 3.1 | `snapToGrid` | — | Small — **done** |
| 3.2 | `showAlignmentGuides` | — | Moderate — **done** |
| 3.3 | `showSpacingGuides` | — | Moderate — **done** |
| 4.1 | `multiSelect` + selection | 2.1 | Moderate — **done** |
| 4.2 | Group move/resize | 4.1 | Moderate — **done** |
| 4.3 | Undo/redo | 2.1 | Moderate — **done** |
| 5 | Responsive breakpoints | — | Moderate — **done** |
| 6.1 | Cross-grid drag/drop | — | Significant — **done** |
| 6.2 | Drag-from-outside | — | Moderate — **done** |
| 7.1 | RTL | — | Moderate — **done** |
| 7.2 | `autoScroll` | — | Small — **done** |
| 7.3 | `preserveAspectRatio` | — | Small — **done** |
| 8 | Align/distribute | 2.1, 4.1 | Small — **done** |
| 9 | Keyboard accessibility | 4.2 (for group case) | Moderate — **done** |
| 10 | Peripheral parity (5 items) | — | Small × 5 — **done** |

## Recommended sequencing

1. **Phase 2 in full** — every item is small, independently shippable,
   and 2.1 unblocks Phases 4 and 8 later. Good first milestone.
2. **Phase 3** — pure visual/geometry features, zero risk to the
   existing drag/resize behavior, `core` does the hard work already.
3. **Phase 4** — the largest single phase; 4.1 before 4.2, 4.3 can be
   done in parallel with either.
4. **Phase 7** — independent of everything, can interleave anywhere;
   doing it before Phase 6 means cross-grid drag (6.1) inherits RTL/
   autoScroll-aware drag math for free instead of needing a second pass.
5. **Phase 5** — independent, but benefits from Phase 3's
   `containerWidth`-reactive patterns already being established.
6. **Phase 8** — small, once 4.1 lands.
7. **Phase 9** — once 4.2 lands (for the group-keyboard-move case).
8. **Phase 6** — deliberately last: the largest, most architecturally
   distinct piece, least reused by anything else in this plan.
9. **Phase 10** — opportunistic filler between other phases; none of
   it blocks or is blocked by anything else here.

## Testing conventions to carry forward

Established during the initial port — keep using these rather than
re-deriving per feature:

- **`act()` wrapping** for any test invoking `__nativeDragHandler`/
  `__nativeResizeHandler` directly (a raw synchronous call outside
  React's own event system — the resulting `setState` calls need
  `act()` to flush before the next assertion; see `test-helpers.ts`'s
  own doc comment).
- **`stubOffsetWidth()`** before any test asserting an *exact* resulting
  grid position (not just a clamped bound) — jsdom's own default
  `offsetWidth` (0, falling back to `GridLayout`'s internal 100px safe
  default) produces degenerate `colWidth` math for anything beyond a
  couple of columns.
- **Compute expected pixel-to-grid-unit math from `calcColWidth`'s own
  formula** (`(containerWidth - margin×(cols+1)) / cols`) rather than
  guessing a `clientX`/`clientY` value — confirmed necessary the hard
  way once already in this package's own test history.
- **Real `PointerEvent` dispatch** (not the backdoor) for the one test
  per gesture type that specifically needs to exercise the native
  engine's own `getOptions()` callback or its real `enabled` gating —
  the backdoor bypasses the real `pointerdown` listener entirely, so it
  can never exercise that path.
- **`cloneLayout`'s `Infinity` → `null` JSON round-trip limitation** —
  don't write a test assuming an `Infinity` h/w value survives a
  `GridLayout` render; it doesn't, and won't until `cloneLayout` itself
  is fixed (a separate, shared-with-Vue `core` issue, out of scope for
  this package alone).
- **Coverage config exclusions** (pure type-interface files, the public
  barrel, the test-helpers file itself) — extend the existing
  `vitest.config.ts` list rather than fighting the coverage gate for
  files with nothing meaningful to execute.
