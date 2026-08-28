import type { ReactNode } from 'react';
import type { ECompactType, IBreakpoints, IColumns, ICompactor, IGridAriaLabels, TBreakpoint, TLayout, TResizeHandle, TResponsiveLayout } from '@keystone-dashboard-layout/core';
import type { ICrossGridDropRejected, ICrossGridItemDropped } from '@/core/gridlayout/interfaces/cross-grid.interfaces';

/**
 * Props accepted by `GridLayout`. Deliberately smaller than the Vue
 * package's own `IGridLayoutProps` — this is the initial React port
 * (see `packages/react/README.md` for the exact feature scope and
 * `docs/IMPLEMENTATION_PLAN.md` for what's still not here and why).
 * Every prop that *is* here matches the Vue package's own naming and
 * default exactly, so migrating between the two (or reading one set of
 * docs for both) stays straightforward as the rest gets ported.
 *
 * A fully **controlled** component, unlike Vue's `v-model:layout`
 * in-place mutation: `GridLayout` never mutates the `layout` array (or
 * any item in it) you pass in. Every change (drag end, resize end,
 * compaction) is reported via `onLayoutChange` with a brand new array;
 * you decide whether/how to store it (the same contract
 * `react-grid-layout` itself uses, since it's the idiomatic React
 * pattern here — a controlled prop plus a change callback — rather
 * than Vue's own two-way-binding convention).
 */
