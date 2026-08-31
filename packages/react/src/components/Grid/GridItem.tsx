import { useEffect, useId, useMemo, useRef } from 'react';
import type { CSSProperties, JSX, KeyboardEvent, MouseEvent } from 'react';
import { resolveAriaLabels, setTopLeft, setTopRight, setTransform, setTransformRtl } from '@keystone-dashboard-layout/core';
import type { IGridItemProps } from './grid-item-props.interface';
import { useGridContext } from './grid-context';
import { useGridItemDrag } from './hooks/useGridItemDrag';
import { useGridItemResize } from './hooks/useGridItemResize';

/** One grid unit per keypress, in both axes — matches the smallest unit the mouse-driven path can produce, and keeps a single keypress predictable. Same as the Vue package's own `useGridItemKeyboard.ts`. */
const KEYBOARD_STEP = 1;

/** Phase 11's own default `dragIgnoreFrom` — matches Vue's own default exactly, so a `<button>`/`<a>` rendered inside a `GridItem`'s own `children` doesn't accidentally start a drag when clicked, unless a consumer explicitly opts out via an empty-string `dragIgnoreFrom` override. */
const DEFAULT_DRAG_IGNORE_FROM = `a, button`;

/** Arrow key -> `[dx, dy]` in *physical* (screen-space) direction — `handleKeyDown` below flips `dx`'s sign under `isMirrored`, since increasing grid-unit `x` moves an item toward the visual right in LTR but toward the visual left in RTL. */
const ARROW_KEY_DELTAS: Record<string, [number, number]> = {
  ArrowDown: [0, KEYBOARD_STEP],
  ArrowLeft: [-KEYBOARD_STEP, 0],
  ArrowRight: [KEYBOARD_STEP, 0],
  ArrowUp: [0, -KEYBOARD_STEP],
};

/**
 * A single draggable/resizable/static grid cell, rendered inside a
 * `GridLayout`'s children. The React port of Vue's own `GridItem.vue`
 * — see that file's own doc comment for the fuller architectural
 * picture this mirrors (composable-per-concern split, native
 * pointer-driven drag/resize engine). Position, size, and
 * `isDraggable`/`isResizable`/`isStatic`/`minW`/`maxW`/`minH`/`maxH`/
 * `zIndex`/`showCloseButton`/`autoScroll`/`preserveAspectRatio`/
 * `ariaLabels`/`enableEditMode`/`isBounded`/`resizeHandles`/
 * `isMirrored` all come from the matching `ILayoutItem` entry in
 * `GridLayout`'s own `layout` array (read via `useGridContext()`), not
 * from props on this component itself — see
 * `grid-item-props.interface.ts`'s own doc comment for why (`header`/
 * `renderResizeHandle` are the deliberate exception, being genuinely
 * per-instance content rather than layout data — see that same
 * comment).
 *
 * `enableEditMode` (Phase 13): a per-item override on top of
 * `GridLayout`'s own grid-wide master interactivity switch — resolved
 * once (`resolvedEnableEditMode`) and folded into
 * `resolvedDraggable`/`resolvedResizable`/`resolvedShowCloseButton`
 * below, rather than checked separately at each of drag/resize/close —
 * so keyboard move/resize (`handleKeyDown`, which already gates on
 * those same two resolved booleans) is blocked automatically too,
 * without needing its own separate `enableEditMode` check.
 *
 * `resizeHandles`/`isMirrored`/`isBounded` (Phase 14): per-item
 * overrides layered on top of the matching grid-wide default, the
 * exact same `item.xxx ?? context.xxx` shape `showCloseButton`/
 * `autoScroll`/`preserveAspectRatio`/`ariaLabels` already established.
 * `isMirrored` is the one exception in *direction* (not shape): the
 * per-item default is `true` — "participate in the parent's
 * mirroring" — so opting out takes an explicit `false`, and the
 * resolved value is `context.isMirrored && (item.isMirrored ?? true)`
 * (an item can never mirror on its own if the grid itself isn't
 * mirrored at all).
 *
 * Keyboard alternative to mouse-driven dragging/resizing (Phase 9,
 * ported from Vue's own `useGridItemKeyboard.ts`): focus a draggable/
 * resizable, non-static item and arrow keys move it by one grid unit;
 * Shift+arrow keys resize it by one grid unit. Each keypress is treated
 * as a single, atomic, already-"ended" gesture — it calls
 * `context.onItemDrag`/`onItemResize` with a synthetic `dragstart`
 * immediately followed by `dragend` (or `resizestart`/`resizeend`), the
 * same two calls a real mouse gesture's start and release would
 * produce, so `GridLayout`'s own compaction/collision/`multiSelect`
 * group-move handling applies identically regardless of which input
 * method triggered the change (a keyboard move of a selected item, for
 * instance, needs the synthetic `dragstart` for `multiSelect`'s own
 * group-move snapshot to have anything to snapshot at all).
 */
