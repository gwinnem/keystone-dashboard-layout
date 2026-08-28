import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { CSSProperties, DragEvent, JSX, MouseEvent } from 'react';
import {
  calcColWidth,
  cloneLayout,
  computeAlignAdjustments,
  computeDistributeAdjustments,
  computeRangeSelection,
  ECompactType,
  exportLayoutAsSvg as coreExportLayoutAsSvg,
  findAlignmentGuides,
  findFirstFitSlot,
  findOrGenerateResponsiveLayout,
  findSnapAdjustment,
  findSpacingIndicators,
  getAllCollisions,
  getBottomYCoordinate,
  getBreakpointFromWidth,
  getColsFromBreakpoint,
  getCompactor,
  getLayoutItem,
  moveElement,
  resolveAriaLabels,
} from '@keystone-dashboard-layout/core';
import type { IBreakpoints, IColumns, IExportLayoutAsSvgOptions, ILayoutItem, TAlignEdge, TBreakpoint, TDistributeAxis, TLayout, TResizeHandle, TResponsiveLayout } from '@keystone-dashboard-layout/core';
import type { IGridLayoutProps } from './grid-layout-props.interface';
import type { IGridLayoutHandle } from './grid-layout-handle.interface';
import { GridContext } from './grid-context';
import type { TGridGestureEventType } from './grid-context';
import { useCrossGridDrag } from './hooks/useCrossGridDrag';

/** Module-level, not per-render — a fresh `[10, 10]` array literal as an inline default parameter value would be a *new* reference on every render, making anything depending on `margin` in a `useEffect`/`useCallback`/`useMemo` dependency array think it changed every single render even when the consumer never touched it. */
const DEFAULT_MARGIN: [number, number] = [10, 10];

/** Same reference-stability rationale as `DEFAULT_MARGIN` above. */
const DEFAULT_RESIZE_HANDLES: TResizeHandle[] = [`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`];

/** `showResizeHandles`'s own default color — matches Vue's own default exactly (a semi-transparent gray). */
const DEFAULT_RESIZE_HANDLE_COLOR = `rgb(94 94 94 / 45%)`;

/** `responsive`'s own default breakpoint widths — matches `IBreakpoints`'s own documented defaults exactly. All 7 standard keys are required for `getBreakpointFromWidth` to work at all (custom breakpoint names aren't supported in this initial pass). Same reference-stability rationale as `DEFAULT_MARGIN` above. */
const DEFAULT_BREAKPOINTS: IBreakpoints = { lg: 1200, md: 996, sm: 768, xl: 1400, xs: 480, xxl: 1600, xxs: 0 };

/** `responsive`'s own default column counts per breakpoint — matches `IColumns`'s own documented defaults exactly. Same reference-stability rationale as `DEFAULT_MARGIN` above. */
const DEFAULT_COLS: IColumns = { lg: 12, md: 10, sm: 6, xl: 12, xs: 4, xxl: 12, xxs: 2 };

/** Same reference-stability rationale as `DEFAULT_MARGIN` above. */
const DEFAULT_RESPONSIVE_LAYOUTS: TResponsiveLayout = {};

/**
 * Whether every item's own `x`/`y`/`w`/`h` in `a` matches its
 * same-`i` counterpart in `b` — used by the controlled-component sync
 * below to detect whether compacting a freshly-synced external
 * `layout` prop actually changed anything (e.g. resolved a
 * newly-appended item's own sentinel `y: Infinity`), so `onLayoutChange`
 * only fires when the consumer's own `layout` genuinely no longer
 * matches what's actually rendered — not on every sync, which would
 * otherwise notify the consumer even when compaction was a pure no-op
 * against an already-settled layout. Deliberately a targeted
 * field-by-field comparison, not `JSON.stringify(a) === JSON.stringify(b)`
 * — `ILayoutItem.data` is an arbitrary, consumer-defined payload
 * ("never read or written by the library itself", per its own doc
 * comment) that could contain something `JSON.stringify` can't safely
 * round-trip (a function, a circular reference), so comparing only the
 * fields compaction can actually touch avoids depending on the shape
 * of data this component never looks at otherwise.
 */
function layoutPositionsEqual(a: TLayout, b: TLayout): boolean {
  if(a.length !== b.length) {
    return false;
  }
  const byId = new Map(b.map(item => [item.i, item]));
  return a.every(item => {
    const match = byId.get(item.i);
    return match !== undefined && match.x === item.x && match.y === item.y && match.w === item.w && match.h === item.h;
  });
}

/** A single rendered alignment-guide line — pixel-converted from `core`'s own grid-unit `IAlignmentGuide`. */
interface IAlignmentGuideStyle {
  height: string;
  left: string;
  top: string;
  width: string;
}

/** A single rendered spacing-indicator badge — pixel-converted from `core`'s own grid-unit `ISpacingIndicator`. */
interface ISpacingIndicatorStyle {
  label: string;
  left: string;
  top: string;
}

/**
 * The grid container — the React port of Vue's own `GridLayout.vue`.
 * See that file's own doc comment, `packages/react/README.md` for this
 * port's exact feature scope, and `docs/IMPLEMENTATION_PLAN.md` for
 * what's still not here and why.
 *
 * A fully **controlled** component: `layout` is never mutated in
 * place, and every internal change (drag/resize tick, the compaction
 * that follows each one) is mirrored into local state *and* reported
 * via `onLayoutChange` — matching `react-grid-layout`'s own established
 * contract for this class of component, since that's the idiomatic
 * React pattern here rather than Vue's `v-model:layout` two-way
 * binding. Compaction re-runs on every single drag/resize tick (not
 * only at the gesture's end), matching Vue's own behavior of doing the
 * same on every `dragEvent`/`resizeEvent` — this is what produces the
 * "other items shuffle out of the way live, while you're still
 * dragging" feedback, not just a final snap-into-place at drop.
 *
 * Exposes `compactNow`/`rearrange`/`duplicateItem`/selection/undo-redo
 * via `ref` — the React equivalent of the Vue package's own
 * `defineExpose`'d template-ref methods (see
 * `docs/IMPLEMENTATION_PLAN.md` item 2.1). Attach a `ref` to call them:
 * `const gridRef = useRef<IGridLayoutHandle>(null); ... <GridLayout
 * ref={gridRef} .../> ... gridRef.current?.compactNow();`.
 */