export interface IGridLayoutProps {
  /** The layout array — one entry per rendered `GridItem`, matched by `i`. Required. Per-item `isDraggable`/`isResizable`/`isStatic`/`minW`/`maxW`/`minH`/`maxH`/`zIndex`/`showCloseButton` live directly on each `ILayoutItem` (see that type's own doc comment) — there's no separate per-item prop override the way Vue's `GridItem` component has, since a `GridItem` here only takes `i` and looks its own data up from this array. */
  layout: TLayout;
  /** Called with a new layout array whenever this component's own actions change it (drag end, resize end, and the compaction that follows either) — never called with the same array reference you passed in, and the input `layout` prop is never mutated in place. */
  onLayoutChange?: (layout: TLayout) => void;
  /** Called with an item's own id when its close button (`showCloseButton`) is clicked. Deliberately does not remove anything from `layout` itself — same "the library doesn't decide what removal means" stance as the Vue package's own version; your own handler decides whether/how to remove the item. */
  onItemClose?: (id: string | number) => void;
  /** Called with a dragged item's own id at the start of a drag gesture (before any position change has been applied). Matches the Vue package's own `EGridLayoutEvent.DRAG_START`. */
  onDragStart?: (id: string | number) => void;
  /** Called with a dragged item's own id on every intermediate tick of an in-progress drag gesture (not the final commit — see `onDragEnd` for that). Matches the Vue package's own `EGridLayoutEvent.DRAG_MOVE`. */
  onDragMove?: (id: string | number) => void;
  /** Called with a dragged item's own id once a drag gesture ends (pointer released). Matches the Vue package's own `EGridLayoutEvent.DRAG_END`. */
  onDragEnd?: (id: string | number) => void;
  /**
   * Called with an item's own id whenever `preventCollision` actually
   * constrained a drag or resize because of a collision — for a drag,
   * only when the move was blocked *entirely* (the item ends up back
   * at its own pre-move position, having requested a genuinely
   * different one); for a resize, whenever the requested size was
   * clamped down at all (a partial clamp counts, not only a full
   * block — resizing can still grow partially even when blocked,
   * unlike a drag). Has no effect at all when `preventCollision` is
   * off. Matches the Vue package's own
   * `EGridLayoutEvent.MOVE_BLOCKED_BY_COLLISION`.
   */
  onMoveBlockedByCollision?: (id: string | number) => void;
  /**
   * Called with the full, current list of selected item ids (in
   * selection order) whenever `multiSelect`'s own selection actually
   * changes — a click, `selectItem`/`deselectItem`/
   * `toggleItemSelection`/`clearSelection` (via `ref`), or an item
   * being pruned out of the selection because it no longer exists in
   * `layout`. Not called on initial mount (selection starts empty, and
   * nothing has *changed* yet). Matches the Vue package's own
   * `EGridLayoutEvent.SELECTION_CHANGED`.
   */
  onSelectionChanged?: (selectedItems: (string | number)[]) => void;
  /**
   * Called once, the first time this grid's own container width is
   * successfully measured (i.e. right after mount settles, once every
   * `GridItem` has had a real width to compute its own position/size
   * against) — with the layout array as it stood at that moment. Never
   * called again after that first time. Matches the Vue package's own
   * `EGridLayoutEvent.LAYOUT_READY`.
   */
  onLayoutReady?: (layout: TLayout) => void;
  /**
   * Called with the new value whenever the grid-wide `colNum` prop
   * itself changes — distinct from `onBreakpointChange`, which only
   * fires for a `responsive`-driven column-count change; this fires
   * for a directly-changed `colNum` prop regardless of `responsive`.
   * Not called on initial mount, only on a subsequent change. Matches
   * the Vue package's own `EGridLayoutEvent.COLUMNS_CHANGED`.
   */
  onColumnsChanged?: (colNum: number) => void;
  /** Maximum number of columns. Default `12`. */
  colNum?: number;
  /** Height of one grid row, in pixels. Default `150`. */
  rowHeight?: number;
  /** `[horizontal, vertical]` spacing between items, in pixels. Default `[10, 10]`. */
  margin?: [number, number];
  /** Maximum number of rows the layout may grow to. Default `Infinity`. */
  maxRows?: number;
  /** Default `isDraggable` for items that don't set their own on the layout array. Default `true`. */
  isDraggable?: boolean;
  /** Default `isResizable` for items that don't set their own on the layout array. Default `true`. */
  isResizable?: boolean;
  /** Restricts dragging to within the container's bounds. Default `false`. A per-item `ILayoutItem.isBounded` overrides this for just that item. */
  isBounded?: boolean;
  /** When `true`, dragging/resizing an item that would collide with another is blocked instead of pushing the other item out of the way. Default `false`. */
  preventCollision?: boolean;
  /**
   * Grid-wide master interactivity switch — `false` disables dragging,
   * resizing, and the close button across the *whole* grid at once, a
   * "view mode" toggle, without needing to set `isDraggable`/
   * `isResizable`/`showCloseButton` to `false` individually. A per-item
   * `ILayoutItem.enableEditMode` overrides this for just that item
   * (e.g. unlocking one panel in an otherwise view-only dashboard).
   * Default `true`.
   */
  enableEditMode?: boolean;
  /**
   * Deprecated — prefer `heightMode`. Automatically grow/shrink the
   * container's height to fit the layout's content. `false` means no
   * explicit height is applied at all (your own CSS decides). Ignored
   * when `heightMode` is set to anything other than its own `null`
   * default — same non-breaking precedence rule as the Vue package's
   * own `heightMode`/`autoSize` pair. Default `true`.
   */
  autoSize?: boolean;
  /**
   * How the container's height is determined. Default `null`, meaning
   * "defer to `autoSize` instead" — so a consumer using only `autoSize`
   * sees no behavior change at all. An explicit value here always wins
   * outright over `autoSize` when both are set (not merged).
   *
   * - `'auto'`: grows/shrinks to fit the layout's content — today's
   *   `autoSize: true` behavior.
   * - `'fixed'`: no explicit height at all — today's `autoSize: false`
   *   behavior; your own CSS decides.
   * - `'scroll'`: same as `'fixed'` for height, plus an inline
   *   `overflow-y: auto` so content taller than your own fixed height
   *   scrolls internally instead of overflowing.
   * - `'fit'`: height locked to `100%` of the parent container, with
   *   the same `overflow-y: auto` as `'scroll'`.
   */
  heightMode?: `auto` | `fixed` | `scroll` | `fit` | null;
  /** Positions items with CSS `transform: translate3d(...)` instead of `top`/`left`. Default `true` (faster, GPU-accelerated). */
  useCssTransforms?: boolean;
  /**
   * Compensates drag/resize pixel math for a scaled ancestor (e.g. a
   * zoomed-out canvas view rendering this `GridLayout` inside a
   * `transform: scale(...)` container) — every pointer-movement delta
   * during an active drag/resize is divided by this factor before
   * being applied, so a real on-screen pointer movement of a given
   * size produces the same *visual* item movement regardless of the
   * ancestor's own scale. Grid-wide only (matching Vue's own version,
   * which has no per-item equivalent either — a scaled ancestor
   * affects the whole grid uniformly). Default `1` (no compensation,
   * identical behavior to before this prop existed).
   */
  transformScale?: number;
  /**
   * Duration, in milliseconds, of the CSS transition applied to item
   * position/size changes. Applied via a `--kdl-transition-duration`
   * CSS custom property on the root element, inherited naturally by
   * every `GridItem` underneath — no per-item override (grid-wide
   * only, matching Vue's own version, which doesn't expose this on
   * `GridItem` either). Default `200`.
   */
  transitionDurationMs?: number;
  /**
   * CSS `transition-timing-function` for the same transitions
   * `transitionDurationMs` controls (e.g. `'ease'`, `'ease-out'`,
   * `'linear'`, or a `cubic-bezier(...)` string). Applied the same
   * way, via `--kdl-transition-timing`. Default `'ease'`.
   */
  transitionTimingFunction?: string;
  /** Selects the built-in compaction strategy. Default `ECompactType.VERTICAL`. Ignored when `compactor` is set. */
  compactType?: ECompactType;
  /**
   * While a drag is in progress, prevents *other* items from compacting
   * any tighter than their own position immediately before the drag
   * started — only meaningful when `compactType` is `VERTICAL` or
   * `NONE` (restricts how far up other items rise) or `HORIZONTAL`
   * (restricts how far left); has no effect for the two `*_OVERLAP`
   * compact types, which never consult this at all. Only applies
   * during the drag itself (`dragmove`/`dragend`) — a subsequent
   * resize, `compactNow()`, or any other commit compacts normally,
   * with no memory of the drag that just ended. Default `false`.
   */
  restoreOnDrag?: boolean;
  /**
   * Only relevant when `responsive` is on: when a breakpoint change
   * shrinks `colNum` and an item no longer fits, `false` (the default)
   * simply clamps that item back against the right edge
   * (`x = colNum - w`). `true` instead spreads it to the next available
   * slot — wrapping to a new row if needed — via `core`'s own
   * `moveToCorrectPlace`, so items redistribute across the *new*,
   * narrower column count instead of all piling up flush against the
   * same edge. Has no effect at all outside a responsive breakpoint
   * change (not consulted by ordinary drag/resize/compaction). Default
   * `false`.
   */
  distributeEvenly?: boolean;
  /**
   * When a dragged item passes over another during a gesture, `false`
   * (the default) always pushes the collided-with item straight down
   * (or up, if there's room above). `true` instead pushes it left/right
   * when the drag itself is moving primarily left/right — matching
   * `core`'s own `moveElement`/`moveElementAwayFromCollision` shared
   * with the Vue package. Forwarded straight into `moveElement`'s own
   * `horizontalShift` parameter (previously always hardcoded to
   * `false` in this package, regardless of what a consumer might have
   * wanted). Default `false`.
   */
  horizontalShift?: boolean;
  /**
   * Overrides `GridLayout`'s own compaction algorithm entirely.
   * `null`/`undefined` (the default) uses the built-in strategy
   * selected by `compactType`, unchanged — this is a purely additive
   * override, not a replacement for `compactType` (which keeps working
   * normally whether or not this is set). See `ICompactor`
   * (`@keystone-dashboard-layout/core`) for the interface to implement
   * and its own worked example. Called after every drag end, resize
   * end, item add/remove, on mount, on a breakpoint/column-count
   * change, and by `compactNow()`/`rearrange()` on demand — the same
   * trigger points the built-in compaction already runs at.
   */
  compactor?: ICompactor | null;
  /**
   * Restricts which of the 8 resize-hint spans actually render/
   * activate, grid-wide. Default all 8 (`['n', 's', 'e', 'w', 'ne',
   * 'nw', 'se', 'sw']`) — identical behavior to before this prop
   * existed for any consumer who doesn't set it. A per-item
   * `ILayoutItem.resizeHandles` overrides this for just that item
   * (an empty array is a deliberate, valid "no handle-driven resize
   * for this item" value, distinct from `isResizable: false`).
   */
  resizeHandles?: TResizeHandle[];
  /**
   * Renders a *visible* resize-handle affordance (a small triangle/bar
   * per edge/corner) instead of the default invisible hit-zone-only
   * styling (a cursor change on hover is the only feedback otherwise).
   * A per-item `ILayoutItem.showResizeHandles` overrides this for just
   * that item. Default `false`.
   */
  showResizeHandles?: boolean;
  /**
   * CSS color for the visible resize-handle affordance, when the
   * resolved `showResizeHandles` is on — a per-item
   * `ILayoutItem.resizeHandleColor` overrides this for just that item.
   * Default a semi-transparent gray (`'rgb(94 94 94 / 45%)'`).
   */
  resizeHandleColor?: string;
  /** Renders visible grid line guides behind the items, sized to the actual `colNum`/`rowHeight` (not a fixed pattern). Default `false`. */
  showGridLines?: boolean;
  /** Grid-wide default for whether each item renders its own close button — a per-item `ILayoutItem.showCloseButton` overrides this for just that item. Default `false`. Clicking it calls `onItemClose`, if provided; this prop alone renders nothing without also handling that callback. */
  showCloseButton?: boolean;
  /** Magnetically snaps a dragged item's edge to another item's edge once within `snapThreshold` grid units of it — changes where the item actually lands, unlike `showAlignmentGuides` (visual-only). Default `false`. */
  snapToGrid?: boolean;
  /** How close (in grid units) an edge needs to be to another item's edge to snap to it, when `snapToGrid` is on. `0` disables snapping entirely. Default `1`. */
  snapThreshold?: number;
  /** Shows guide lines while dragging/resizing wherever the active item's edges line up with another item's edges — visual only, doesn't change where the item lands (see `snapToGrid` for that). Default `false`. */
  showAlignmentGuides?: boolean;
  /** Shows a labeled distance badge ("2 cols"/"1 row") between the active item and its nearest neighbor on each side, while dragging/resizing. Default `false`. */
  showSpacingGuides?: boolean;
  /**
   * Enables click/Shift-click/Ctrl-click multi-item selection. Off by
   * default, in which case `selectedItems`/`selectItem`/etc. (via
   * `ref`) always report an empty selection and every click is a
   * no-op. Selection also enables group move/resize: dragging or
   * resizing one selected item (while more than one is selected)
   * applies the same delta to every other selected item, skipping any
   * that are static or explicitly not draggable/resizable.
   */
  multiSelect?: boolean;
  /** Enables `undo()`/`redo()` (via `ref`). Off by default, in which case both are permanent no-ops. Snapshots are taken at drag start, resize start, `duplicateItem`, `compactNow`, and any externally-driven `layout` length change. */
  enableUndoRedo?: boolean;
  /** Maximum number of snapshots kept for `undo()` — the oldest is dropped once exceeded. Only relevant when `enableUndoRedo` is on. Default `50`. */
  undoHistoryLimit?: number;
  /**
   * Enables responsive breakpoints: `colNum` becomes derived from
   * `breakpoints`/`cols` and the measured container width instead of
   * the plain `colNum` prop. Default `false`.
   */
  responsive?: boolean;
  /**
   * Container-width threshold (in pixels) at or above which each named
   * breakpoint applies — the largest breakpoint whose own value is
   * `<=` the measured width wins. All 7 standard keys are required
   * (custom breakpoint names aren't supported in this initial pass).
   * Only relevant when `responsive` is on. Default `{ xxl: 1600, xl:
   * 1400, lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }`.
   */
  breakpoints?: IBreakpoints;
  /** Column count to use at each breakpoint, when `responsive` is on. Default `{ xxl: 12, xl: 12, lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }`. */
  cols?: IColumns;
  /**
   * Pre-defined layouts keyed by breakpoint name — a breakpoint
   * without its own explicit entry gets an auto-generated layout
   * (bounds-corrected and compacted from the nearest already-seen
   * breakpoint) the first time it's entered. Every key is optional.
   * Only relevant when `responsive` is on.
   */
  responsiveLayouts?: TResponsiveLayout;
  /** Called whenever `responsive` causes the active breakpoint to change, with the new breakpoint's own name and column count. */
  onBreakpointChange?: (breakpoint: TBreakpoint, cols: number) => void;
  /** Mirrors the entire grid right-to-left — items position via CSS `right` instead of `left`, and which physical edge (left vs. right) anchors a resize follows suit. A per-item `ILayoutItem.isMirrored` (default `true`) can opt just that one item out of RTL while the rest of the grid still mirrors. Default `false`. */
  isMirrored?: boolean;
  /** Grid-wide default for whether native auto-scroll runs near a container edge during drag/resize — a per-item `ILayoutItem.autoScroll` overrides this for just that item. Default `false`. */
  autoScroll?: boolean;
  /** Grid-wide default for whether resizing preserves an item's current width/height ratio (deriving the undriven dimension from the driven one) — a per-item `ILayoutItem.preserveAspectRatio` overrides this for just that item. Default `false`. */
  preserveAspectRatio?: boolean;
  /**
   * Grid-wide default border radius, in pixels, applied when
   * `useBorderRadius` is on — a per-item `ILayoutItem.borderRadiusPx`
   * overrides this for just that item. Default `10`.
   */
  borderRadiusPx?: number;
  /**
   * Grid-wide default for whether `borderRadiusPx` is actually applied
   * as a real border radius on each item — a per-item
   * `ILayoutItem.useBorderRadius` overrides this for just that item.
   * Default `false`.
   */
  useBorderRadius?: boolean;
  /**
   * Instruction/label strings announced to assistive technology —
   * merged with built-in English defaults, so overriding just one key
   * (e.g. only `closeButton`) doesn't require re-supplying the rest.
   * A per-item `ILayoutItem.ariaLabels` overrides this for just that
   * item, merged the same way. See `IGridAriaLabels`
   * (`@keystone-dashboard-layout/core`) for the full field list (close
   * button label, item role description, move/resize keyboard
   * instructions).
   */
  ariaLabels?: IGridAriaLabels;
  /**
   * Enables dragging an item *between* two `GridLayout` instances —
   * dropping onto another grid that also has this on removes the item
   * from this grid and inserts it into the target (via a real first-fit
   * bin-pack, `core`'s own `findFirstFitSlot`, not a naive "drop at
   * `y: Infinity`, let compaction sort it out" placement). Distinct
   * from `allowOutsideDrop` below: this is for dragging an *existing*
   * item between grids via the same pointer-driven engine normal
   * in-grid dragging uses, not the browser's native HTML5
   * drag-and-drop API. Default `false`.
   */
  allowCrossGridDrag?: boolean;
  /** When `true`, this grid rejects an incoming cross-grid drop from another grid (`onCrossGridDropRejected` fires on *this* grid; the source grid's own item stays exactly where it was, as if the attempt never happened). Only relevant when `allowCrossGridDrag` is on. Default `false`. */
  disableExternalDrop?: boolean;
  /**
   * This grid's own identifier for `allowCrossGridDrag`'s shared
   * registry, and for `sourceLayoutId`/`layoutId` fields in the
   * cross-grid event payloads below. Auto-generated (via React's own
   * `useId()`) if not provided — only worth setting explicitly if you
   * need a stable, predictable value to check against yourself (e.g.
   * in `onCrossGridItemDropped`).
   */
  layoutId?: string;
  /** Called on the *target* grid when another grid's item is dropped onto it and accepted. Only relevant when `allowCrossGridDrag` is on. */
  onCrossGridItemDropped?: (payload: ICrossGridItemDropped) => void;
  /** Called on the *target* grid when it rejects an incoming cross-grid drop (`disableExternalDrop` was on). Only relevant when `allowCrossGridDrag` is on. */
  onCrossGridDropRejected?: (payload: ICrossGridDropRejected) => void;
  /**
   * Enables accepting a *native* HTML5 drag-and-drop from outside the
   * grid system entirely — e.g. a plain `draggable="true"` element
   * elsewhere on the page, not another `GridItem`. Distinct from
   * `allowCrossGridDrag` above: this is the browser's own native
   * drag-and-drop API, not the pointer-driven engine normal in-grid
   * dragging uses. Default `false`.
   */
  allowOutsideDrop?: boolean;
  /** Width, in grid units, reserved for the live drop-position placeholder and passed through to `onOutsideDrop`. Only relevant when `allowOutsideDrop` is on. Default `2`. */
  outsideDropWidth?: number;
  /** Height, in grid units, reserved for the live drop-position placeholder and passed through to `onOutsideDrop`. Only relevant when `allowOutsideDrop` is on. Default `2`. */
  outsideDropHeight?: number;
  /**
   * Decides whether a given native drag actually qualifies for
   * `allowOutsideDrop` at all — return `false` to let the browser's own
   * default "not a valid drop target" handling take over instead (no
   * placeholder, no `onOutsideDrop`) for a drag your own logic doesn't
   * want to accept (e.g. checking `dataTransfer.types` for a specific
   * MIME type your own drag sources use). `undefined` (the default)
   * accepts every native drag unconditionally.
   */
  outsideDropAccept?: (dataTransfer: DataTransfer | null) => boolean;
  /**
   * Called when a native HTML5 drag is dropped onto this grid
   * (`allowOutsideDrop`) and accepted by `outsideDropAccept` (if
   * provided). Deliberately does not itself add anything to `layout` —
   * same "the library doesn't decide what an add means" stance as
   * `onItemClose`; use `core`'s own `readOutsideDropPayload` to parse
   * `dataTransfer` if your drag source attached structured data, then
   * add the new item to your own `layout` state using the given
   * `x`/`y`/`w`/`h`.
   */
  onOutsideDrop?: (payload: { x: number; y: number; w: number; h: number; dataTransfer: DataTransfer | null }) => void;
  /**
   * Renders fully custom content at the drop target during *any* drag
   * or resize — in-grid or outside-drop — instead of the default
   * plain, dashed-outline box. The React render-prop equivalent of
   * Vue's own `#placeholder` scoped slot (confirmed via a direct
   * source read of `GridLayout.vue`'s own template, not re-derived):
   * that slot receives `{ placeholder, isDragging }` as its own scope
   * object; this prop receives the same two values as plain function
   * arguments instead, matching this package's own `renderResizeHandle`
   * convention of plain arguments over a single context object.
   * `undefined` (the default) renders the existing plain box, exactly
   * as before this prop existed. Positioning/sizing itself is still
   * handled automatically (the returned content is placed inside the
   * already-correctly-positioned wrapper); only the content shown
   * inside that box is customizable.
   */
  renderPlaceholder?: (placeholder: { h: number; w: number; x: number; y: number } | null, isDragging: boolean) => ReactNode;
  /** The `GridItem` elements to render — one per `layout` entry, each needing only a matching `i` prop and a `key`. */
  children?: ReactNode;
  /** Applied to the root element, alongside the library's own `vue-grid-layout`-equivalent class (`kdl-grid-layout`). */
  className?: string;
}
