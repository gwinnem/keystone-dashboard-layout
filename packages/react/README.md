# @keystone-dashboard-layout/react

React port of the responsive & dynamic grid / dashboard layout component.
**Initial implementation landed** — a real, tested `GridLayout`/`GridItem`
pair, built on the exact same shared `@keystone-dashboard-layout/core`
algorithms and native pointer-driven drag/resize engine the Vue package
uses (see `packages/core`), so both frameworks share one implementation
of the hard, easy-to-get-subtly-wrong parts rather than each maintaining
their own copy.

## Usage

```tsx
import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';

function Dashboard() {
  const [layout, setLayout] = useState<TLayout>([
    { i: 'a', x: 0, y: 0, w: 2, h: 2 },
    { i: 'b', x: 2, y: 0, w: 2, h: 2 },
  ]);

  return (
    <GridLayout layout={layout} onLayoutChange={setLayout}>
      <GridItem i="a">A</GridItem>
      <GridItem i="b">B</GridItem>
    </GridLayout>
  );
}
```

`GridLayout` is a **fully controlled** component — it never mutates the
`layout` array (or any item in it) you pass in; every drag/resize tick
(and the compaction that follows it) is reported via `onLayoutChange`
with a brand-new array. This is the same `layout`/`onLayoutChange`
contract `react-grid-layout` itself uses, since it's the idiomatic React
pattern here, rather than Vue's own `v-model:layout` two-way binding.

`GridItem` only needs an `i` matching one of `layout`'s own entries —
position, size, and `isDraggable`/`isResizable`/`isStatic`/`minW`/`maxW`/
`minH`/`maxH` all live directly on that `ILayoutItem` entry (see its own
doc comment in `@keystone-dashboard-layout/core`), not as separate props
on this component. Set those fields on your layout data instead.

## What's implemented

- `layout`/`onLayoutChange` (controlled), `colNum`, `rowHeight`, `margin`,
  `maxRows`
- `isDraggable`/`isResizable`/`isBounded` (grid-wide defaults; per-item
  overrides live on each `ILayoutItem`), `enableEditMode` (grid-wide
  master interactivity switch + per-item override)
- `preventCollision`, `autoSize`/`heightMode`, `useCssTransforms`,
  `compactType` (all 5 `ECompactType` variants, via the same
  `getCompactor()` the Vue package uses), `restoreOnDrag` (other items
  don't compact past their own pre-drag position while a drag is still
  in progress), `transformScale` (compensates drag/resize pixel math
  for a scaled ancestor, e.g. a zoomed-out canvas view)
- Drag (all directions, `isBounded` clamping) and resize (all 8
  edges/corners, including left/top-edge repositioning, `minW`/`maxW`/
  `minH`/`maxH` clamping) via the shared native pointer-driven engine
- `resizeHandles` (grid-wide restricted edge set + per-item override,
  including `[]` as a deliberate "no handle-driven resize for this
  item" value), `showResizeHandles`/`resizeHandleColor` (an actually-
  visible resize-handle affordance layered on top of the existing
  invisible hit zones, grid-wide default + per-item override),
  `zIndex` (per-item),
  `showGridLines`, `showCloseButton` (grid-wide default + per-item
  override, `onItemClose` callback)
- `snapToGrid`/`snapThreshold` (magnetic snapping during drag),
  `showAlignmentGuides` (edge-alignment guide lines), `showSpacingGuides`
  (labeled distance badges) — all during both drag and resize
- `multiSelect` (click/Shift-click/Ctrl-click selection) and group
  move/resize (dragging/resizing one selected item applies the same
  delta to every other selected item, skipping static/non-draggable/
  non-resizable passengers)
- Undo/redo (`enableUndoRedo`/`undoHistoryLimit`) — snapshots at drag
  start, resize start, `duplicateItem`, `compactNow`, and any
  externally-driven `layout` length change
- Responsive breakpoints (`responsive`/`breakpoints`/`cols`/
  `responsiveLayouts`/`onBreakpointChange`) — `colNum` becomes derived
  from the measured container width once enabled, backed by the same
  `findOrGenerateResponsiveLayout` the Vue package uses
- RTL mirroring (`isMirrored`, grid-wide + per-item opt-out via
  `ILayoutItem.isMirrored`), `autoScroll` and
  `preserveAspectRatio` (grid-wide defaults + per-item `ILayoutItem`
  overrides) — all during both drag and resize
- Keyboard accessibility: focus a draggable/resizable, non-static item
  and arrow keys move it by one grid unit, Shift+arrow keys resize it
  — including RTL-aware key direction and `multiSelect` group-move/
  resize engagement. `ariaLabels` (close button label, item role
  description, move/resize instructions — grid-wide default + per-item
  `ILayoutItem.ariaLabels` override, merged via `core`'s own
  `resolveAriaLabels`)
- `header` (a two-region flex layout — fixed-size header, scrollable
  body) and `renderResizeHandle` (customize a resize-hint span's own
  content) render props on `GridItem` — the React equivalent of Vue's
  own `#header`/`#resize-handle` named slots