export const GridLayout = forwardRef<IGridLayoutHandle, IGridLayoutProps>(function GridLayout({
  layout,
  onLayoutChange,
  onItemClose,
  onDragStart,
  onDragMove,
  onDragEnd,
  onMoveBlockedByCollision,
  onSelectionChanged,
  onLayoutReady,
  onColumnsChanged,
  onBreakpointChange,
  colNum: colNumProp = 12,
  rowHeight = 150,
  margin = DEFAULT_MARGIN,
  maxRows = Infinity,
  isDraggable = true,
  isResizable = true,
  isBounded = false,
  preventCollision = false,
  enableEditMode = true,
  autoSize = true,
  heightMode = null,
  useCssTransforms = true,
  transformScale = 1,
  transitionDurationMs = 200,
  transitionTimingFunction = `ease`,
  compactType = ECompactType.VERTICAL,
  restoreOnDrag = false,
  distributeEvenly = false,
  horizontalShift = false,
  compactor = null,
  resizeHandles = DEFAULT_RESIZE_HANDLES,
  showResizeHandles = false,
  resizeHandleColor = DEFAULT_RESIZE_HANDLE_COLOR,
  showGridLines = false,
  showCloseButton = false,
  snapToGrid = false,
  snapThreshold = 1,
  showAlignmentGuides = false,
  showSpacingGuides = false,
  multiSelect = false,
  enableUndoRedo = false,
  undoHistoryLimit = 50,
  responsive = false,
  breakpoints = DEFAULT_BREAKPOINTS,
  cols = DEFAULT_COLS,
  responsiveLayouts = DEFAULT_RESPONSIVE_LAYOUTS,
  isMirrored = false,
  autoScroll = false,
  preserveAspectRatio = false,
  borderRadiusPx = 10,
  useBorderRadius = false,
  ariaLabels,
  allowCrossGridDrag = false,
  disableExternalDrop = false,
  layoutId: layoutIdProp,
  onCrossGridItemDropped,
  onCrossGridDropRejected,
  allowOutsideDrop = false,
  outsideDropWidth = 2,
  outsideDropHeight = 2,
  outsideDropAccept,
  onOutsideDrop,
  renderPlaceholder,
  children,
  className,
}: IGridLayoutProps, ref): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  // Auto-generated (React's own useId, always called unconditionally
  // per the rules of hooks) whenever `layoutId` isn't explicitly
  // provided — only meaningfully used at all when `allowCrossGridDrag`
  // is on, but cheap enough to compute regardless.
  const generatedLayoutId = useId();
  const layoutId = layoutIdProp ?? generatedLayoutId;
  const [containerWidth, setContainerWidth] = useState(100);
  /**
   * Bug fix: `containerWidth`'s own seed default (`100`) is
   * indistinguishable from a genuine 100px measurement once read back
   * — the responsive-breakpoint effect below used to guard only on
   * `containerWidth < 1`, meaning on a mount where `responsive` is
   * already `true` from the start, that effect's *very first* run (in
   * the same commit as the initial render, before the container-width
   * effect's own `setContainerWidth` call from a real measurement has
   * had a chance to land — that's a separate state update, scheduled
   * for a later render, not synchronous within the same commit) sees
   * the seed `100`, not the real width. At `100`, `getBreakpointFromWidth`
   * resolves to `'xxs'` (`IBreakpoints`'s own default has it at
   * threshold `0`) — meaning every real consumer mounting with
   * `responsive` on saw their layout briefly bounds-corrected and
   * compacted for a *2-column* grid, regardless of the actual
   * container size, before the real measurement ever landed. A
   * dedicated flag (not `containerWidth` itself) is what actually
   * distinguishes "genuinely not measured yet" from "measured, and it
   * happens to be a small number" — `containerWidth` alone can't tell
   * those apart, since a real container could legitimately be under
   * 480px wide too.
   */
  const [hasMeasuredWidth, setHasMeasuredWidth] = useState(false);
  const [workingLayout, setWorkingLayout] = useState<TLayout>(() => cloneLayout(layout));
  const [alignmentGuideStyles, setAlignmentGuideStyles] = useState<IAlignmentGuideStyle[]>([]);
  const [spacingIndicatorStyles, setSpacingIndicatorStyles] = useState<ISpacingIndicatorStyle[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string | number>>(() => new Set());
  const [currentBreakpoint, setCurrentBreakpoint] = useState<TBreakpoint | null>(null);
  /**
   * Whether *any* item within this grid is currently being dragged —
   * ported from the Vue package's own `isDragging`/`.vue-grid-layout--
   * active-drag` fix (confirmed via a fresh e2e run against this exact
   * gap, not assumed: React never had an equivalent at all). Drives a
   * z-index boost on this grid's own root element (see the
   * `classNames` computation below) — needed because `isolation:
   * isolate` (`styles/index.css`) makes every `.kdl-grid-layout` its
   * own stacking context, so two sibling grids with no z-index of
   * their own stack purely by DOM order. During an `allowCrossGridDrag`
   * gesture, the dragged item stays a DOM child of its own *source*
   * grid the entire time — including while the pointer is visually
   * hovering over a different, sibling grid — so without this boost,
   * the dragged item visually disappears behind a sibling grid that
   * happens to render later in the DOM (confirmed directly via a fresh
   * `elementFromPoint` check, not theorized).
   */
  const [isAnyItemDragging, setIsAnyItemDragging] = useState(false);
  /**
   * The live, in-progress target grid-unit position/size for a *regular*
   * in-grid drag or resize — a separate, general-purpose tracker from
   * `outsideDropPlaceholder` below (which only ever covers native HTML5
   * drag-and-drop from outside the grid). Populated at dragstart/
   * dragmove/resizestart/resizemove, cleared at dragend/resizeend (and
   * the cross-grid-accepted early-return path in `handleItemDrag`,
   * which never reaches a normal dragend at all). Feeds `renderPlaceholder`/
   * the default placeholder box below — the React equivalent of Vue's
   * own `#placeholder` scoped slot rendering during any drag, not just
   * outside-drop.
   */
  const [itemGesturePlaceholder, setItemGesturePlaceholder] = useState<{ h: number; w: number; x: number; y: number } | null>(null);
  // Not state: which breakpoint a layout belongs to has no bearing on
  // this component's own visual output beyond `workingLayout`/
  // `currentBreakpoint` (both already tracked separately as state) —
  // this is purely a lookup cache `findOrGenerateResponsiveLayout` reads
  // and writes, mutated in place is fine since nothing reads it directly
  // during render.
  const layoutsCacheRef = useRef<TResponsiveLayout>(responsiveLayouts);
  /**
   * Merged with the built-in English defaults via `core`'s own
   * `resolveAriaLabels` — memoized specifically because a fresh merged
   * object literal every render (regardless of whether `ariaLabels`
   * itself changed) would defeat `contextValue`'s own memoization below
   * entirely (its dependency array would never see two equal values in
   * a row for this one field, forcing a recompute — and so a
   * re-render of every consuming `GridItem` — on every single render
   * of this component, not just when something meaningful changed).
   * The per-item layer (merging in `ILayoutItem.ariaLabels`) happens in
   * `GridItem.tsx` itself, one level further down.
   */
  const resolvedAriaLabels = useMemo(() => resolveAriaLabels(ariaLabels, undefined), [ariaLabels]);
  /**
   * `colNum`'s own resolved value — `responsive` on with a breakpoint
   * already established derives it from `breakpoints`/`cols` instead of
   * the plain `colNumProp`. Deliberately shadows the destructured
   * parameter's own name (renamed to `colNumProp` above) so every other
   * reference to `colNum` throughout the rest of this component — all
   * written before `responsive` existed — keeps working unchanged
   * against the resolved value, without needing to touch each call site.
   */
  const colNum = responsive && currentBreakpoint ? getColsFromBreakpoint(currentBreakpoint, cols) : colNumProp;
  /**
   * This grid's own actually-used width for every colWidth-derived
   * calculation (item positioning, guides, grid lines, SVG export,
   * outside-drop placement) — distinct from the raw measured
   * `containerWidth` above, which stays the true, unadjusted
   * `ResizeObserver` reading (still what `responsive`'s own breakpoint
   * effect uses; a minW-driven expansion here is not a real page
   * layout change and shouldn't shift which breakpoint is active).
   *
   * Ensures no item ever renders narrower than its own `minW` implies,
   * converted to pixels via `rowHeight` (the only other pixel-valued
   * sizing constant already on this component — treating a column as
   * roughly square by default, not an arbitrary constant invented for
   * this alone) — rather than letting `colWidth` (a single, grid-wide
   * value derived purely from `containerWidth / colNum`) shrink
   * arbitrarily regardless of what any individual item actually needs:
   *
   * - If the measured width already satisfies every item's own minW,
   *   this equals `containerWidth` exactly — byte-identical behavior
   *   to before this existed for any layout with no `minW` set at all.
   * - If the measured width is narrower than some item's own `minW`
   *   floor, this expands to that floor instead — the render below
   *   then renders wider than the actual available space, becoming
   *   horizontally scrollable rather than squeezing that item smaller
   *   than its own stated minimum.
   *
   * `hasMeasuredWidth` gate: a real, confirmed bug, not a defensive
   * guard against a hypothetical. `containerWidth` starts at a seed
   * value (`100`, see that state's own declaration comment above)
   * before the first real `ResizeObserver` measurement lands — applying
   * the minW floor against that *seed* could produce a result different
   * from what it produces against the *real* measurement (e.g. `minW:5`
   * at the default `rowHeight` floors to 540px, exceeding the 100px
   * seed but not a real, wide container) — flipping `needsWidthWrapper`
   * (below) from `true` on the seed render to `false` once the real
   * measurement lands one render later. That flip unmounts and
   * remounts the entire subtree inside the wrapper (React sees it
   * disappear from the tree), destroying every child DOM node,
   * including whatever a consumer or test held a reference to from the
   * first render. Confirmed directly, not theorized: a test asserting
   * on a `getBoundingClientRect()` stub applied to the first render's
   * own wrapper element saw a plain, un-stubbed, all-zero rect instead
   * — the stub was on a DOM node that no longer existed by the time the
   * remounted one was measured. Before a real measurement exists, this
   * simply equals `containerWidth` (the seed) unadjusted — the minW
   * floor only ever applies against a genuine measurement.
   *
   * Deliberately does *not* also derive a ceiling from any item's own
   * `maxW` the same way — an earlier version of this did, and it was a
   * real, confirmed bug, not a hypothetical one: `maxW` constrains what
   * width *that one item* is allowed to grow to (already enforced
   * correctly, independently of this, by `useGridItemResize.ts`'s own
   * `handleResize`/`autoSize` clamping) — it says nothing about how
   * wide the *container* should be. Treating it as a container-wide
   * ceiling meant a single item with `maxW: 3` shrank `colWidth` for
   * *every* item in the grid, not just itself — confirmed via a real
   * failing test (`GridItemAutoHeight.spec.tsx`'s own "clamp down to
   * maxW" case): a container correctly measured at 1210px collapsed to
   * 320px (`3 * rowHeight + 2 * margin`) purely because one item's own
   * `maxW` was 3, corrupting the resulting colWidth math for a
   * measurement that had nothing to do with that item's own bound.
   */
  const effectiveContainerWidth = useMemo(() => {
    if(!hasMeasuredWidth) {
      return containerWidth;
    }
    let minFloorPx = 0;
    workingLayout.forEach(item => {
      if(item.minW !== undefined && item.minW !== null) {
        minFloorPx = Math.max(minFloorPx, item.minW * rowHeight + Math.max(0, item.minW - 1) * margin[0]);
      }
    });
    return Math.max(containerWidth, minFloorPx);
  }, [hasMeasuredWidth, workingLayout, containerWidth, rowHeight, margin]);
  // Bumped on every undo-history-affecting action (see `commitUndoPoint`/
  // `undo`/`redo` below) purely to force `useImperativeHandle`'s factory
  // to recompute `canUndo`/`canRedo` — `historyRef`/`futureRef` are
  // plain refs (not state), since the arrays themselves don't need to
  // drive a re-render on their own; this one small counter is what
  // actually does, decoupled from whether some other state (like
  // `workingLayout`) happens to change in the same action.
  const [undoRedoVersion, setUndoRedoVersion] = useState(0);

  // Mirrors `workingLayout`, read synchronously by the drag/resize
  // handlers below — see this file's own doc comment on why a plain
  // `setWorkingLayout(prev => ...)` functional updater isn't used for
  // that instead: `onLayoutChange` needs to fire as a genuine top-level
  // side effect, not from inside a state updater function (which React
  // may invoke more than once per commit, e.g. under Strict Mode).
  const workingLayoutRef = useRef<TLayout>(workingLayout);
  const historyRef = useRef<TLayout[]>([]);
  const futureRef = useRef<TLayout[]>([]);
  const pendingUndoSnapshotRef = useRef<TLayout | null>(null);
  /**
   * Queues an `onLayoutChange` call for the effect below whenever the
   * controlled-component sync's own compaction pass (see that block's
   * own doc comment) actually changed something relative to what the
   * consumer passed in — e.g. resolved a freshly-appended item's own
   * sentinel `y: Infinity` to a real position. Not called directly
   * from the sync itself: that runs during render, and `onLayoutChange`
   * is the consumer's own callback, which may itself trigger a state
   * update in a different component — something React disallows
   * synchronously during this component's own render (same category
   * of render-vs-effect split as `pendingUndoSnapshotRef` itself, just
   * for a different downstream effect).
   */
  const pendingCompactionNotifyRef = useRef<TLayout | null>(null);
  const groupMoveStartPositions = useRef<Map<string | number, { x: number; y: number }>>(new Map());
  const groupResizeStartSizes = useRef<Map<string | number, { h: number; w: number }>>(new Map());
  /**
   * The anchor for a future Shift-click range — the last item selected
   * without Shift (a plain click, or a Ctrl/Cmd toggle). See Vue's own
   * `useMultiSelect.ts` `lastAnchorId` for the full rationale (same
   * behavior, ported directly): re-anchors on every non-Shift click,
   * stays fixed across repeated Shift-clicks, and is reset to `null`
   * both by `clearSelection` and by the selection-pruning effect below
   * whenever the anchor's own item stops existing in the layout.
   */
  const lastAnchorIdRef = useRef<string | number | null>(null);
  /**
   * `restoreOnDrag`'s own gesture-scoped snapshot — every *other*
   * item's own pre-drag `y` (or `x`, for `ECompactType.HORIZONTAL`),
   * captured at `dragstart` from `workingLayoutRef.current` (see
   * `handleItemDrag` below), forwarded into the compactor's own
   * `ICompactorContext.minPositions` at `dragmove`/`dragend` while
   * `restoreOnDrag` is on. Cleared at `dragend` so a later, unrelated
   * commit (a resize, `compactNow()`, etc.) never inherits a stale
   * snapshot from a drag that already finished. Plain ref, not state
   * — gesture-scoped bookkeeping, same category as
   * `groupMoveStartPositions`/`groupResizeStartSizes` above, never
   * itself rendered.
   */
  const dragMinPositionsRef = useRef<Record<string | number, { x?: number; y?: number }> | undefined>(undefined);

  /**
   * Snapshots `before` onto the undo stack and clears the redo stack —
   * a fresh action after an undo invalidates whatever was available to
   * redo, matching the Vue package's own `commitUndoPoint` semantics.
   * A no-op entirely when `enableUndoRedo` is off, so there's no cost
   * to the feature for a consumer who doesn't enable it. Called at
   * drag start, resize start, `duplicateItem`, `compactNow`, and any
   * externally-driven `layout` length change (queued via
   * `pendingUndoSnapshotRef` — see the render-phase sync below, and
   * its own doc comment for why the *commit* itself still happens in
   * an effect even though the *data* sync no longer does) — the same
   * set of trigger points the Vue package's own version uses.
   */
  const commitUndoPoint = useCallback((before: TLayout): void => {
    if(!enableUndoRedo) {
      return;
    }
    historyRef.current.push(cloneLayout(before));
    if(historyRef.current.length > undoHistoryLimit) {
      historyRef.current.shift();
    }
    futureRef.current = [];
    setUndoRedoVersion(version => version + 1);
  }, [enableUndoRedo, undoHistoryLimit]);

  // Controlled-component sync: re-mirror the incoming `layout` prop
  // into local state whenever the consumer's own reference changes —
  // e.g. after they've stored a previous `onLayoutChange` result, or
  // replaced the array wholesale themselves. Never mutated in place.
  //
  // Deliberately done *during render* (React's own documented "adjusting
  // state when a prop changes" pattern — comparing against a `prevLayout`
  // state, not a `useEffect`), not deferred to an effect: a `GridItem`
  // child looks itself up in `workingLayout` (via context) the moment
  // *it* renders, which happens in the very same commit as this parent
  // — a consumer who both grows `layout` and renders a newly-matching
  // `GridItem` child in the same update would otherwise see that child
  // throw (`no layout entry found`), since a `useEffect`-based sync
  // only runs *after* the commit that already tried to render it.
  // Safe to run on every render this way specifically because it's
  // idempotent when repeated (assigning the same clone twice, or
  // bailing out via the `!==` check, causes no corruption) — unlike the
  // undo-history *mutation* itself (`historyRef.current.push`/`.shift`),
  // which is NOT safely repeatable and stays queued for the effect
  // below instead, rather than also being pulled into this synchronous
  // path.
  const [prevLayoutProp, setPrevLayoutProp] = useState(layout);
  if(layout !== prevLayoutProp) {
    setPrevLayoutProp(layout);
    const cloned = cloneLayout(layout);
    if(cloned.length !== workingLayoutRef.current.length) {
      pendingUndoSnapshotRef.current = workingLayoutRef.current;
    }
    // Bug fix: an externally-supplied `layout` can contain
    // not-yet-resolved sentinel positions — most commonly a freshly
    // appended item's own `y: Infinity` ("append it, let compaction
    // figure out where it actually goes" is a documented, encouraged
    // pattern for exactly this "add a new item" case, e.g. this
    // package's own "Add or remove items" example). Every *internal*
    // mutation path (`handleItemDrag`/`handleItemResize`/`compactNow`/
    // `duplicateItem`/the responsive-breakpoint effect/etc.) already
    // runs the layout through compaction before it ever reaches
    // `workingLayout` — this sync, for an *externally*-driven change,
    // was the one path that didn't, so a raw `Infinity` value reached
    // `GridItem`'s own context on this same render (the whole reason
    // this sync runs synchronously during render at all — see this
    // block's own doc comment above). `calcPosition` then produced an
    // invalid position from that `Infinity`, the resulting CSS
    // transform was malformed, and the browser silently dropped it —
    // leaving the new item rendered at the untransformed default
    // position, permanently overlapping whatever already occupied that
    // spot. Confirmed directly via a real, reproduced case: a
    // freshly-added item's own `.style.transform` measured as an empty
    // string, sitting exactly on top of the grid's own first item.
    const compacted = (compactor ?? getCompactor(compactType)).compact(cloned, colNum, { compactType });
    if(!layoutPositionsEqual(compacted, cloned)) {
      pendingCompactionNotifyRef.current = compacted;
    }
    workingLayoutRef.current = compacted;
    setWorkingLayout(compacted);
  }

  // Actually commits whatever `pendingUndoSnapshotRef` above queued —
  // deferred to an effect specifically because `commitUndoPoint` itself
  // mutates `historyRef`/`futureRef` (push/shift/reassignment), which
  // isn't safe to repeat if this component's render phase happens to
  // run more than once for the same commit (e.g. under React Strict
  // Mode's dev-only double-render behavior) — an effect only fires once
  // per actual commit, which mutation-based logic like this needs.
  // Also fires whatever `pendingCompactionNotifyRef` above queued — see
  // that ref's own doc comment for why `onLayoutChange` itself can't be
  // called synchronously from the render-phase sync block that sets it.
  useEffect(() => {
    if(pendingUndoSnapshotRef.current) {
      commitUndoPoint(pendingUndoSnapshotRef.current);
      pendingUndoSnapshotRef.current = null;
    }
    if(pendingCompactionNotifyRef.current) {
      onLayoutChange?.(pendingCompactionNotifyRef.current);
      pendingCompactionNotifyRef.current = null;
    }
  }, [workingLayout, commitUndoPoint, onLayoutChange]);

  // Prunes any selected id that no longer matches a real item — e.g.
  // after an external removal via the `layout` prop. Returns the same
  // `Set` reference (no state update at all) when nothing actually
  // needs pruning, so this doesn't cause an extra re-render on every
  // ordinary drag/resize tick, only when a selected item genuinely
  // disappears.
  useEffect(() => {
    setSelectedItemIds(prev => {
      if(prev.size === 0) {
        return prev;
      }
      const validIds = new Set(workingLayout.map(item => item.i));
      let changed = false;
      const next = new Set<string | number>();
      prev.forEach(id => {
        if(validIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // Same pruning rationale, applied to the range anchor: a Shift-click
    // range computed from an anchor that no longer matches a real item
    // would silently fall back to `computeRangeSelection`'s own
    // "anchor not found" case (just the target alone) — resetting it
    // here means the next Shift-click with no valid anchor instead
    // falls through to a plain select, the same well-defined "no
    // anchor yet" behavior a fresh grid starts with. Not itself state
    // (a ref), so this doesn't need its own separate effect/dependency
    // wiring — just checked alongside the identical `workingLayout`
    // dependency the selection-pruning check above already has.
    if(lastAnchorIdRef.current !== null && !workingLayout.some(item => item.i === lastAnchorIdRef.current)) {
      lastAnchorIdRef.current = null;
    }
  }, [workingLayout]);

  // `onSelectionChanged` (matching Vue's own `EGridLayoutEvent.
  // SELECTION_CHANGED`) — fires whenever `selectedItemIds` actually
  // changes, skipping the very first (mount) run via `hasMountedRef`
  // below: selection starts empty on mount, and nothing has genuinely
  // *changed* yet at that point, matching Vue's own "only on an actual
  // change" emission (its own selection composable emits inline at
  // each mutation site, never on initial setup).
  //
  // `onSelectionChanged` itself is deliberately read via a ref
  // (`onSelectionChangedRef`, kept in sync below) rather than being a
  // dependency of the effect that actually calls it — a real, confirmed
  // bug this fixes, not a defensive guard against a hypothetical: a
  // consumer passing an ordinary inline arrow function for this prop
  // (an idiomatic, extremely common React pattern, not something wrong
  // on their own part) gets a *new* function reference on every render
  // of *their own* component. If that effect's own dependency array had
  // included `onSelectionChanged` directly, and the callback itself
  // triggers a state update in the consumer (e.g. logging the event, as
  // this package's own demo app's `SelectionAndHistoryView` does) —
  // that update re-renders the consumer, producing a new inline
  // function, which the effect's own dependency comparison sees as
  // "changed," re-running the effect and calling the callback again
  // with the *same*, unchanged `selectedItemIds` — an infinite loop,
  // confirmed as the actual root cause of a real "onSelectionChanged
  // firing repeatedly with an empty array" report. The ref-based
  // pattern below calls whatever the *latest* callback is without ever
  // making the callback's own reference stability part of when the
  // effect re-runs at all — it now depends only on `selectedItemIds`
  // genuinely changing.
  const onSelectionChangedRef = useRef(onSelectionChanged);
  onSelectionChangedRef.current = onSelectionChanged;
  const hasMountedSelectionEffectRef = useRef(false);
  useEffect(() => {
    if(!hasMountedSelectionEffectRef.current) {
      hasMountedSelectionEffectRef.current = true;
      return;
    }
    onSelectionChangedRef.current?.(Array.from(selectedItemIds));
  }, [selectedItemIds]);

  /**
   * `onLayoutReady` (matching Vue's own `EGridLayoutEvent.LAYOUT_READY`)
   * — fires exactly once, the first time `hasMeasuredWidth` becomes
   * `true` (mount always starts `false`, so this effect's own initial
   * run never fires it; the *next* run, once the container-width
   * effect's own first successful measurement flips the flag, is the
   * only one that does). Passes `workingLayoutRef.current` as it stood
   * at that moment, matching Vue's own `props.layout` argument to the
   * same event.
   */
  useEffect(() => {
    if(hasMeasuredWidth) {
      onLayoutReady?.(workingLayoutRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed on `hasMeasuredWidth` alone (not `onLayoutReady`, which would fire this again on every render if the consumer passes a fresh inline function) — `hasMeasuredWidth` only ever transitions `false` -> `true` once, for the entire lifetime of this component, which is exactly the "exactly once" semantics `onLayoutReady` needs.
  }, [hasMeasuredWidth]);

  /**
   * `onColumnsChanged` (matching Vue's own `EGridLayoutEvent.
   * COLUMNS_CHANGED`) — fires with the new value whenever the
   * grid-wide `colNumProp` (the *raw* prop, not the `responsive`-
   * resolved `colNum`) itself changes, skipping the initial mount the
   * same way `onSelectionChanged` above does — Vue's own `watch()`
   * only fires on a genuine subsequent change, never for the prop's
   * own starting value.
   *
   * Same ref-based fix as `onSelectionChanged` above, for the identical
   * reason: `onColumnsChanged` read via a ref rather than being a
   * dependency of the effect itself, so an unstable inline callback
   * reference from the consumer can't retrigger this on its own.
   */
  const onColumnsChangedRef = useRef(onColumnsChanged);
  onColumnsChangedRef.current = onColumnsChanged;
  const hasMountedColNumEffectRef = useRef(false);
  useEffect(() => {
    if(!hasMountedColNumEffectRef.current) {
      hasMountedColNumEffectRef.current = true;
      return;
    }
    onColumnsChangedRef.current?.(colNumProp);
  }, [colNumProp]);

  useEffect(() => {
    const el = containerRef.current;
    /* v8 ignore next 3 -- `containerRef` is attached directly to this component's own root element with no conditional rendering in between; by the time an effect with an empty dependency array runs (after the initial commit), the ref is already populated. Not reachable through any normal render path, only by directly manipulating the internal ref (which isn't exposed) — kept as a defensive guard matching the same `!(ref instanceof HTMLElement)` pattern the Vue package's own composables use for the identical reason. */
    if(!el) {
      return undefined;
    }
    const measure = (): void => {
      if(el.offsetWidth > 0) {
        setContainerWidth(el.offsetWidth);
        setHasMeasuredWidth(true);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /**
   * `responsive`'s own breakpoint tracking — mirrors the Vue package's
   * own `useResponsiveLayout.ts` composable: recomputes the active
   * breakpoint from the measured `containerWidth` whenever it changes,
   * and on an actual breakpoint change (including the very first
   * successful measurement, since `currentBreakpoint` starts `null`),
   * hands the current layout off to `findOrGenerateResponsiveLayout` —
   * which bounds-corrects and compacts it for the new breakpoint's own
   * column count, reusing a cached layout for that breakpoint
   * (`responsiveLayouts`/`layoutsCacheRef`) if one already exists. A
   * complete no-op when `responsive` is off, so there's no cost to the
   * feature for a consumer who doesn't enable it.
   */
  useEffect(() => {
    if(!responsive || !hasMeasuredWidth) {
      return;
    }
    const newBreakpoint = getBreakpointFromWidth(breakpoints, containerWidth);
    if(newBreakpoint === currentBreakpoint) {
      return;
    }
    const newCols = getColsFromBreakpoint(newBreakpoint, cols);

    // Cache the breakpoint being left, so returning to it later restores
    // its own last-known state instead of regenerating from scratch —
    // same rationale as Vue's own `useResponsiveLayout.ts`.
    if(currentBreakpoint) {
      layoutsCacheRef.current = { ...layoutsCacheRef.current, [currentBreakpoint]: workingLayoutRef.current };
    }

    // `findOrGenerateResponsiveLayout` itself only ever *generates* (it
    // doesn't consult `layoutsCacheRef` internally at all, despite
    // taking it as a parameter — confirmed by reading its own source
    // rather than assuming) — checking the cache for the *incoming*
    // breakpoint here first is what actually makes a pre-defined
    // `responsiveLayouts` entry (or a previously-cached "was there
    // before" state) win outright instead of being silently
    // regenerated every time.
    const cachedForNewBreakpoint = layoutsCacheRef.current[newBreakpoint as keyof TResponsiveLayout];
    const nextLayout = cachedForNewBreakpoint
      ? cloneLayout(cachedForNewBreakpoint)
      : findOrGenerateResponsiveLayout(
        workingLayoutRef.current,
        layoutsCacheRef.current,
        breakpoints,
        newBreakpoint,
        currentBreakpoint ?? newBreakpoint,
        newCols,
        compactType,
        distributeEvenly,
      );

    layoutsCacheRef.current = { ...layoutsCacheRef.current, [newBreakpoint]: nextLayout };
    workingLayoutRef.current = nextLayout;
    setWorkingLayout(nextLayout);
    setCurrentBreakpoint(newBreakpoint);
    onLayoutChange?.(nextLayout);
    onBreakpointChange?.(newBreakpoint, newCols);
  }, [responsive, hasMeasuredWidth, containerWidth, breakpoints, cols, currentBreakpoint, compactType, distributeEvenly, onLayoutChange, onBreakpointChange]);

  const commitLayout = useCallback((next: TLayout, minPositions?: Record<string | number, { x?: number; y?: number }>): void => {
    const compacted = (compactor ?? getCompactor(compactType)).compact(next, colNum, { compactType, minPositions });
    workingLayoutRef.current = compacted;
    setWorkingLayout(compacted);
    onLayoutChange?.(compacted);
  }, [compactor, compactType, colNum, onLayoutChange]);

  /**
   * `allowCrossGridDrag`'s own accept-side: called when *another* grid's
   * item is dropped onto and accepted by *this* one. Finds a real
   * first-fit slot (`core`'s own `findFirstFitSlot` — not a naive "drop
   * at `y: Infinity`, let compaction sort it out" placement, which
   * can't jump over a static item blocking the column above an actual
   * gap; see that function's own doc comment) rather than trusting
   * whatever `x`/`y` the item had in its *source* grid, which has no
   * necessary relationship to a free spot in this one.
   */
  const acceptExternalCrossGridItem = useCallback((item: ILayoutItem): void => {
    const next = cloneLayout(workingLayoutRef.current);
    const slot = findFirstFitSlot(next, colNum, item.w, item.h);
    const { moved: _unusedMoved, ...rest } = item;
    next.push({ ...rest, x: slot.x, y: slot.y });
    commitLayout(next);
  }, [colNum, commitLayout]);

  const crossGridDrag = useCrossGridDrag({
    allowCrossGridDrag,
    containerRef,
    disableExternalDrop,
    layoutId,
    onAcceptExternalItem: acceptExternalCrossGridItem,
    onCrossGridDropRejected,
    onCrossGridItemDropped,
  });

  /**
   * Shared by `compactNow()` and `duplicateItem()` below — forces real
   * compaction even when `compactType` is `NONE`, matching the Vue
   * package's own `compactNow()` fix (see `IGridLayoutHandle`'s own
   * doc comment on `compactNow` for the full rationale). A custom
   * `compactor`, if set, is trusted to decide its own forced-tidy-up
   * behavior — the `compactType === NONE` override below only applies
   * to the *built-in* strategies `compactor` being unset falls back to.
   */
  const commitForcedCompaction = useCallback((next: TLayout): void => {
    const forcedType = compactType === ECompactType.NONE ? ECompactType.VERTICAL : compactType;
    const compacted = (compactor ?? getCompactor(forcedType)).compact(next, colNum, { compactType: forcedType });
    workingLayoutRef.current = compacted;
    setWorkingLayout(compacted);
    onLayoutChange?.(compacted);
  }, [compactor, compactType, colNum, onLayoutChange]);

  const compactNow = useCallback((): void => {
    commitUndoPoint(workingLayoutRef.current);
    commitForcedCompaction(cloneLayout(workingLayoutRef.current));
  }, [commitUndoPoint, commitForcedCompaction]);

  const rearrange = useCallback((): void => {
    compactNow();
  }, [compactNow]);

  const duplicateItem = useCallback((id: string | number): string | number | null => {
    const next = cloneLayout(workingLayoutRef.current);
    const source = getLayoutItem(next, id);
    if(!source) {
      return null;
    }

    let suffix = 1;
    let newId = `${id}-copy`;
    const existingIds = new Set(next.map(item => String(item.i)));
    while(existingIds.has(newId)) {
      suffix += 1;
      newId = `${id}-copy-${suffix}`;
    }

    commitUndoPoint(workingLayoutRef.current);
    const { i: _unusedId, moved: _unusedMoved, ...rest } = source;
    next.push({ ...rest, i: newId, y: source.y + source.h });
    commitForcedCompaction(next);

    return newId;
  }, [commitUndoPoint, commitForcedCompaction]);

  /**
   * Shared by `alignSelected`/`distributeSelected` below — applies a
   * computed `Map<id, { x?, y? }>` of adjustments to a fresh clone of
   * `workingLayoutRef.current`, then commits it through the normal
   * `commitLayout` path (compaction + `onLayoutChange`) once, same as
   * the Vue package's own `applyAlignDistributeAdjustments`.
   *
   * `preventCollision` guard: an adjustment that would land an item on
   * top of a *non-selected* item is skipped entirely for that one item
   * (the rest of the batch still applies) — colliding with another item
   * *also* being aligned/distributed isn't treated as a collision at
   * all here, since that's frequently the whole point of the command
   * (e.g. aligning three items to the same left edge necessarily
   * overlaps them along that edge until compaction resolves it).
   */
  const applyAlignDistributeAdjustments = useCallback((
    adjustments: Map<string | number, { x?: number; y?: number }>,
    selectedIds: (string | number)[],
  ): void => {
    if(adjustments.size === 0) {
      return;
    }

    const next = cloneLayout(workingLayoutRef.current);
    const selectedIdSet = new Set(selectedIds);

    commitUndoPoint(workingLayoutRef.current);

    adjustments.forEach((adjustment, id) => {
      const item = getLayoutItem(next, id);
      /* v8 ignore next 3 -- genuinely hard to reach in practice, not just untested: this component's own "prune any selected id that no longer matches a real item" effect (see its own declaration above) runs on every `workingLayout` change and flushes synchronously after any act()-wrapped render in tests, so a selectedId reaching this function while no longer corresponding to a real item would require calling alignSelected/distributeSelected in the exact same synchronous batch as the layout change that removed it — before that pruning effect has had a chance to run at all. Kept as a defensive guard (the invariant it protects against is real, even if the normal render/effect cycle makes it very hard to actually observe), same category as `findItemElement`'s own container-ref guard above. */
      if(!item) {
        return;
      }
      const candidate = { ...item, ...adjustment };
      if(preventCollision) {
        const collisions = getAllCollisions(next, candidate)
          .filter(layoutItem => layoutItem.i !== item.i && !selectedIdSet.has(layoutItem.i));
        if(collisions.length > 0) {
          return;
        }
      }
      if(adjustment.x !== undefined) {
        item.x = adjustment.x;
      }
      if(adjustment.y !== undefined) {
        item.y = adjustment.y;
      }
    });

    commitLayout(next);
  }, [preventCollision, commitUndoPoint, commitLayout]);

  /**
   * Aligns every currently-selected item (`multiSelect`) to the given
   * edge/center of the *anchor* — the first item the user actually
   * selected (a `Set`'s own insertion order), which itself never moves.
   * A no-op when fewer than 2 items are selected, including when
   * `multiSelect` is off entirely (selection is then always empty). See
   * `computeAlignAdjustments`'s own doc comment
   * (`@keystone-dashboard-layout/core`) for the exact per-edge/center
   * math — identical to the Vue package's own `alignSelected`, which
   * calls the same function.
   */
  const alignSelected = useCallback((edge: TAlignEdge): void => {
    const selectedIds = Array.from(selectedItemIds);
    const adjustments = computeAlignAdjustments(workingLayoutRef.current, selectedIds, edge);
    applyAlignDistributeAdjustments(adjustments, selectedIds);
  }, [selectedItemIds, applyAlignDistributeAdjustments]);

  /**
   * Evenly spaces the currently-selected items (`multiSelect`) along
   * the given axis — the two outermost selected items (by actual
   * position, not selection order) stay exactly where they are; only
   * the ones "in between" move to close any uneven gaps. A no-op with
   * fewer than 3 items selected. See `computeDistributeAdjustments`'s
   * own doc comment (`@keystone-dashboard-layout/core`) for the exact
   * spacing math — identical to the Vue package's own
   * `distributeSelected`.
   */
  const distributeSelected = useCallback((axis: TDistributeAxis): void => {
    const selectedIds = Array.from(selectedItemIds);
    const adjustments = computeDistributeAdjustments(workingLayoutRef.current, selectedIds, axis);
    applyAlignDistributeAdjustments(adjustments, selectedIds);
  }, [selectedItemIds, applyAlignDistributeAdjustments]);

  /**
   * Renders the current layout as a standalone SVG string via `core`'s
   * own `exportLayoutAsSvg` — pre-filled with this grid's own actual
   * `colNum`/`rowHeight`/`margin`/`containerWidth`, so a caller doesn't
   * need to re-supply values already known here; any field in
   * `options` still overrides the corresponding pre-filled one.
   */
  const exportLayoutAsSvg = useCallback((options?: IExportLayoutAsSvgOptions): string => {
    return coreExportLayoutAsSvg(workingLayoutRef.current, {
      colNum,
      containerWidth: effectiveContainerWidth,
      margin,
      rowHeight,
      ...options,
    });
  }, [colNum, effectiveContainerWidth, margin, rowHeight]);

  /**
   * Finds the DOM element for a given item id, scoped to this grid's
   * own container (`containerRef.current`) rather than a global
   * `document.querySelector` — matters for `allowCrossGridDrag`/
   * multi-grid pages, where more than one `GridLayout` on the same
   * page could otherwise have items sharing the same rendered
   * attribute value if a consumer reused an id across grids. Relies on
   * `data-grid-item-id` (set on `GridItem`'s own root element,
   * matching its `i` prop), matching the Vue package's own
   * `findItemElement`.
   */
  const findItemElement = useCallback((id: string | number): HTMLElement | null => {
    /* v8 ignore next 3 -- same class of genuinely-unreachable-in-practice guard as this file's own container-width-measurement effect above (see that one's comment for the full rationale) — `containerRef` is attached directly to this component's own root element with no conditional rendering in between, so by the time any callback using it can actually be invoked (post-mount), it's already populated. */
    if(!containerRef.current) {
      return null;
    }
    const idAsString = String(id);
    const candidates = containerRef.current.querySelectorAll<HTMLElement>(`[data-grid-item-id]`);
    return Array.from(candidates).find(el => el.getAttribute(`data-grid-item-id`) === idAsString) ?? null;
  }, []);

  /**
   * Scrolls the item with the given id into view, if it's currently
   * rendered — the React port of the Vue package's own `scrollToItem`.
   * Deferred via `setTimeout(0)`, matching Vue's own `nextTick()`
   * deferral for the identical reason: the documented use ("jump to
   * the widget you just added") calls this immediately after adding a
   * new item to a consumer's own `layout` state, in the same handler
   * — before that new item's element has actually committed to the DOM
   * yet. A no-op (not a throw) when the id doesn't match any rendered
   * item.
   */
  const scrollToItem = useCallback((id: string | number): Promise<void> => (
    new Promise(resolve => {
      setTimeout(() => {
        findItemElement(id)?.scrollIntoView({ behavior: `smooth`, block: `nearest`, inline: `nearest` });
        resolve();
      }, 0);
    })
  ), [findItemElement]);

  /** Moves keyboard focus to the item with the given id, if it's currently rendered and focusable — the React port of Vue's own `focusItem`. Same deferral/no-op rationale as `scrollToItem` above. */
  const focusItem = useCallback((id: string | number): Promise<void> => (
    new Promise(resolve => {
      setTimeout(() => {
        findItemElement(id)?.focus();
        resolve();
      }, 0);
    })
  ), [findItemElement]);

  const undo = useCallback((): void => {
    if(historyRef.current.length === 0) {
      return;
    }
    const previous = historyRef.current.pop()!;
    futureRef.current.push(cloneLayout(workingLayoutRef.current));
    workingLayoutRef.current = previous;
    setWorkingLayout(previous);
    onLayoutChange?.(previous);
    setUndoRedoVersion(version => version + 1);
  }, [onLayoutChange]);

  const redo = useCallback((): void => {
    if(futureRef.current.length === 0) {
      return;
    }
    const next = futureRef.current.pop()!;
    historyRef.current.push(cloneLayout(workingLayoutRef.current));
    workingLayoutRef.current = next;
    setWorkingLayout(next);
    onLayoutChange?.(next);
    setUndoRedoVersion(version => version + 1);
  }, [onLayoutChange]);

  const selectItem = useCallback((id: string | number): void => {
    setSelectedItemIds(prev => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const deselectItem = useCallback((id: string | number): void => {
    setSelectedItemIds(prev => {
      if(!prev.has(id)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleItemSelection = useCallback((id: string | number): void => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if(next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback((): void => {
    lastAnchorIdRef.current = null;
    setSelectedItemIds(prev => (prev.size === 0 ? prev : new Set()));
  }, []);

  /**
   * A click reported by a `GridItem`'s own root (`multiSelect` only —
   * see `GridItem.tsx`'s own click handler, which no-ops entirely when
   * `context.multiSelect` is off). A plain click selects the item
   * exclusively and re-anchors; Ctrl/Cmd toggles it within the existing
   * selection and re-anchors; Shift extends a contiguous range from
   * `lastAnchorIdRef` to this item (via `core`'s own
   * `computeRangeSelection`), *replacing* the current selection rather
   * than merging into it — matching the standard desktop convention,
   * and Vue's own identical `itemClickedHandler`. Falls back to a plain
   * select when there's no anchor yet (the very first click on a fresh
   * grid) — a range needs two ends to mean anything. Deliberately does
   * *not* update `lastAnchorIdRef` on a Shift-click itself, so repeated
   * Shift-clicks keep re-anchoring to the same fixed point rather than
   * compounding from the previous Shift-click target.
   */
  const handleItemClick = useCallback((id: string | number, modifiers: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }): void => {
    // Confirmed unreachable through any real click, not assumed:
    // GridItem.tsx's own handleClick already checks context.multiSelect
    // and returns early before ever calling context.onItemClick (this
    // function), so this can never actually run with multiSelect false
    // via a real interaction. Not exposed via ref either, so there's no
    // other call path to reach it through. Kept as a defensive guard —
    // same category as this file's own container-ref checks.
    /* v8 ignore next 3 -- see the comment above: unreachable since GridItem's own click handler already gates on multiSelect before ever calling this. */
    if(!multiSelect) {
      return;
    }
    if(modifiers.shiftKey && lastAnchorIdRef.current !== null) {
      const range = computeRangeSelection(workingLayoutRef.current, lastAnchorIdRef.current, id);
      setSelectedItemIds(new Set(range));
      return;
    }
    if(modifiers.shiftKey || modifiers.ctrlKey || modifiers.metaKey) {
      toggleItemSelection(id);
    } else {
      setSelectedItemIds(new Set([id]));
    }
    lastAnchorIdRef.current = id;
  }, [multiSelect, toggleItemSelection]);

  /** Clicking the grid's own empty background (not any item — `GridItem`'s own click handler stops propagation for a real item click) clears the selection, matching the Vue package's own `backgroundClickHandler`. */
  const handleBackgroundClick = useCallback((event: MouseEvent<HTMLDivElement>): void => {
    if(event.target === event.currentTarget) {
      clearSelection();
    }
  }, [clearSelection]);

  useImperativeHandle(ref, () => ({
    alignSelected,
    canRedo: futureRef.current.length > 0,
    canUndo: historyRef.current.length > 0,
    clearSelection,
    compactNow,
    deselectItem,
    distributeSelected,
    duplicateItem,
    exportLayoutAsSvg,
    focusItem,
    rearrange,
    redo,
    scrollToItem,
    selectedItems: Array.from(selectedItemIds),
    selectItem,
    toggleItemSelection,
    undo,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- undoRedoVersion is intentionally a dep despite not being read directly in the body: it's what forces this factory to recompute canUndo/canRedo after an undo-history-affecting action that didn't otherwise change any other dependency here (see undoRedoVersion's own declaration comment).
  }), [alignSelected, clearSelection, compactNow, deselectItem, distributeSelected, duplicateItem, exportLayoutAsSvg, focusItem, rearrange, redo, scrollToItem, selectedItemIds, selectItem, toggleItemSelection, undo, undoRedoVersion]);

  /**
   * Recomputes `alignmentGuideStyles`/`spacingIndicatorStyles` from an
   * in-progress drag/resize's live position/size against the rest of
   * `workingLayoutRef.current` — a no-op (for whichever of the two is
   * off) when neither `showAlignmentGuides` nor `showSpacingGuides` is
   * on, so there's no cost to either feature for a consumer who
   * doesn't enable it. Called from both `handleItemDrag` and
   * `handleItemResize`'s own start/move phases;
   * `clearGuidesAndIndicators` (below) handles the end phase for both.
   *
   * Pixel conversion mirrors the Vue package's own
   * `alignmentGuideStyles`/`spacingIndicatorStyles` computeds exactly
   * (same `position * (size + margin) + margin` formula used
   * everywhere else in this file/package for grid-unit -> pixel
   * conversion) — including the singular/plural label ternary and
   * using the *live* dragged-to `x`/`y`/`w`/`h` (passed in here
   * directly) for a spacing indicator's own cross-axis centering,
   * rather than a separate "placeholder" concept the way Vue's version
   * has one (not needed here: this package doesn't render a separate
   * placeholder `GridItem`, so the live values already in hand are the
   * whole picture).
   */
  const updateGuidesAndIndicators = useCallback((id: string | number, x: number, y: number, w: number, h: number): void => {
    const activeItem = { h, i: id, w, x, y };

    if(showAlignmentGuides) {
      const guides = findAlignmentGuides(workingLayoutRef.current, activeItem);
      if(guides.length === 0 || effectiveContainerWidth < 1) {
        setAlignmentGuideStyles([]);
      } else {
        const colWidth = calcColWidth(effectiveContainerWidth, margin[0], colNum);
        setAlignmentGuideStyles(guides.map(guide => (guide.axis === `x`
          ? { height: `100%`, left: `${guide.position * (colWidth + margin[0]) + margin[0]}px`, top: `0`, width: `1px` }
          : { height: `1px`, left: `0`, top: `${guide.position * (rowHeight + margin[1]) + margin[1]}px`, width: `100%` }
        )));
      }
    }

    if(showSpacingGuides) {
      const indicators = findSpacingIndicators(workingLayoutRef.current, activeItem);
      if(indicators.length === 0 || effectiveContainerWidth < 1) {
        setSpacingIndicatorStyles([]);
      } else {
        const colWidth = calcColWidth(effectiveContainerWidth, margin[0], colNum);
        setSpacingIndicatorStyles(indicators.map(indicator => {
          if(indicator.axis === `x`) {
            const startPx = indicator.gapStart * (colWidth + margin[0]) + margin[0];
            const endPx = indicator.gapEnd * (colWidth + margin[0]) + margin[0];
            const centerY = (y + h / 2) * (rowHeight + margin[1]) + margin[1];
            return {
              label: `${indicator.distance} col${indicator.distance === 1 ? `` : `s`}`,
              left: `${(startPx + endPx) / 2}px`,
              top: `${centerY}px`,
            };
          }
          const startPxY = indicator.gapStart * (rowHeight + margin[1]) + margin[1];
          const endPxY = indicator.gapEnd * (rowHeight + margin[1]) + margin[1];
          const centerX = (x + w / 2) * (colWidth + margin[0]) + margin[0];
          return {
            label: `${indicator.distance} row${indicator.distance === 1 ? `` : `s`}`,
            left: `${centerX}px`,
            top: `${(startPxY + endPxY) / 2}px`,
          };
        }));
      }
    }
  }, [showAlignmentGuides, showSpacingGuides, effectiveContainerWidth, margin, colNum, rowHeight]);

  const clearGuidesAndIndicators = useCallback((): void => {
    setAlignmentGuideStyles([]);
    setSpacingIndicatorStyles([]);
  }, []);

  /**
   * `multiSelect`'s group move: dragging a selected item while more
   * than one is selected moves every other selected item by the same
   * delta. Deliberately not collision-aware for passenger items (see
   * the Vue package's own scope note for this same design). Mutates
   * `next` (the same cloned layout `handleItemDrag` is about to pass
   * to `moveElement`/`commitLayout`) directly, rather than closing over
   * a copy of its own — taking `next` as a parameter, instead of a
   * value captured in this callback's own closure, is what makes that
   * possible without an awkward second clone.
   */
  const applyGroupMove = useCallback((next: TLayout, eventType: TGridGestureEventType, id: string | number, x: number, y: number): void => {
    if(!(multiSelect && selectedItemIds.has(id) && selectedItemIds.size > 1)) {
      return;
    }
    if(eventType === `dragstart`) {
      groupMoveStartPositions.current = new Map(
        Array.from(selectedItemIds, selectedId => {
          const selectedItem = getLayoutItem(next, selectedId);
          return [selectedId, { x: selectedItem?.x ?? 0, y: selectedItem?.y ?? 0 }];
        }),
      );
    } else if((eventType === `dragmove` || eventType === `dragend`) && groupMoveStartPositions.current.has(id)) {
      const anchorStart = groupMoveStartPositions.current.get(id)!;
      const dx = x - anchorStart.x;
      const dy = y - anchorStart.y;
      groupMoveStartPositions.current.forEach((startPos, passengerId) => {
        if(passengerId === id) {
          return;
        }
        const passenger = getLayoutItem(next, passengerId);
        if(passenger && !passenger.isStatic && passenger.isDraggable !== false) {
          passenger.x = Math.max(startPos.x + dx, 0);
          passenger.y = Math.max(startPos.y + dy, 0);
        }
      });
    }
  }, [multiSelect, selectedItemIds]);

  /** `multiSelect`'s group resize — same snapshot-and-apply-delta shape as `applyGroupMove` above, applied to `w`/`h` instead of `x`/`y`, additionally clamped to each passenger's own `minW`/`maxW`/`minH`/`maxH` (not just a hard floor of 1). */
  const applyGroupResize = useCallback((next: TLayout, eventType: TGridGestureEventType, id: string | number, w: number, h: number): void => {
    if(!(multiSelect && selectedItemIds.has(id) && selectedItemIds.size > 1)) {
      return;
    }
    if(eventType === `resizestart`) {
      groupResizeStartSizes.current = new Map(
        Array.from(selectedItemIds, selectedId => {
          const selectedItem = getLayoutItem(next, selectedId);
          return [selectedId, { h: selectedItem?.h ?? 1, w: selectedItem?.w ?? 1 }];
        }),
      );
    } else if((eventType === `resizemove` || eventType === `resizeend`) && groupResizeStartSizes.current.has(id)) {
      const anchorStart = groupResizeStartSizes.current.get(id)!;
      const dw = w - anchorStart.w;
      const dh = h - anchorStart.h;
      groupResizeStartSizes.current.forEach((startSize, passengerId) => {
        if(passengerId === id) {
          return;
        }
        const passenger = getLayoutItem(next, passengerId);
        if(passenger && !passenger.isStatic && passenger.isResizable !== false) {
          passenger.w = Math.min(Math.max(startSize.w + dw, passenger.minW ?? 1), passenger.maxW ?? Infinity);
          passenger.h = Math.min(Math.max(startSize.h + dh, passenger.minH ?? 1), passenger.maxH ?? Infinity);
        }
      });
    }
  }, [multiSelect, selectedItemIds]);

  const handleItemDrag = useCallback((id: string | number, eventType: TGridGestureEventType, x: number, y: number, w: number, h: number, clientX?: number, clientY?: number): void => {
    const next = cloneLayout(workingLayoutRef.current);
    const item = getLayoutItem(next, id);
    if(!item) {
      return;
    }

    if(eventType === `dragstart`) {
      commitUndoPoint(workingLayoutRef.current);
      crossGridDrag.handleDragStart(id);
      onDragStart?.(id);
      setIsAnyItemDragging(true);
      // `restoreOnDrag`'s own snapshot — every *other* item's own
      // pre-drag position on whichever axis `compactType` actually
      // compacts along (`y` for VERTICAL/NONE, `x` for HORIZONTAL; the
      // two `*_OVERLAP` types never consult `minPositions` at all, so
      // snapshotting either axis for them would be inert either way).
      if(restoreOnDrag) {
        const axis = compactType === ECompactType.HORIZONTAL ? `x` : `y`;
        dragMinPositionsRef.current = Object.fromEntries(
          next.filter(entry => entry.i !== id).map(entry => [entry.i, { [axis]: entry[axis] }]),
        );
      } else {
        dragMinPositionsRef.current = undefined;
      }
    }
    if(eventType === `dragmove`) {
      onDragMove?.(id);
    }
    // Confirmed unreachable, not assumed: eventType's own type is a
    // closed union of exactly dragstart/dragmove/dragend, and
    // useGridItemDrag.ts's own native handler has a "default: { return;
    // }" case that swallows anything else before ever calling onDrag
    // (this function) at all — there is no call path that reaches this
    // function with any fourth value for eventType. Restructured from
    // an if/else-if/else-if chain into three independent ifs (safe
    // here, since eventType can only ever equal one of the three at a
    // time either way) specifically so this ignore directive attaches
    // unambiguously to its own condition, rather than sharing an
    // else-if's own branch point with the preceding case the way v8's
    // own coverage instrumentation treats an else-if chain.
    /* v8 ignore next 3 -- see the comment above: unreachable since eventType can never be a fourth value the native handler would forward. */
    if(eventType === `dragend`) {
      onDragEnd?.(id);
    }

    if(eventType === `dragend` && crossGridDrag.handleDragEnd(id, clientX, clientY, item)) {
      // Accepted by another grid — the item no longer belongs to this
      // one at all: remove it and commit that, skipping the normal
      // moveElement/snap/group-move path entirely (there's nothing left
      // here to move).
      const withoutItem = next.filter(entry => entry.i !== id);
      clearGuidesAndIndicators();
      dragMinPositionsRef.current = undefined;
      setIsAnyItemDragging(false);
      setItemGesturePlaceholder(null);
      commitLayout(withoutItem);
      return;
    }

    // Magnetic snapping — changes where the item actually lands, unlike
    // the alignment guides below (visual only). Only meaningful during
    // an actual drag-in-progress phase, matching the Vue package's own
    // `applySnapToGridAdjustment` gating exactly (not `dragstart`,
    // where there's no drag delta yet to snap).
    let resolvedX = x;
    let resolvedY = y;
    if(snapToGrid && (eventType === `dragmove` || eventType === `dragend`)) {
      const adjustment = findSnapAdjustment(next, { h: item.h, i: id, w: item.w, x, y }, snapThreshold);
      if(adjustment.x !== undefined) {
        resolvedX = adjustment.x;
      }
      if(adjustment.y !== undefined) {
        resolvedY = adjustment.y;
      }
    }

    applyGroupMove(next, eventType, id, resolvedX, resolvedY);

    if(eventType === `dragend`) {
      clearGuidesAndIndicators();
    } else {
      updateGuidesAndIndicators(id, resolvedX, resolvedY, w, h);
    }

    // Regular in-grid drag placeholder — the React equivalent of Vue's
    // own #placeholder scoped slot rendering during any in-grid drag,
    // not just outside-drop (which `outsideDropPlaceholder` below
    // already covers separately). Uses the same, already-computed
    // `resolvedX`/`resolvedY` (post-snap, pre-collision-resolution) as
    // the "where is this drag currently heading" position — the same
    // value `moveElement` below is about to resolve against collisions.
    if(eventType === `dragstart` || eventType === `dragmove`) {
      setItemGesturePlaceholder({ h, w, x: resolvedX, y: resolvedY });
    }

    const preMoveX = item.x;
    const preMoveY = item.y;

    const moved = moveElement(next, item, resolvedX, resolvedY, true, horizontalShift, preventCollision);
    // `onMoveBlockedByCollision`: fires only when the move was
    // genuinely *attempted* (the target actually differs from where
    // the item already was) but `preventCollision` blocked it entirely
    // — `moveElement` resets `item.x`/`item.y` back to their pre-move
    // values when that happens, so comparing against what was captured
    // just before the call is the only way to tell “blocked” apart from
    // “never asked to move in the first place” (every drag tick where
    // the pointer briefly pauses over the item's own current cell would
    // otherwise look like a blocked move too). Matches the Vue
    // package's own `dragEvent`'s identical check.
    const movedItem = getLayoutItem(moved, id);
    if((resolvedX !== preMoveX || resolvedY !== preMoveY) && movedItem?.x === preMoveX && movedItem?.y === preMoveY) {
      onMoveBlockedByCollision?.(id);
    }
    const minPositionsForThisCommit = (eventType === `dragmove` || eventType === `dragend`) ? dragMinPositionsRef.current : undefined;
    commitLayout(moved, minPositionsForThisCommit);
    if(eventType === `dragend`) {
      dragMinPositionsRef.current = undefined;
      setIsAnyItemDragging(false);
      setItemGesturePlaceholder(null);
    }
  }, [commitUndoPoint, crossGridDrag, onDragStart, onDragMove, onDragEnd, onMoveBlockedByCollision, restoreOnDrag, compactType, clearGuidesAndIndicators, commitLayout, snapToGrid, snapThreshold, applyGroupMove, horizontalShift, preventCollision, updateGuidesAndIndicators]);

  const handleItemResize = useCallback((id: string | number, eventType: TGridGestureEventType, x: number, y: number, w: number, h: number): void => {
    const next = cloneLayout(workingLayoutRef.current);
    const item = getLayoutItem(next, id);
    if(!item) {
      return;
    }

    if(eventType === `resizestart`) {
      commitUndoPoint(workingLayoutRef.current);
    }

    let clampedW = w;
    let clampedH = h;
    if(preventCollision) {
      const collisions = getAllCollisions(next, { ...item, h, w }).filter(other => other.i !== item.i);
      if(collisions.length > 0) {
        let leastX = Infinity;
        let leastY = Infinity;
        collisions.forEach(other => {
          if(other.x > item.x) {
            leastX = Math.min(leastX, other.x);
          }
          if(other.y > item.y) {
            leastY = Math.min(leastY, other.y);
          }
        });
        if(Number.isFinite(leastX)) {
          clampedW = leastX - item.x;
        }
        if(Number.isFinite(leastY)) {
          clampedH = leastY - item.y;
        }
        // Matches Vue's own `applyResizeSizeAndCollisionClamp`: fires
        // whenever `preventCollision` clamped the requested size *at
        // all*, not only when it was fully blocked — unlike a drag, a
        // resize can still partially grow even while being clamped.
        onMoveBlockedByCollision?.(id);
      }
    }

    applyGroupResize(next, eventType, id, clampedW, clampedH);

    if(eventType === `resizeend`) {
      clearGuidesAndIndicators();
      setItemGesturePlaceholder(null);
    } else {
      updateGuidesAndIndicators(id, x, y, clampedW, clampedH);
      // Regular in-grid resize placeholder — same rationale as
      // handleItemDrag's own identical addition above. Uses the
      // resize's own in-progress x/y/w/h directly, matching the same
      // "where is this gesture currently heading" semantics.
      setItemGesturePlaceholder({ h: clampedH, w: clampedW, x, y });
    }

    item.w = clampedW;
    item.h = clampedH;
    item.x = x;
    item.y = y;
    commitLayout(next);
  }, [commitUndoPoint, preventCollision, onMoveBlockedByCollision, applyGroupResize, commitLayout, updateGuidesAndIndicators, clearGuidesAndIndicators]);

  const contextValue = useMemo(() => ({
    ariaLabels: resolvedAriaLabels,
    autoScroll,
    borderRadiusPx,
    colNum,
    containerWidth: effectiveContainerWidth,
    enableEditMode,
    isBounded,
    isDraggable,
    isMirrored,
    isResizable,
    layout: workingLayout,
    margin,
    maxRows,
    multiSelect,
    onItemClick: handleItemClick,
    onItemClose,
    onItemDrag: handleItemDrag,
    onItemResize: handleItemResize,
    preserveAspectRatio,
    preventCollision,
    resizeHandleColor,
    resizeHandles,
    rowHeight,
    selectedItemIds,
    showCloseButton,
    showResizeHandles,
    transformScale,
    useBorderRadius,
    useCssTransforms,
  }), [resolvedAriaLabels, autoScroll, borderRadiusPx, colNum, effectiveContainerWidth, enableEditMode, isBounded, isDraggable, isMirrored, isResizable, workingLayout, margin, maxRows, multiSelect, handleItemClick, onItemClose, handleItemDrag, handleItemResize, preserveAspectRatio, preventCollision, resizeHandleColor, resizeHandles, rowHeight, selectedItemIds, showCloseButton, showResizeHandles, transformScale, useBorderRadius, useCssTransforms]);

  /**
   * `allowOutsideDrop`: native HTML5 drag-and-drop from outside the
   * grid system entirely — distinct from `allowCrossGridDrag` above,
   * which drags an *existing* item between grids via the pointer-driven
   * engine, not the browser's native drag-and-drop API. Attached
   * directly as JSX props on the root `<div>` below (React exposes
   * `onDragEnter`/`onDragOver`/`onDragLeave`/`onDrop` as ordinary
   * synthetic event props) — simpler than Vue's own version, which
   * needs manual `addEventListener`/`removeEventListener` management
   * since Vue templates have no equivalent shorthand for native drag
   * events specifically.
   */
  const dragEnterCountRef = useRef(0);
  const [outsideDropPlaceholder, setOutsideDropPlaceholder] = useState<{ h: number; w: number; x: number; y: number } | null>(null);

  const outsideDropAccepted = useCallback((dataTransfer: DataTransfer | null): boolean => (
    outsideDropAccept ? outsideDropAccept(dataTransfer) : true
  ), [outsideDropAccept]);

  const outsideDropPositionFromEvent = useCallback((clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } => {
    const colWidth = calcColWidth(effectiveContainerWidth, margin[0], colNum);
    const left = clientX - rect.left;
    const top = clientY - rect.top;
    let x = Math.round((left - margin[0]) / (colWidth + margin[0]));
    let y = Math.round((top - margin[1]) / (rowHeight + margin[1]));
    x = Math.max(Math.min(x, colNum - outsideDropWidth), 0);
    y = Math.max(Math.min(y, maxRows - outsideDropHeight), 0);
    return { x, y };
  }, [effectiveContainerWidth, margin, colNum, rowHeight, maxRows, outsideDropWidth, outsideDropHeight]);

  /**
   * `dragenter`/`dragleave` bubble from every descendant element, firing
   * far more often than just "entered/left the grid as a whole" — an
   * enter-count (incremented on `dragenter`, decremented on
   * `dragleave`, treated as "actually left" only once it returns to
   * zero) is the standard workaround, matching the Vue package's own
   * identical fix — tracking net entries/exits rather than reacting to
   * every single bubble individually, which would otherwise flicker the
   * placeholder's visibility on and off repeatedly while the pointer
   * moves around inside the grid at any depth.
   */
  const handleOutsideDragEnter = useCallback((event: DragEvent<HTMLDivElement>): void => {
    if(!allowOutsideDrop || !outsideDropAccepted(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    dragEnterCountRef.current += 1;
  }, [allowOutsideDrop, outsideDropAccepted]);

  const handleOutsideDragOver = useCallback((event: DragEvent<HTMLDivElement>): void => {
    if(!allowOutsideDrop || !outsideDropAccepted(event.dataTransfer)) {
      return;
    }
    // Required per the HTML5 drag-and-drop spec: without preventDefault()
    // here, the browser never treats this element as a valid drop
    // target, and the native `drop` event below never fires.
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const { x, y } = outsideDropPositionFromEvent(event.clientX, event.clientY, rect);
    setOutsideDropPlaceholder({ h: outsideDropHeight, w: outsideDropWidth, x, y });
  }, [allowOutsideDrop, outsideDropAccepted, outsideDropPositionFromEvent, outsideDropWidth, outsideDropHeight]);

  const handleOutsideDragLeave = useCallback((event: DragEvent<HTMLDivElement>): void => {
    if(!allowOutsideDrop) {
      return;
    }
    event.preventDefault();
    dragEnterCountRef.current = Math.max(0, dragEnterCountRef.current - 1);
    if(dragEnterCountRef.current === 0) {
      setOutsideDropPlaceholder(null);
    }
  }, [allowOutsideDrop]);

  const handleOutsideDrop = useCallback((event: DragEvent<HTMLDivElement>): void => {
    if(!allowOutsideDrop || !outsideDropAccepted(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    dragEnterCountRef.current = 0;
    setOutsideDropPlaceholder(null);
    const rect = event.currentTarget.getBoundingClientRect();
    const { x, y } = outsideDropPositionFromEvent(event.clientX, event.clientY, rect);
    onOutsideDrop?.({ dataTransfer: event.dataTransfer, h: outsideDropHeight, w: outsideDropWidth, x, y });
  }, [allowOutsideDrop, outsideDropAccepted, outsideDropPositionFromEvent, outsideDropWidth, outsideDropHeight, onOutsideDrop]);

  const outsideDropPlaceholderStyle = useMemo((): CSSProperties | null => {
    if(!outsideDropPlaceholder) {
      return null;
    }
    const colWidth = calcColWidth(effectiveContainerWidth, margin[0], colNum);
    return {
      height: `${Math.round(rowHeight * outsideDropPlaceholder.h + Math.max(0, outsideDropPlaceholder.h - 1) * margin[1])}px`,
      left: `${Math.round(colWidth * outsideDropPlaceholder.x + (outsideDropPlaceholder.x + 1) * margin[0])}px`,
      top: `${Math.round(rowHeight * outsideDropPlaceholder.y + (outsideDropPlaceholder.y + 1) * margin[1])}px`,
      width: `${Math.round(colWidth * outsideDropPlaceholder.w + Math.max(0, outsideDropPlaceholder.w - 1) * margin[0])}px`,
    };
  }, [outsideDropPlaceholder, effectiveContainerWidth, margin, colNum, rowHeight]);

  /** Same pixel-conversion formula as `outsideDropPlaceholderStyle` above, applied to the regular in-grid drag/resize tracker instead. */
  const itemGesturePlaceholderStyle = useMemo((): CSSProperties | null => {
    if(!itemGesturePlaceholder) {
      return null;
    }
    const colWidth = calcColWidth(effectiveContainerWidth, margin[0], colNum);
    return {
      height: `${Math.round(rowHeight * itemGesturePlaceholder.h + Math.max(0, itemGesturePlaceholder.h - 1) * margin[1])}px`,
      left: `${Math.round(colWidth * itemGesturePlaceholder.x + (itemGesturePlaceholder.x + 1) * margin[0])}px`,
      top: `${Math.round(rowHeight * itemGesturePlaceholder.y + (itemGesturePlaceholder.y + 1) * margin[1])}px`,
      width: `${Math.round(colWidth * itemGesturePlaceholder.w + Math.max(0, itemGesturePlaceholder.w - 1) * margin[0])}px`,
    };
  }, [itemGesturePlaceholder, effectiveContainerWidth, margin, colNum, rowHeight]);

  /**
   * Unifies `itemGesturePlaceholder` (regular in-grid drag/resize) and
   * `outsideDropPlaceholder` (native HTML5 drag-and-drop) into a single
   * active placeholder + style pair, since the two are mutually
   * exclusive — a native outside-drop and a pointer-driven in-grid
   * gesture can't both be in progress on the same grid at the same
   * time. Feeds `renderPlaceholder` (when provided) with the same
   * `(placeholder, isDragging)` shape regardless of which of the two
   * gesture types is actually active.
   */
  const activePlaceholder = itemGesturePlaceholder ?? outsideDropPlaceholder;
  const activePlaceholderStyle = itemGesturePlaceholderStyle ?? outsideDropPlaceholderStyle;

  /**
   * `heightMode`'s own precedence rule: an explicit `heightMode` always
   * wins outright; `null` (its own default) defers entirely to
   * `autoSize` instead — see that prop's own doc comment.
   */
  const resolvedHeightMode = heightMode !== null ? heightMode : (autoSize ? `auto` : `fixed`);

  let containerHeight: string | undefined;
  switch(resolvedHeightMode) {
    case `auto`: {
      containerHeight = `${getBottomYCoordinate(workingLayout) * (rowHeight + margin[1]) + margin[1]}px`;
      break;
    }
    case `fit`: {
      containerHeight = `100%`;
      break;
    }
    default: {
      containerHeight = undefined;
      break;
    }
  }
  const containerOverflow = resolvedHeightMode === `scroll` || resolvedHeightMode === `fit` ? `auto` : undefined;

  const gridLinesStyle = useMemo(() => {
    if(!showGridLines || effectiveContainerWidth < 1) {
      return {};
    }
    const colWidth = calcColWidth(effectiveContainerWidth, margin[0], colNum);
    return {
      '--kdl-grid-line-column-size': `${colWidth + margin[0]}px`,
      '--kdl-grid-line-row-size': `${rowHeight + margin[1]}px`,
    } as Record<string, string>;
  }, [showGridLines, effectiveContainerWidth, margin, colNum, rowHeight]);

  /**
   * `transitionDurationMs`/`transitionTimingFunction`: applied as CSS
   * custom properties on the root element, inherited naturally by
   * every `GridItem` underneath (`styles/index.css`'s own
   * `.kdl-grid-item` transition rule reads these with a fallback,
   * so a consumer never setting either prop sees byte-identical
   * output to the previously-hardcoded values). No context/GridItem
   * plumbing needed at all — CSS custom properties already inherit
   * through the DOM on their own.
   */
  const transitionStyle = useMemo(() => ({
    '--kdl-transition-duration': `${transitionDurationMs}ms`,
    '--kdl-transition-timing': transitionTimingFunction,
  } as Record<string, string>), [transitionDurationMs, transitionTimingFunction]);

  const classNames = [
    `kdl-grid-layout`,
    showGridLines && `kdl-grid-layout--grid-lines`,
    isAnyItemDragging && `kdl-grid-layout--active-drag`,
    className,
  ].filter(Boolean).join(` `);

  // When any item's own minW/maxW pushed `effectiveContainerWidth` away
  // from the raw measured `containerWidth` (see that memo's own doc
  // comment), the actual grid content needs to render at that wider or
  // narrower pixel width rather than the 100%-of-parent width this
  // root element gets by default — an inner wrapper carries the
  // explicit width so `GridItem`'s own pixel math (reading
  // `context.containerWidth`, already switched to `effectiveContainerWidth`
  // above) lines up with what's actually rendered. `overflow-x: auto`
  // on the outer root only when genuinely wider than the real available
  // space (never for the narrower/maxW-driven case, which has nothing
  // to scroll to) turns that mismatch into a real horizontal scrollbar
  // instead of clipped or visually broken content.
  const needsWidthWrapper = effectiveContainerWidth !== containerWidth;
  const needsHorizontalScroll = effectiveContainerWidth > containerWidth;

  const gridContent = (
    <>
      <GridContext.Provider value={contextValue}>
        {children}
      </GridContext.Provider>
      {alignmentGuideStyles.map((guide, index) => (
        // eslint-disable-next-line react/no-array-index-key -- guides have no stable identity of their own (recomputed wholesale on every tick, not diffed/matched across renders), so index is the correct key here, same as the Vue package's own `:key="`alignment-guide-${index}`"`.
        <div key={index} className="kdl-grid-alignment-guide" style={guide as CSSProperties} />
      ))}
      {spacingIndicatorStyles.map((indicator, index) => (
        // eslint-disable-next-line react/no-array-index-key -- same rationale as the alignment guides above.
        <div key={index} className="kdl-grid-spacing-indicator" style={{ left: indicator.left, top: indicator.top }}>
          {indicator.label}
        </div>
      ))}
      {outsideDropPlaceholderStyle && !renderPlaceholder && (
        <div className="kdl-grid-outside-drop-placeholder" style={outsideDropPlaceholderStyle} />
      )}
      {itemGesturePlaceholderStyle && !renderPlaceholder && (
        <div className="kdl-grid-placeholder" style={itemGesturePlaceholderStyle} />
      )}
      {renderPlaceholder && activePlaceholderStyle && (
        <div style={activePlaceholderStyle}>
          {renderPlaceholder(activePlaceholder, activePlaceholder !== null)}
        </div>
      )}
    </>
  );

  return (
    <div
      ref={containerRef}
      className={classNames}
      onClick={handleBackgroundClick}
      onDragEnter={handleOutsideDragEnter}
      onDragLeave={handleOutsideDragLeave}
      onDragOver={handleOutsideDragOver}
      onDrop={handleOutsideDrop}
      style={{ height: containerHeight, overflowX: needsHorizontalScroll ? `auto` : undefined, overflowY: containerOverflow, position: `relative`, ...gridLinesStyle, ...transitionStyle }}
    >
      {needsWidthWrapper ? (
        // height matches whatever the outer root resolved to (a real px
        // value, or `undefined` for `heightMode: 'fixed'`, where a
        // hardcoded '100%' here would collapse to zero against a
        // parent with no explicit height of its own) -- GridItem's own
        // absolute positioning doesn't actually depend on this wrapper
        // having a meaningful height either way, but matching the
        // outer's own resolution is more correct than assuming one.
        <div style={{ height: containerHeight ?? `auto`, position: `relative`, width: `${effectiveContainerWidth}px` }}>
          {gridContent}
        </div>
      ) : gridContent}
    </div>
  );
});

GridLayout.displayName = `GridLayout`;
