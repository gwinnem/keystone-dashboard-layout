# Parity Gap — Vue vs. React

A prop-by-prop, verified comparison of `@keystone-dashboard-layout/vue`'s
`IGridLayoutProps`/`IGridItemProps` against the React package's own
`IGridLayoutProps`/`ILayoutItem`/`IGridItemProps` — built by reading both
interface files directly, not from memory of what was ported when. See
`docs/IMPLEMENTATION_PLAN.md` for the phase-by-phase history of what
*has* landed and why; this document is the complementary "here's what's
actually still different, named exactly" reference — the same role
`docs/PARITY_GAP_PLAN.md` plays for the Vue package's own gap against
external libraries, but for these two packages against each other. See
`docs/PARITY_GAP_IMPLEMENTATION_PLAN.md` for the phased "how to close
these" plan built from this document — same Source/Design/Effort/Tests
rigor as the original implementation plan, including one verified
finding (`native-interaction.ts` already supports several of the
GridItem-level gaps below) that changes their effort estimates
materially from what this document's own priority list assumed.

**How to read the tables below:** ✅ = same capability, same or
equivalent name. 🟡 = capability exists on both, but scoped differently
(grid-wide only vs. grid-wide + per-item, or a narrower React
implementation). ❌ = exists in Vue, has no equivalent in React at all.

## GridLayout-level props