export function GridItem({ i, header, children, renderResizeHandle, onItemMoved, onItemResized, className }: IGridItemProps): JSX.Element {
  const context = useGridContext();
  const item = context.layout.find(entry => entry.i === i);

  const rootRef = useRef<HTMLDivElement>(null);
  const instructionsId = useId();

  if(!item) {
    throw new Error(`GridItem: no layout entry found for i="${String(i)}".`);
  }

  const isStatic = Boolean(item.isStatic);
  const resolvedEnableEditMode = item.enableEditMode ?? context.enableEditMode;
  const resolvedDraggable = (item.isDraggable ?? context.isDraggable) && resolvedEnableEditMode && !isStatic;
  const resolvedResizable = (item.isResizable ?? context.isResizable) && resolvedEnableEditMode && !isStatic;
  const resolvedShowCloseButton = (item.showCloseButton ?? context.showCloseButton) && resolvedEnableEditMode;
  const resolvedAutoScroll = item.autoScroll ?? context.autoScroll;
  const resolvedPreserveAspectRatio = item.preserveAspectRatio ?? context.preserveAspectRatio;
  const resolvedIsBounded = item.isBounded ?? context.isBounded;
  const resolvedUseBorderRadius = item.useBorderRadius ?? context.useBorderRadius;
  const resolvedBorderRadiusPx = item.borderRadiusPx ?? context.borderRadiusPx;
  const resolvedShowResizeHandles = item.showResizeHandles ?? context.showResizeHandles;
  const resolvedResizeHandleColor = item.resizeHandleColor ?? context.resizeHandleColor;
  // No grid-wide default at all — Vue's own version has none either,
  // only a per-item `GridItem` prop (confirmed by reading `GridItem.vue`
  // directly during this phase, not assumed).
  const resolvedAutoHeight = item.autoHeight ?? false;
  // `item.isMirrored`'s own default is `true` ("participate"), unlike
  // every other per-item override in this file — see this component's
  // own doc comment above for why this can never be `true` when the
  // grid itself isn't mirrored at all.
  const resolvedIsMirrored = context.isMirrored && (item.isMirrored ?? true);
  // Phase 11 — none of these four have a grid-wide default at all in
  // Vue's own version either (confirmed in `docs/PARITY_GAP_VUE.md`'s
  // own verification pass), so there's no `context.xxx` fallback to
  // read here, unlike every other resolved field above/below.
  const resolvedDragAllowFrom = item.dragAllowFrom ?? null;
  const resolvedDragIgnoreFrom = item.dragIgnoreFrom ?? DEFAULT_DRAG_IGNORE_FROM;
  const resolvedResizeIgnoreFrom = item.resizeIgnoreFrom ?? null;
  const resolvedDragActivationDistance = item.dragActivationDistance ?? null;
  const isSelected = context.selectedItemIds.has(i);
  const minW = item.minW ?? 1;
  const maxW = item.maxW ?? Infinity;
  const minH = item.minH ?? 1;
  const maxH = item.maxH ?? Infinity;
  const draggableOrResizableAndNotStatic = (resolvedDraggable || resolvedResizable) && !isStatic;
  // `context.ariaLabels` is already merged with the built-in English
  // defaults and the grid-wide `ariaLabels` prop (see `GridLayout.tsx`)
  // — this is the final, per-item layer on top of that, matching the
  // Vue package's own three-layer `resolveAriaLabels` resolution
  // exactly (built-in defaults <- grid-wide <- per-item).
  const resolvedAriaLabels = useMemo(
    () => resolveAriaLabels(context.ariaLabels, item.ariaLabels),
    [context.ariaLabels, item.ariaLabels],
  );
  // Only the edges/corners actually present in the resolved
  // `resizeHandles` set render/activate at all — same "GridItem only
  // wires up refs it finds present, nothing hardcodes which to expect"
  // shape as the Vue package's own `tryMakeResizable()`. `??`, not
  // `||`: an empty array (`[]`) is a deliberate, valid "no
  // handle-driven resize for this item" value, distinct from
  // `isResizable: false` — `||` would treat `[]` as falsy and
  // incorrectly fall through to the grid-wide default instead.
  const resolvedResizeHandleEdges = item.resizeHandles ?? context.resizeHandles;

  const { dragging, isDragging } = useGridItemDrag(rootRef, {
    activationDistance: resolvedDragActivationDistance,
    allowFrom: resolvedDragAllowFrom,
    autoScroll: resolvedAutoScroll,
    containerWidth: context.containerWidth,
    cols: context.colNum,
    enabled: resolvedDraggable,
    h: item.h,
    i,
    ignoreFrom: resolvedDragIgnoreFrom,
    innerX: item.x,
    innerY: item.y,
    isBounded: resolvedIsBounded,
    isMirrored: resolvedIsMirrored,
    margin: context.margin,
    maxRows: context.maxRows,
    onDrag: context.onItemDrag,
    onItemMoved,
    rowHeight: context.rowHeight,
    transformScale: context.transformScale,
    w: item.w,
  });

  /**
   * `autoHeight` (Phase 19): a `ResizeObserver` on the dedicated wrapper
   * rendered around `children` below, only when `resolvedAutoHeight` is
   * on — matching Vue's own `setupAutoHeight()`/`teardownAutoHeight()`
   * lifecycle exactly, just expressed as a `useEffect` (React's own
   * mechanism for "run once the real DOM node exists, clean up on
   * unmount/dependency change") rather than Vue's manual
   * `onMounted`/`onBeforeUnmount` pair. Re-runs whenever
   * `resolvedAutoHeight` itself toggles, so turning it off tears the
   * observer down (the wrapper element also stops rendering at that
   * point, per the JSX below) and turning it back on sets up a fresh
   * one against the newly-rendered wrapper.
   */
  const autoHeightWrapperRef = useRef<HTMLDivElement>(null);

  const { calcPosition, autoSize, handleRefs, isResizing, resizing } = useGridItemResize(rootRef, {
    autoScroll: resolvedAutoScroll,
    containerWidth: context.containerWidth,
    cols: context.colNum,
    enabled: resolvedResizable,
    h: item.h,
    i,
    ignoreFrom: resolvedResizeIgnoreFrom,
    innerX: item.x,
    innerY: item.y,
    isMirrored: resolvedIsMirrored,
    margin: context.margin,
    maxH,
    maxRows: context.maxRows,
    maxW,
    minH,
    minW,
    onResize: context.onItemResize,
    onItemResized,
    preserveAspectRatio: resolvedPreserveAspectRatio,
    resizeHandles: resolvedResizeHandleEdges,
    rowHeight: context.rowHeight,
    transformScale: context.transformScale,
    w: item.w,
  });

  useEffect(() => {
    if(!resolvedAutoHeight) {
      return undefined;
    }
    const wrapper = autoHeightWrapperRef.current;
    /* v8 ignore next 3 -- same class of genuinely-unreachable-in-practice guard as GridLayout.tsx's own container-ref check; see that file's comment for the full rationale — the wrapper is only ever conditionally *absent* from the JSX when `resolvedAutoHeight` is false, in which case this effect already returned above. */
    if(!wrapper) {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      autoSize(wrapper);
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [resolvedAutoHeight, autoSize]);

  /**
   * Bug fix: `context.containerWidth`/`context.margin`/`context.colNum`/
   * `context.rowHeight` are in this `useMemo`'s own dependency array
   * below specifically because `calcPosition` (from `useGridItemResize`)
   * reads all four internally via its own `optionsRef` — a deliberately
   * *stable* function reference (`useCallback(..., [])`, same ref-based
   * pattern `useGridItemDrag.ts`'s own `calcXY` uses) that always reads
   * the *latest* values when called, but whose own identity never
   * changes across renders. That combination is exactly what caused a
   * real, confirmed bug: since `calcPosition`'s reference never changes,
   * and none of it, `item.x`/`y`/`w`/`h`, or the gesture-state fields
   * below are themselves affected by `containerWidth` correcting itself
   * from its own seed value (`100`, see `GridLayout.tsx`'s own comment
   * on this) to the real, measured width — this `useMemo` never
   * recomputed when that correction landed. The *only* reason a mounted
   * item's position ever visibly corrected itself at all was a
   * completed drag/resize gesture happening to also flip
   * `isDragging`/`dragging` (or `isResizing`/`resizing`), which *are*
   * tracked here, forcing a recompute that finally read the by-then-
   * already-updated `containerWidth` through `calcPosition`'s own ref —
   * meaning any item that was never dragged or resized stayed rendered
   * at the wrong position indefinitely. Confirmed directly via a real,
   * reproduced e2e failure: an item's own settled position measured
   * ~56px before any interaction and ~439px (its real, correct
   * position) immediately after a drag gesture with zero net movement —
   * a discrepancy no amount of waiting before the first measurement
   * ever closed, since the stale value was a missing-dependency bug,
   * not a timing race.
   */
  const style = useMemo<CSSProperties>(() => {
    const pos = calcPosition(item.x, item.y, item.w, item.h);

    if(isResizing && resizing) {
      pos.top = resizing.top;
      pos.width = resizing.width;
      pos.height = resizing.height;
      // Left/top-edge resizes move the item's own anchor point too, not
      // just its size — only the anchor `calcPosition` itself resolved
      // to (`right` under RTL, `left` otherwise) is ever populated on
      // `resizing`, so reading the other one here would silently stay
      // `undefined` forever; matches Vue's own `createStyle()` branch.
      //
      // Confirmed unreachable that resizing.right/left can ever be
      // undefined here, not assumed: useGridItemResize.ts's own
      // `calcPosition()` always computes both `top` and `right`-or-
      // `left` unconditionally from the item's current x/y/w/h,
      // regardless of which edges are actually being dragged, and
      // `resizingRef.current` (the source of `resizing`) is only ever
      // set together with `isResizing` (both at resizestart, both
      // cleared at resizeend) — so by the time isResizing is true
      // here, resizing already has whichever anchor this render
      // direction needs. Kept as defensive guards — the same reasoning
      // as the Vue package's own identical `useGridItemResize.ts` gap
      // — rather than removed.
      if(resolvedIsMirrored) {
        /* v8 ignore next 3 -- see the comment above: resizing.right is always set by calcPosition() while isResizing is true. */
        if(resizing.right !== undefined) {
          pos.right = resizing.right;
        }
      }
      if(!resolvedIsMirrored) {
        /* v8 ignore next 3 -- see the comment above: resizing.left is always set by calcPosition() while isResizing is true. */
        if(resizing.left !== undefined) {
          pos.left = resizing.left;
        }
      }
    } else if(isDragging && dragging) {
      pos.top = dragging.top;
      // `dragging.left` always holds the value (RTL-negated or not —
      // see `useGridItemDrag.ts`'s own doc comment), regardless of
      // direction; it's this assignment, not the hook itself, that
      // decides whether that value becomes CSS `left` or `right`.
      if(resolvedIsMirrored) {
        pos.right = dragging.left;
      } else {
        pos.left = dragging.left;
      }
    }

    const styleFn = resolvedIsMirrored
      ? (context.useCssTransforms ? setTransformRtl : setTopRight)
      : (context.useCssTransforms ? setTransform : setTopLeft);
    const anchor = resolvedIsMirrored ? Number(pos.right) : Number(pos.left);
    const baseStyle = styleFn(pos.top, anchor, pos.width, pos.height) as unknown as CSSProperties;
    // An explicit per-item zIndex always wins over the CSS-class-based
    // static/dragging/resizing defaults — same override rule as the
    // Vue package's own `zIndex` prop.
    const withZIndex = item.zIndex != null ? { ...baseStyle, zIndex: item.zIndex } : baseStyle;
    // `useBorderRadius`/`borderRadiusPx`: a plain numeric inline style,
    // not a CSS custom property (unlike `transitionDurationMs`/
    // `transitionTimingFunction` in `GridLayout.tsx`) — there's no
    // grid-wide-inheritance benefit to gain from a custom property
    // here, since the resolved value is already fully computed per-item
    // in JS either way, same reasoning as `zIndex` itself.
    const withBorderRadius = resolvedUseBorderRadius ? { ...withZIndex, borderRadius: `${resolvedBorderRadiusPx}px` } : withZIndex;
    // `resizeHandleColor`: unlike `borderRadius` above, this genuinely
    // benefits from being a CSS custom property rather than a plain
    // inline style — `styles/index.css`'s own `.kdl-grid-item--show-
    // resize-handles .kdl-resize-hint` rule reads it with a fallback,
    // so setting it here has no visible effect at all unless that class
    // is also present (see `classNames` below).
    return resolvedShowResizeHandles
      ? { ...withBorderRadius, [`--kdl-resize-handle-color`]: resolvedResizeHandleColor }
      : withBorderRadius;
  }, [calcPosition, item.x, item.y, item.w, item.h, item.zIndex, isResizing, resizing, isDragging, dragging, context.useCssTransforms, context.containerWidth, context.margin, context.colNum, context.rowHeight, resolvedIsMirrored, resolvedUseBorderRadius, resolvedBorderRadiusPx, resolvedShowResizeHandles, resolvedResizeHandleColor]);

  const classNames = [
    `kdl-grid-item`,
    header != null && `kdl-grid-item--has-header`,
    isStatic && `kdl-grid-item--static`,
    resolvedDraggable && `kdl-grid-item--draggable`,
    isDragging && `kdl-grid-item--dragging`,
    isResizing && `kdl-grid-item--resizing`,
    isSelected && `kdl-grid-item--selected`,
    resolvedIsMirrored && `kdl-grid-item--rtl`,
    resolvedShowResizeHandles && `kdl-grid-item--show-resize-handles`,
    className,
  ].filter(Boolean).join(` `);

  /**
   * `autoHeight` (Phase 19): wraps `children` in a dedicated element
   * with `height: auto` (see `styles/index.css`'s own
   * `.kdl-grid-item-auto-height-wrapper` rule) so it can actually grow
   * past the item's own current fixed height — unlike the item's own
   * root element, whose height the grid's own layout math controls
   * directly. This is the element the `ResizeObserver` above actually
   * observes; `children` rendered unwrapped (the `false` branch) has no
   * such stable, dedicated node to observe at all. Matches Vue's own
   * `v-if="props.autoHeight"` wrapper exactly, applied identically
   * whether or not `header` is also present.
   */
  const contentNode = resolvedAutoHeight ? (
    <div ref={autoHeightWrapperRef} className="kdl-grid-item-auto-height-wrapper">
      {children}
    </div>
  ) : children;

  /**
   * `multiSelect` click handling — a no-op entirely when
   * `context.multiSelect` is off, so this doesn't interfere with a
   * plain click on a non-multiSelect grid at all. `stopPropagation()`
   * is what keeps a real item click from also bubbling up to
   * `GridLayout`'s own `handleBackgroundClick`, which would otherwise
   * immediately clear the selection this same click just set.
   */
  const handleClick = (event: MouseEvent<HTMLDivElement>): void => {
    if(!context.multiSelect) {
      return;
    }
    event.stopPropagation();
    context.onItemClick(i, { ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey });
  };

  /**
   * Keyboard alternative to a mouse-driven drag/resize — see this
   * component's own doc comment above for the full rationale. Ignores
   * (and doesn't call `preventDefault`) any key other than the plain or
   * Shift-modified arrows, and passes through untouched whenever Ctrl/
   * Alt/Meta is held alongside an arrow key — those commonly drive OS/
   * browser/assistive-technology shortcuts (virtual desktop switching,
   * screen reader navigation, etc.) this should never interfere with.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if(isStatic || (event.ctrlKey || event.altKey || event.metaKey)) {
      return;
    }
    const delta = ARROW_KEY_DELTAS[event.key];
    if(!delta) {
      return;
    }

    const [rawDx, dy] = delta;
    const dx = resolvedIsMirrored ? -rawDx : rawDx;

    if(event.shiftKey) {
      if(!resolvedResizable) {
        return;
      }
      event.preventDefault();
      let w = Math.max(Math.min(item.w + dx, context.colNum - item.x, maxW), minW);
      let h = Math.max(Math.min(item.h + dy, context.maxRows - item.y, maxH), minH);
      w = Math.max(w, 1);
      h = Math.max(h, 1);
      if(w === item.w && h === item.h) {
        return;
      }
      context.onItemResize(i, `resizestart`, item.x, item.y, item.w, item.h);
      context.onItemResize(i, `resizeend`, item.x, item.y, w, h);
    } else {
      if(!resolvedDraggable) {
        return;
      }
      event.preventDefault();
      const x = Math.max(Math.min(item.x + dx, context.colNum - item.w), 0);
      const y = Math.max(Math.min(item.y + dy, context.maxRows - item.h), 0);
      if(x === item.x && y === item.y) {
        return;
      }
      context.onItemDrag(i, `dragstart`, item.x, item.y, item.w, item.h);
      context.onItemDrag(i, `dragend`, x, y, item.w, item.h);
    }
  };

  return (
    <div
      ref={rootRef}
      aria-describedby={draggableOrResizableAndNotStatic ? instructionsId : undefined}
      aria-roledescription={draggableOrResizableAndNotStatic ? resolvedAriaLabels.itemRoleDescription : undefined}
      className={classNames}
      data-grid-item-id={String(i)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={draggableOrResizableAndNotStatic ? `group` : undefined}
      style={style}
      tabIndex={draggableOrResizableAndNotStatic ? 0 : undefined}
    >
      {header != null ? (
        <>
          <div className="kdl-grid-item-header">{header}</div>
          <div className="kdl-grid-item-body">{contentNode}</div>
        </>
      ) : contentNode}
      {draggableOrResizableAndNotStatic && (
        <span className="kdl-visually-hidden" id={instructionsId}>
          {resolvedDraggable ? resolvedAriaLabels.moveInstruction : ``}
          {` `}
          {resolvedResizable ? resolvedAriaLabels.resizeInstruction : ``}
        </span>
      )}
      {resolvedShowCloseButton && (
        <button
          aria-label={resolvedAriaLabels.closeButton}
          className="kdl-grid-item-close-button"
          onClick={event => {
            event.stopPropagation();
            context.onItemClose?.(i);
          }}
          type="button"
        >
          ×
        </button>
      )}
      {resolvedResizable && resolvedResizeHandleEdges.map(edge => (
        <span
          key={edge}
          ref={handleRefs[edge]}
          aria-hidden="true"
          className={`kdl-resize-hint kdl-resize-hint--${edge}`}
        >
          {renderResizeHandle?.(edge)}
        </span>
      ))}
    </div>
  );
}