- `compactor` (pluggable compaction — override `GridLayout`'s own
  algorithm entirely via the `ICompactor` interface) and
  `useLayoutStorage` (a `localStorage`-backed convenience hook wrapping
  `core`'s own `serializeLayout`/`deserializeLayout`), plus
  `exportLayoutAsSvg()` on the imperative handle (pre-filled with this
  grid's own dimensions)
- An imperative handle via `ref`: `compactNow()`/`rearrange()`/
  `duplicateItem(id)`/`selectedItems`/`selectItem()`/`deselectItem()`/
  `toggleItemSelection()`/`clearSelection()`/`undo()`/`redo()`/
  `canUndo`/`canRedo`/`alignSelected(edge)`/`distributeSelected(axis)`/
  `exportLayoutAsSvg(options?)`/`scrollToItem(id)`/`focusItem(id)` —
  see `IGridLayoutHandle`
- Cross-grid drag/drop (`allowCrossGridDrag`/`disableExternalDrop`/
  `layoutId`) — dragging an item from one `GridLayout` instance onto
  another with this also enabled removes it from the source and inserts
  it into the target via a real first-fit bin-pack (`core`'s own
  `findFirstFitSlot`), not a naive placement compaction then has to
  sort out. `onCrossGridItemDropped`/`onCrossGridDropRejected`
  callbacks on the target grid.
- Drag-from-outside (`allowOutsideDrop`) — accepts a native HTML5
  drag-and-drop from outside the grid system entirely (e.g. a plain
  `draggable="true"` element elsewhere on the page), with a live
  drop-position placeholder while dragging over the grid.
  `outsideDropWidth`/`outsideDropHeight`/`outsideDropAccept`/
  `onOutsideDrop`
- Per-item `dragAllowFrom`/`dragIgnoreFrom` (drag-start region
  restriction — defaulting to `` `a, button` `` for `dragIgnoreFrom`,
  matching Vue's own default exactly, so an interactive control inside
  a `GridItem` doesn't accidentally start a drag), `resizeIgnoreFrom`,
  and `dragActivationDistance` (per-pointer-type drag-start threshold)
  — all forwarded to `core`'s own already-built
  `passesDragFilters`/`resolveActivationDistance` inside
  `native-interaction.ts`
- `transitionDurationMs`/`transitionTimingFunction` (grid-wide, applied
  via CSS custom properties with a fallback so unset behavior is
  byte-identical to before), `borderRadiusPx`/`useBorderRadius`
  (grid-wide default + per-item `ILayoutItem` override)
- Per-item `autoHeight` — a `ResizeObserver` on a dedicated wrapper
  (`height: auto`) around the item's own content, automatically
  re-measuring and committing a new `h`/`w` whenever that content's own
  size changes (independent of the whole grid being `autoSize`d/
  `heightMode`'d); height rounds up rather than to the nearest unit, so
  growing content is never clipped by a downward rounding
- `distributeEvenly` (spreads an out-of-bounds item to the next
  available slot on a responsive breakpoint change, instead of
  clamping it to the right edge) and `horizontalShift` (pushes a
  collided-with item left/right during a drag, instead of always
  straight down)
- Granular gesture/selection events: `onDragStart(id)`/`onDragMove(id)`/
  `onDragEnd(id)` (per-phase drag callbacks, distinct from the
  aggregate `onLayoutChange`), `onMoveBlockedByCollision(id)`
  (`preventCollision` actually constraining a drag or resize),
  `onSelectionChanged(selectedItems)` (`multiSelect`'s own selection
  changing, not just readable via the imperative handle),
  `onLayoutReady(layout)` (fires once, right after the first
  successful container-width measurement), `onColumnsChanged(colNum)`
  (fires on a change to the raw `colNum` prop itself, distinct from a
  `responsive`-driven breakpoint change)

## Full parity with Vue reached (Phases 11–19), plus a follow-up events pass

Every gap `docs/PARITY_GAP_VUE.md`'s own verified, prop-by-prop
comparison found against Vue's `grid-layout-props.interface.ts`/
`grid-item-props.interface.ts` has been closed, and a follow-up pass
reading `GridLayout.vue`'s own `defineExpose` block directly closed
two more real gaps on the imperative-handle side
(`scrollToItem(id)`/`focusItem(id)`) — see
`docs/PARITY_GAP_IMPLEMENTATION_PLAN.md` for the full phase-by-phase
history and design rationale for each. A few things worth knowing about
from that history:

- **Two genuine bugs were found and fixed**, neither introduced by
  this port and both affecting Vue equally (shared `core` code, or a
  design pattern this port's own read-first approach happened to
  surface): `compactItem`/`compactItemHorizontal` silently ignored
  `restoreOnDrag`'s own `minPositions` under the default
  `ECompactType.VERTICAL`/`HORIZONTAL` compact types (Phase 12); and
  `containerWidth`'s own seed default (`100`) was indistinguishable
  from a genuine measurement, meaning any mount with `responsive`
  already `true` briefly bounds-corrected/compacted the layout for a
  spurious 2-column grid before the real measurement ever landed
  (found while verifying `distributeEvenly`, fixed with a dedicated
  `hasMeasuredWidth` flag — not yet checked whether Vue's own
  `useResponsiveLayout.ts` shares the same shape of bug).
- **A separate, pre-existing `core` bug was found and fixed** in a
  follow-up phase after Phase 18 deliberately left it flagged rather
  than rushed: `moveElementAwayFromCollision`'s own recursive call to
  `moveElement` passed arguments in the wrong order, so a *cascading*
  collision (an item pushed aside itself colliding with something
  else) didn't correctly see `horizontalShift`'s real value — and, as
  tracing it more closely later revealed, silently suppressed
  `isUserAction` too for *any* multi-level cascade, not just
  `horizontalShift`-related ones. This was dormant, pre-existing
  shared-code behavior affecting Vue equally, not something this
  port's own changes caused; fixed with a single restored argument
  (Phase 21).
- **A genuinely separate axis of gap, now fully closed:** comparing
  Vue's full `EGridLayoutEvent` emission list against React's own
  callback props directly found several granular events with no React
  equivalent at all. `DRAG_START`/`DRAG_MOVE`/`DRAG_END`,
  `MOVE_BLOCKED_BY_COLLISION`, `SELECTION_CHANGED`, `LAYOUT_READY`, and
  `COLUMNS_CHANGED` are now all ported. The one remaining gap at that
  point — `LAYOUT_CREATED`/`LAYOUT_BEFORE_MOUNT`/`LAYOUT_MOUNTED`,
  judged not worth a React mapping — was subsequently removed from Vue
  itself entirely (a direct request, not a parity-driven change):
  `LAYOUT_CREATED` fired synchronously during Vue's own `setup()`,
  before mount even happened, with no React equivalent possible even in
  principle; `LAYOUT_BEFORE_MOUNT`/`LAYOUT_MOUNTED` fired before layout
  validation/responsive setup had run, so a listener only ever saw an
  unvalidated, unsettled layout. All three are gone from
  `EGridLayoutEvent` (`packages/core`) and `GridLayout.vue`'s own emit
  call sites — there's nothing left on either side to compare.

See `docs/IMPLEMENTATION_PLAN.md` for the phase-by-phase history of
what's landed so far and why, and `docs/PARITY_GAP_PLAN.md` (in the
`vue` package) for how several of Vue's own features were designed the
first time around — most of that reasoning carries over directly
rather than needing to be rediscovered when closing any of the above.

## Architecture notes

- `grid-context.ts` (`GridContext`/`useGridContext`) is the React
  equivalent of the Vue package's own `$parent`/eventBus contract
  (`docs/ARCHITECTURE.md` in `packages/vue`) — shared state a `GridItem`
  needs from its parent `GridLayout`, expressed as `createContext`/
  `useContext` instead, since that's the idiomatic React mechanism for
  the same relationship.
- `hooks/useGridItemDrag.ts`/`hooks/useGridItemResize.ts` port the exact
  same grid-unit math as Vue's own `useGridItemDrag.ts`/
  `useGridItemResize.ts` composables, adapted to React's hook model: a
  plain `ref` (not a Vue `ref`, which is both "current value" and
  reactive at once) holds the live pixel position/size during a
  gesture so the native engine's callback can read/write it
  synchronously within a single call, mirrored into `useState` purely
  so `GridItem` re-renders with the latest value on every tick.
- The native pointer-driven drag/resize/auto-scroll engine itself
  (`createNativeDraggable`/`createNativeResizable`/
  `createNativeAutoScroll`) lives in `@keystone-dashboard-layout/core`
  and is genuinely framework-agnostic (built on the plain Pointer
  Events API) — this package doesn't reimplement or duplicate any of
  it.
- `hooks/useCrossGridDrag.ts` imports `registerCrossGridZone`/
  `findCrossGridZoneAt`/`ICrossGridZone` via a `@/core/*` alias
  (`vite.config.ts`/`vitest.config.ts`/`tsconfig.json` all define it,
  pointing at `../core/src`) reaching directly into `core`'s own
  *source* tree, not its built package — the cross-grid registry is a
  runtime coordination singleton tied to component lifecycle, not a
  pure calculation, so it's deliberately excluded from `core`'s own
  public npm `exports` (see that barrel's own header comment). Same
  exact alias, same rationale, as the Vue package's own
  `vite.config.js`/`vitest.config.js`.

## Testing

`src/components/Grid/__tests__/` uses the same test-only
`__nativeDragHandler`/`__nativeResizeHandler` backdoor the Vue
package's own test suite relies on (stashed on the element by
`native-interaction.ts` itself, framework-agnostic) — invoking the
native engine's own registered handler directly rather than simulating
a full pointerdown/move/up sequence for every assertion.