| Vue prop | React equivalent | Status | Note |
|---|---|---|---|
| `layout` | `layout` | ✅ | Vue mutates in place (`v-model`); React is fully controlled (`layout`/`onLayoutChange`). Same data shape either way. |
| `colNum` | `colNum` | ✅ | |
| `rowHeight` | `rowHeight` | ✅ | |
| `margin` | `margin` | ✅ | Vue types it as `number[]` (any length); React as the stricter `[number, number]` tuple. No functional difference for normal use. |
| `maxRows` | `maxRows` | ✅ | |
| `isDraggable` | `isDraggable` | ✅ | |
| `isResizable` | `isResizable` | ✅ | |
| `isBounded` | `isBounded` | ✅ | |
| `preventCollision` | `preventCollision` | ✅ | |
| `autoSize` | `autoSize` | ✅ | |
| `heightMode` | `heightMode` | ✅ | |
| `useCssTransforms` | `useCssTransforms` | ✅ | |
| `compactType` | `compactType` | ✅ | Vue's own type also accepts the string-literal union `` `${ECompactType}` `` for template ergonomics; React takes the enum only. No behavioral difference. |
| `compactor` | `compactor` | ✅ | |
| `resizeHandles` | `resizeHandles` | ✅ | Phase 14 — grid-wide default + per-item override on both, including the `[]` → "no handle-driven resize for this item" special case. |
| `showGridLines` | `showGridLines` | ✅ | |
| `showCloseButton` | `showCloseButton` | ✅ | Grid-wide default + per-item override on both sides. |
| `snapToGrid` | `snapToGrid` | ✅ | |
| `snapThreshold` | `snapThreshold` | ✅ | |
| `showAlignmentGuides` | `showAlignmentGuides` | ✅ | |
| `showSpacingGuides` | `showSpacingGuides` | ✅ | |
| `multiSelect` | `multiSelect` | ✅ | Same scope, same deliberate "not collision-aware for passengers" design on both. |
| `enableUndoRedo` | `enableUndoRedo` | ✅ | |
| `undoHistoryLimit` | `undoHistoryLimit` | ✅ | |
| `responsive` | `responsive` | ✅ | |
| `breakpoints` | `breakpoints` | ✅ | |
| `cols` | `cols` | ✅ | |
| `responsiveLayouts` | `responsiveLayouts` | ✅ | Phase 20 — `TResponsiveLayout` now accepts a custom (non-standard) breakpoint-name key too, matching Vue's own `{ [key: string]: TLayout }` typing. Worth knowing: on **both** sides, `getBreakpointFromWidth` (shared with the equally-fixed-7-key `breakpoints`/`cols`) can only ever resolve to one of the 7 standard names — a custom-keyed entry type-checks but is never actually reached at runtime by either package, so this closes a type-level fidelity gap, not a previously-missing runtime feature. |
| — | — | — | (Same restriction applies to `breakpoints`/`cols` themselves — confirmed by reading Vue's own `grid-layout-props.interface.ts` directly: they re-export the *exact same* shared, fixed-7-key `core` interfaces React already uses, not a separately looser Vue-local type — so this was never a `breakpoints`/`cols`-naming gap, only a `responsiveLayouts`-specific one.) |
| `isMirrored` | `isMirrored` | ✅ | Phase 14 — grid-wide + per-item `ILayoutItem.isMirrored` (default `true`, i.e. "participate") on both. |
| `autoScroll` | `autoScroll` | ✅ | Grid-wide default + per-item override on both. |
| `preserveAspectRatio` | `preserveAspectRatio` | ✅ | Grid-wide default + per-item override on both. |
| `ariaLabels` | `ariaLabels` | ✅ | Same 4-field `IGridAriaLabels` shape, same 3-layer merge (defaults ← grid-wide ← per-item) on both. |
| `allowCrossGridDrag` | `allowCrossGridDrag` | ✅ | |
| `disableExternalDrop` | `disableExternalDrop` | ✅ | |
| `layoutId` | `layoutId` | ✅ | Vue auto-generates if unset (mechanism not confirmed by reading its source); React uses `useId()`. |
| `allowOutsideDrop` | `allowOutsideDrop` | ✅ | |
| `outsideDropWidth` | `outsideDropWidth` | ✅ | |
| `outsideDropHeight` | `outsideDropHeight` | ✅ | |
| `outsideDropAccept` | `outsideDropAccept` | ✅ | |
| `enableEditMode` | `enableEditMode` | ✅ | Phase 13 — grid-wide + per-item override on both. |
| `borderRadiusPx` | — | ❌ | Styling for Vue's own internal drag placeholder only (not real items — those use the separate per-item `GridItem.borderRadiusPx`, ported in Phase 17 for the React side). |
| `useBorderRadius` | — | ❌ | Companion to `borderRadiusPx` above — same scope; Vue's own grid-wide version (for its internal drag placeholder) has no React equivalent, but the per-item pair is ported. |
| `transitionDurationMs` | `transitionDurationMs` | ✅ | Phase 17 — applied via a `--kdl-transition-duration` CSS custom property with a `200ms` fallback, so unset behavior is byte-identical to before. |
| `transitionTimingFunction` | `transitionTimingFunction` | ✅ | Phase 17. |
| `distributeEvenly` | `distributeEvenly` | ✅ | Phase 18 — already fully implemented in `core`'s `correctBounds`; only ever has an effect during a responsive breakpoint change, not ordinary drag/resize/compaction. |
| `horizontalShift` | `horizontalShift` | ✅ | Phase 18 — already fully implemented in `core`'s `moveElement`; React's own call site simply hardcoded `false`. A separate, pre-existing bug in the shared `moveElementAwayFromCollision`'s own recursive call (wrong argument order) meant a *cascading* collision didn't see this value correctly — flagged separately in Phase 18, fixed in Phase 21. |
| `restoreOnDrag` | `restoreOnDrag` | ✅ | Phase 12 — applied on both `dragmove` and `dragend` (not only the final commit), so other items visibly stay restrained throughout the drag, not just retroactively once it ends. |
| `showResizeHandles` | `showResizeHandles` | ✅ | Phase 15 — a visible resize-handle affordance (bar/square via a `::after` pseudo-element), layered on top of the existing invisible hit zones without changing them; grid-wide default + per-item override on both. |
| `resizeHandleColor` | `resizeHandleColor` | ✅ | Phase 15 — default color matches Vue's own exactly (`rgb(94 94 94 / 45%)`). |
| `transformScale` | `transformScale` | ✅ | Phase 16 — only the per-tick delta needs dividing by the scale, not the gesture-start absolute position read. |

## GridLayout-level events

Vue's own `EGridLayoutEvent` enum, emitted via `emit()`, compared
against React's own callback props:

| Vue event | React equivalent | Status | Note |
|---|---|---|---|
| `DRAG_START` | `onDragStart` | ✅ | Called with the dragged item's own id at the start of a drag gesture. |
| `DRAG_MOVE` | `onDragMove` | ✅ | Called on every intermediate tick of an in-progress drag. |
| `DRAG_END` | `onDragEnd` | ✅ | Called once a drag gesture ends. |
| `MOVE_BLOCKED_BY_COLLISION` | `onMoveBlockedByCollision` | ✅ | Fires for a drag only when the move was fully blocked; for a resize, whenever the requested size was clamped at all — matches Vue's own asymmetric emission rule, confirmed by reading `dragEvent`/`applyResizeSizeAndCollisionClamp` directly rather than assumed. |
| `SELECTION_CHANGED` | `onSelectionChanged` | ✅ | Fires with the current selection whenever it actually changes; not on initial mount. |
| `LAYOUT_UPDATE`/`LAYOUT_UPDATED` | `onLayoutChange` | 🟡 | Vue fires both (before/after settling) on essentially every change; React's single `onLayoutChange` folds both into one aggregate callback. |
| `BREAKPOINT_CHANGED` | `onBreakpointChange` | ✅ | |
| `CROSS_GRID_ITEM_DROPPED` | `onCrossGridItemDropped` | ✅ | |
| `CROSS_GRID_DROP_REJECTED` | `onCrossGridDropRejected` | ✅ | |
| `ITEM_DROPPED_FROM_OUTSIDE` | `onOutsideDrop` | ✅ | |
| `LAYOUT_READY` | `onLayoutReady` | ✅ | Fires exactly once, keyed off `hasMeasuredWidth` first becoming `true` — React has no direct “before mount”/“mounted” equivalent to Vue's own `onBeforeMount`/`onMounted` hooks, but the “once the first real measurement lands” semantics map cleanly onto a boolean flag that only ever flips once. |
| `COLUMNS_CHANGED` | `onColumnsChanged` | ✅ | Fires on a change to the *raw* `colNum` prop specifically — distinct from `onBreakpointChange`, which only fires for a `responsive`-driven column-count change; confirmed the two don't overlap with a dedicated test. |

## GridItem-level props

Vue's `GridItem` takes ~30 direct component props; React's `GridItem`
takes only `i` (plus the Phase 10 render props `header`/
`renderResizeHandle`) and reads everything else off the matching
`ILayoutItem` entry instead (see that port's own architecture choice,
documented in `grid-item-props.interface.ts`). The table below compares
Vue's own per-item props against React's `ILayoutItem` fields — the
right column names the field or notes there isn't one.

| Vue `GridItem` prop | React `ILayoutItem` field | Status | Note |
|---|---|---|---|
| `h`/`w`/`x`/`y`/`i` | `h`/`w`/`x`/`y`/`i` | ✅ | |
| `isDraggable` | `isDraggable` | ✅ | |
| `isResizable` | `isResizable` | ✅ | |
| `isBounded` | `isBounded` | ✅ | Phase 14 — grid-wide + per-item override on both. |
| `isStatic` | `isStatic` | ✅ | |
| `minW`/`maxW`/`minH`/`maxH` | `minW`/`maxW`/`minH`/`maxH` | ✅ | |
| `showCloseButton` | `showCloseButton` | ✅ | |
| `autoScroll` | `autoScroll` | ✅ | |
| `preserveAspectRatio` | `preserveAspectRatio` | ✅ | |
| `ariaLabels` | `ariaLabels` | ✅ | |
| `zIndex` | `zIndex` | ✅ | |
| `resizeHandles` | `resizeHandles` | ✅ | Phase 14. |
| `isMirrored` | `isMirrored` | ✅ | Phase 14. |
| `enableEditMode` | `enableEditMode` | ✅ | Phase 13. |
| `autoHeight` | `autoHeight` | ✅ | Phase 19 — including the `Math.ceil` (not round-to-nearest) height-specific rounding Vue's own `calcWH`'s `autoSizeFlag` applies, so growing content is never clipped by a downward rounding. |
| `dragAllowFrom` | `dragAllowFrom` | ✅ | Phase 11 (parity-gap plan). |
| `dragIgnoreFrom` | `dragIgnoreFrom` | ✅ | Phase 11 — default `` `a, button` `` now matches Vue's own exactly. |
| `resizeIgnoreFrom` | `resizeIgnoreFrom` | ✅ | Phase 11. |
| `resizeHandleColor` | `resizeHandleColor` | ✅ | Phase 15. |
| `showResizeHandles` | `showResizeHandles` | ✅ | Phase 15. |
| `borderRadiusPx` | `borderRadiusPx` | ✅ | Phase 17. |
| `useBorderRadius` | `useBorderRadius` | ✅ | Phase 17. |
| `dragActivationDistance` | `dragActivationDistance` | ✅ | Phase 11. |

React-only additions with no Vue equivalent at all (not gaps *against*
Vue — these exist because React's own architecture needed them, or
because they were built as React-specific conveniences during the
port):

- **`header`/`renderResizeHandle`** (`GridItem` render props) — the
  React idiom for what Vue expresses as the `#header`/`#resize-handle`
  named slots. Same capability, different mechanism (see
  `docs/IMPLEMENTATION_PLAN.md`'s own architecture-translation note),
  not a gap in either direction.
- **`useLayoutStorage`/`useLayoutPresets`** (standalone hooks) — this
  row previously read "Vue achieves the same outcome by calling core's
  own serializeLayout/deserializeLayout directly wherever needed;
  React additionally wraps that in a small convenience hook. Not a
  capability Vue lacks, just packaged differently" — that description
  was itself wrong, not just imprecise: Vue has its own dedicated
  `useLayoutStorage` *composable* (`storage`/`autoLoad`/`autoSave`/
  `debounceMs` options, plus `hasSaved()`) and a second one,
  `useLayoutPresets` (named, multi-preset save/load/list/delete), that
  React had no equivalent of at all — confirmed by reading both
  composable files directly, not assumed from this document's own
  prior entry. Both are now ported: `useLayoutStorage` gained `storage`/
  `autoSave`/`debounceMs`/`hasSaved()` (adapted to React's own
  dependency-array reactivity rather than Vue's deep-watch), and
  `useLayoutPresets` is a new hook using the same "consumer calls
  explicit functions with their own state" shape `useLayoutStorage`
  already established, rather than Vue's ref-mutating one. Genuinely
  closed now, not just re-described.
- **`IGridLayoutHandle`'s exact method list** (`compactNow`/`rearrange`/
  `duplicateItem`/selection methods/`undo`/`redo`/`alignSelected`/
  `distributeSelected`/`exportLayoutAsSvg`/`scrollToItem`/`focusItem`)
  — built by porting Vue's own `defineExpose`'d methods across Phases
  2–10 and this later verification pass, which read `GridLayout.vue`'s
  own `defineExpose` block directly and found two real, previously-
  missing methods (`scrollToItem`/`focusItem` — confirmed as genuine
  Vue methods, not the earlier hypothetical this document once
  speculated about) now closed. Every other exposed field in Vue's own
  `defineExpose` (`...toRefs(props)`, `erd`, `isDragging`,
  `lastBreakpoint`, `mergeStyle`, `placeholder`, etc.) is Vue's own
  idiom of exposing broad internal reactive state through a template
  ref, not a discrete callable method — not gaps against a more curated
  React handle, which only exposes imperative actions.

## Architecture-level differences (not gaps — different mechanisms, same capability)

These aren't missing capabilities, just different ways of expressing
the same thing — listed here so they're not mistaken for gaps when
comparing the two packages' own docs side by side:

| Concern | Vue | React |
|---|---|---|
| Layout data flow | `v-model:layout` (in-place mutation + reactivity) | Controlled: `layout` prop (never mutated) + `onLayoutChange` callback |
| Lifecycle events (move/resize/drop/etc.) | `EGridLayoutEvent` enum, emitted via `emit()` | Individual callback props (`onLayoutChange`, `onItemClose`, `onCrossGridItemDropped`, etc.) |
| Imperative API | `defineExpose` (template-ref method access) | `forwardRef` + `useImperativeHandle` (`IGridLayoutHandle`) |
| Shared parent→child state | `provide`/`inject` eventBus | `createContext`/`useContext` (`GridContext`) |
| Cross-instance coordination (cross-grid drag) | Module-level `Set` (`cross-grid-registry.ts`), reached via a `@/core/*` source alias | Same underlying `cross-grid-registry.ts`, but reached via two dedicated `@keystone-dashboard-layout/core` subpath exports (`./gridlayout/helpers/cross-grid-registry`, `./gridlayout/interfaces/cross-grid.interfaces`) rather than a raw `@/core/*` alias — the alias broke under Stryker's own sandboxed test runs (a relative path escaping the project root doesn't survive being relocated a directory level deeper), so this package's own copy was moved to a `node_modules`-resolved path instead; see `docs/STRYKER.md`'s own root-cause writeup for the full mechanism |
| CSS scoping | Vue SFC `<style scoped>` blocks | One global stylesheet under a `kdl-` class prefix (`styles/index.css`) |
| Item position/size recompute trigger | Explicit `watch()`s on `containerWidth`/`cols`/`rowHeight`/`renderRtl`/`props.x`/`y`/`w`/`h` (and `setMarginHandler` inline), each directly calling `createStyle()` | `useMemo` dependency array in `GridItem.tsx`, listing `context.containerWidth`/`margin`/`colNum`/`rowHeight` alongside `item.x`/`y`/`w`/`h` and gesture state |

## Suggested priority if closing these further

Roughly ordered by (severity of the gap if a real app hits it) ×
(effort to close), not by any formal scoring — a judgment call, not a
committed roadmap:

1. ~~**`dragIgnoreFrom`'s default exclusion**~~ — **done** (Phase 11,
   `docs/PARITY_GAP_IMPLEMENTATION_PLAN.md`), along with
   `dragAllowFrom`/`resizeIgnoreFrom`/`dragActivationDistance`.
2. ~~**`restoreOnDrag`**~~ — **done** (Phase 12).
3. ~~**`enableEditMode`**~~ — **done** (Phase 13).
4. ~~**Per-item `resizeHandles`/`isMirrored`/`isBounded`**~~ — **done**
   (Phase 14).
5. ~~**`showResizeHandles`/`resizeHandleColor`**~~ — **done** (Phase 15).
6. ~~**`transformScale`**~~ — **done** (Phase 16).
7. ~~**`transitionDurationMs`/`transitionTimingFunction`/`borderRadiusPx`/
   `useBorderRadius`**~~ — **done** (Phase 17).
8. ~~**`distributeEvenly`/`horizontalShift`**~~ — **done** (Phase 18).
9. ~~**`dragAllowFrom`/`resizeIgnoreFrom`/`dragActivationDistance`**~~ —
   **done** (Phase 11). ~~**`autoHeight`** (per-item)~~ — **done**
   (Phase 19).

## Verification notes

Everything in the two tables above was checked against
`packages/vue/src/components/Grid/grid-layout-props.interface.ts` and
`grid-item-props.interface.ts` directly in this pass, not carried over
from memory of earlier phases in this port — where an earlier planning
document's own description turned out incomplete or slightly different
from the real prop shape (e.g. `responsiveLayouts`'s own key
flexibility), this document reflects the real file, not the earlier
description. `GridLayout.vue`'s own full `defineExpose` block was also
read directly in a follow-up pass (not just the props interfaces) —
it surfaced `scrollToItem`/`focusItem` as two real, previously-missing
imperative methods (now ported), confirming that everything else it
exposes (`...toRefs(props)`, `erd`, `isDragging`, `mergeStyle`, etc.)
is Vue's own broader "expose internal reactive state through a
template ref" idiom, not additional discrete methods. `EGridLayoutEvent`'s
full emitted-event list was also read directly and is now closed: every
remaining event has a React equivalent (`LAYOUT_READY`/`COLUMNS_CHANGED`
were the last two ported). `LAYOUT_CREATED`/`LAYOUT_BEFORE_MOUNT`/
`LAYOUT_MOUNTED` — previously the one remaining gap, judged not worth a
React mapping — were subsequently removed from Vue itself (per a direct
request, not a parity-driven change): `LAYOUT_CREATED` fired
synchronously during Vue's own `setup()`, before mount even happened,
with no meaningful consumer use case distinct from `LAYOUT_READY`;
`LAYOUT_BEFORE_MOUNT`/`LAYOUT_MOUNTED` fired before layout
validation/responsive setup had run, meaning a listener saw an
unvalidated, unsettled layout. All three are gone from
`EGridLayoutEvent` (`packages/core`) and `GridLayout.vue`'s own
`defineEmits`/emit call sites entirely — there is nothing left to
compare on either side of this row.

**Stale-position bug, checked cross-port (not just React-side):**
React's `GridItem.tsx` had a real, confirmed bug where an item's
rendered position never updated when `containerWidth` corrected
itself from its own seed value to the real measured width, unless a
drag/resize gesture happened to also change one of the *other*
dependencies in its `style` `useMemo` array — the missing dependency
was `context.containerWidth` itself (now fixed; see that file's own
comment on the `useMemo` in question). Given the two packages share
the same underlying `calcPosition`-style math, this was worth checking
on the Vue side too rather than assuming parity — traced directly by
reading `GridItem.vue`'s own watchers, not inferred from the shared
math alone. Vue is **not** affected: `styleObj` is a plain `ref`, not a
`computed()`, and `createStyle()` (which calls `calcPosition`) is
called explicitly from a dedicated `watch()` on every value it
depends on — `containerWidth`/`cols`/`rowHeight`/`renderRtl`/`props.x`/
`y`/`h`/`w` each has its own watcher, and `margin` only ever changes via
`setMarginHandler`, which calls `createStyle()` inline. There's no
manual dependency list for a value to silently fall out of the way
React's `useMemo` array allows — see the "Item position/size recompute
trigger" row in the architecture-differences table above.
