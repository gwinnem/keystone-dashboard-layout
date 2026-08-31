import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
  calcColWidth,
  createCoreData,
  createNativeAutoScroll,
  createNativeResizable,
  offsetXYFromParentOf,
  RESIZE_EDGE_MAP,
} from '@keystone-dashboard-layout/core';
import type {
  ICalcWh,
  IGridItemPosition,
  IInteractEdges,
  INativeResizeEvent,
  TResizeHandle,
} from '@keystone-dashboard-layout/core';
import type { TGridGestureEventType } from '../grid-context';

export interface IUseGridItemResizeOptions {
  autoScroll: boolean;
  containerWidth: number;
  cols: number;
  enabled: boolean;
  h: number;
  i: string | number;
  ignoreFrom?: string | null;
  innerX: number;
  innerY: number;
  isMirrored: boolean;
  margin: [number, number];
  maxH: number;
  maxRows: number;
  maxW: number;
  minH: number;
  minW: number;
  onResize: (id: string | number, eventType: TGridGestureEventType, x: number, y: number, w: number, h: number) => void;
  /**
   * Fired directly on `resizeend`, with this item's own final grid-unit
   * `h`/`w` *and* pixel `height`/`width` together — the React port of
   * Vue's own `GridItem` `@resized`. Optional and purely additive:
   * unset, this hook's own behavior is completely unaffected. See
   * `IGridItemProps.onItemResized`'s own doc comment for the full
   * rationale.
   */
  onItemResized?: (payload: { i: string | number; h: number; w: number; height: number; width: number }) => void;
  preserveAspectRatio: boolean;
  /**
   * The currently-resolved set of resize-hint edges/corners actually
   * rendered by GridItem (its own `resolvedResizeHandleEdges`) — read
   * here specifically so the native-resizable-wiring effect below can
   * depend on it changing, not just for options.current's own general
   * read-latest-values purpose every other field here serves. See that
   * effect's own doc comment for why a plain `options.resizeHandles`
   * read via `optionsRef` (the pattern every *other* field in this
   * hook already uses) can't work for this one specifically.
   */
  resizeHandles: TResizeHandle[];
  rowHeight: number;
  transformScale: number;
  w: number;
}

export interface IUseGridItemResizeReturn {
  /** Converts grid-unit x/y/w/h into pixel position+size — shared with `GridItem`'s own style computation, same role Vue's own `calcPosition` (returned from `useGridItemResize.ts`) serves for `createStyle()`. RTL-aware: returns `right` instead of `left` when `isMirrored`, matching Vue's own branch exactly. */
  calcPosition: (x: number, y: number, w: number, h: number) => IGridItemPosition;
  /**
   * `autoHeight`'s own backing implementation (Phase 19) — measures
   * `wrapperElement`'s own real pixel size (via
   * `getBoundingClientRect()`) and, if that converts to a different
   * grid-unit `w`/`h` than the item's own current committed size,
   * reports it as a single `resizeend`-style commit (no synthetic
   * `resizestart`/`resizemove` ticks at all — this isn't a pointer
   * gesture). Matches Vue's own `autoSize()` exactly, including its one
   * asymmetry: height rounds *up* (`Math.ceil`), not to the nearest
   * unit, specifically so a growing content element is never clipped
   * by a downward rounding; width still rounds normally. A no-op if
   * `autoHeight` itself is off, so calling this unconditionally from a
   * `ResizeObserver` that only ever observes the wrapper when
   * `autoHeight` is already on is harmless either way.
   */
  autoSize: (wrapperElement: HTMLElement) => void;
  handleRefs: Record<TResizeHandle, RefObject<HTMLSpanElement | null>>;
  isResizing: boolean;
  resizing: IGridItemPosition | undefined;
}

/**
 * The React port of Vue's own `useGridItemResize.ts` composable — same
 * grid-unit math (`calcPosition`/`calcWH`/`pixelsToGridX`/
 * `pixelsToGridY`), same native pointer-driven engine
 * (`createNativeResizable`, shared via `@keystone-dashboard-layout/core`).
 * See `useGridItemDrag.ts`'s own doc comment for why a `ref` (not just
 * `useState`) holds the live pixel size during a gesture.
 *
 * `isMirrored` (RTL): unlike drag (see `useGridItemDrag.ts`'s own doc
 * comment on this), resize genuinely stores the anchor under a
 * *different* field (`right` instead of `left`) when mirrored — matching
 * `calcPosition`'s own RTL branch — since which physical edge anchors a
 * resize (and so which edge's own drag moves that anchor at all) itself
 * flips under RTL: dragging the right edge grows/shrinks width with the
 * anchor untouched in LTR, but *is* the anchor-moving edge in RTL, and
 * vice versa for the left edge (see the `edges.right`/`edges.left`
 * handling in `resizemove` below — ported line-for-line from Vue's own
 * `handleResize`, including its own comment explaining exactly this).
 *
 * `resizeIgnoreFrom` (Phase 11): forwarded straight into
 * `createNativeResizable`'s own `getOptions()` result below — the
 * actual selector-matching happens inside `native-interaction.ts`
 * itself, same "no new logic in this hook" shape as
 * `useGridItemDrag.ts`'s own `dragAllowFrom`/`dragIgnoreFrom`.
 *
 * `transformScale` (Phase 16): same rationale as
 * `useGridItemDrag.ts`'s own doc comment on this — only `resizemove`'s
 * own `dx`/`dy` delta needs dividing by `transformScale`, not
 * `resizestart`'s absolute `calcPosition()`-derived read.
 *
 * Deliberately narrower than the Vue version for this initial React
 * port: no restricted `resizeHandles` per-item override yet (grid-wide
 * only) — see `packages/react/README.md` for the full scope note.
 */
export function useGridItemResize(rootRef: RefObject<HTMLDivElement | null>, options: IUseGridItemResizeOptions): IUseGridItemResizeReturn {
  const [isResizing, setIsResizing] = useState(false);
  const [resizing, setResizing] = useState<IGridItemPosition | undefined>(undefined);

  const resizingRef = useRef<IGridItemPosition | undefined>(undefined);
  const edgesRef = useRef<IInteractEdges>({ bottom: false, left: false, right: false, top: false });
  const aspectRatioRef = useRef<number | undefined>(undefined);
  const lastW = useRef(NaN);
  const lastH = useRef(NaN);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Same "lazy ref init" rationale as `useGridItemDrag.ts`'s own copy of
  // this pattern.
  const autoScrollRef = useRef<ReturnType<typeof createNativeAutoScroll> | null>(null);
  if(!autoScrollRef.current) {
    autoScrollRef.current = createNativeAutoScroll();
  }

  // One useRef per edge/corner — can't loop hooks, so each of the 8 is
  // declared individually, then assembled into the record GridItem
  // actually consumes (attaching `ref={handleRefs.n}` etc. to each of
  // its 8 resize-hint spans).
  const nRef = useRef<HTMLSpanElement>(null);
  const sRef = useRef<HTMLSpanElement>(null);
  const eRef = useRef<HTMLSpanElement>(null);
  const wRef = useRef<HTMLSpanElement>(null);
  const neRef = useRef<HTMLSpanElement>(null);
  const nwRef = useRef<HTMLSpanElement>(null);
  const seRef = useRef<HTMLSpanElement>(null);
  const swRef = useRef<HTMLSpanElement>(null);
  const handleRefs = useMemo<Record<TResizeHandle, RefObject<HTMLSpanElement | null>>>(() => ({
    e: eRef,
    n: nRef,
    ne: neRef,
    nw: nwRef,
    s: sRef,
    se: seRef,
    sw: swRef,
    w: wRef,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const calcPosition = useCallback((x: number, y: number, w: number, h: number): IGridItemPosition => {
    const { containerWidth, margin, cols, rowHeight, isMirrored } = optionsRef.current;
    const colWidth = calcColWidth(containerWidth, margin[0], cols);
    /* v8 ignore next -- the `=== Infinity` special case (an item that fills the rest of its row/column) is untestable through GridLayout's own render pipeline as currently built: `GridLayout` clones every layout via `cloneLayout()` (a JSON round-trip, in `@keystone-dashboard-layout/core`) on every state update, and `JSON.stringify(Infinity)` serializes to `null` — silently corrupting an `Infinity` h/w to `null` before it would ever reach this function. This is a genuine, separate, pre-existing gap shared with the Vue package (both use the same `cloneLayout`), not something a test here can route around; flagged rather than covered with a misleading test. */
    const height = h === Infinity ? h : Math.round(rowHeight * h + Math.max(0, h - 1) * margin[1]);
    /* v8 ignore next -- same Infinity/cloneLayout limitation as `height` above — not adjacent to it, so needs its own ignore comment rather than one "next N" covering both. */
    const width = w === Infinity ? w : Math.round(colWidth * w + Math.max(0, w - 1) * margin[0]);
    const top = Math.round(rowHeight * y + (y + 1) * margin[1]);
    const horizontal = Math.round(colWidth * x + (x + 1) * margin[0]);
    return isMirrored
      ? { height, right: horizontal, top, width }
      : { height, left: horizontal, top, width };
  }, []);

  const calcWH = useCallback((height: number, width: number, autoSizeFlag: boolean = false): ICalcWh => {
    const { containerWidth, margin, cols, rowHeight, innerX, innerY, maxRows } = optionsRef.current;
    const colWidth = calcColWidth(containerWidth, margin[0], cols);
    let w = Math.round((width + margin[0]) / (colWidth + margin[0]));
    // `autoHeight`'s own `autoSize()` (Phase 19) passes `autoSizeFlag`,
    // rounding height *up* instead of to the nearest unit — matching
    // Vue's own `calcWH` exactly, so a content element that's grown
    // slightly taller than an exact row-height multiple lands on the
    // next full row rather than getting rounded down and clipped. Width
    // is unaffected either way (this prop is about height specifically).
    const h = autoSizeFlag
      ? Math.ceil((height + margin[1]) / (rowHeight + margin[1]))
      : Math.round((height + margin[1]) / (rowHeight + margin[1]));
    w = Math.max(Math.min(w, cols - innerX), 0);
    const clampedH = Math.max(Math.min(h, maxRows - innerY), 0);
    return { h: clampedH, w };
  }, []);

  const pixelsToGridX = useCallback((leftPx: number, newW: number): number => {
    const { containerWidth, margin, cols } = optionsRef.current;
    const colWidth = calcColWidth(containerWidth, margin[0], cols);
    let gridX = Math.round((leftPx - margin[0]) / (colWidth + margin[0]));
    gridX = Math.max(Math.min(gridX, cols - newW), 0);
    return gridX;
  }, []);

  const pixelsToGridY = useCallback((topPx: number, newH: number): number => {
    const { margin, rowHeight, maxRows } = optionsRef.current;
    let gridY = Math.round((topPx - margin[1]) / (rowHeight + margin[1]));
    gridY = Math.max(Math.min(gridY, maxRows - newH), 0);
    return gridY;
  }, []);

  /**
   * `autoHeight`'s own backing implementation (Phase 19) — see this
   * hook's own `IUseGridItemResizeReturn.autoSize` doc comment above
   * for the full behavior. Ported directly from Vue's own `autoSize()`
   * — including reading `minW`/`maxW`/`minH`/`maxH`/a hard floor of 1
   * the exact same way `handleResize`'s own end-of-gesture clamping
   * does, and comparing the result against the item's own *current*
   * `w`/`h` (not a separately-tracked "previous" value) to decide
   * whether anything actually changed — confirmed by reading Vue's own
   * `previousW`/`previousH` handling closely rather than assumed: they're
   * set to `innerW`/`innerH` at the very top of `autoSize()`, then
   * compared against the freshly computed size at the very end with
   * nothing mutating `innerW`/`innerH` in between, making that
   * comparison equivalent to comparing directly against the current
   * `w`/`h` — so there's no need for a second, separately-tracked ref
   * here to get the same result.
   */
  const autoSize = useCallback((wrapperElement: HTMLElement): void => {
    const { i, innerX, innerY, minW, maxW, minH, maxH, onResize, w: currentW, h: currentH } = optionsRef.current;
    const rect = wrapperElement.getBoundingClientRect();
    const measured = calcWH(rect.height, rect.width, true);
    let newW = measured.w;
    let newH = measured.h;
    if(newW < minW) {
      newW = minW;
    }
    if(newW > maxW) {
      newW = maxW;
    }
    if(newH < minH) {
      newH = minH;
    }
    if(newH > maxH) {
      newH = maxH;
    }
    if(newH < 1) {
      newH = 1;
    }
    if(newW < 1) {
      newW = 1;
    }
    if(newW !== currentW || newH !== currentH) {
      onResize(i, `resizeend`, innerX, innerY, newW, newH);
    }
  }, [calcWH]);

  const handleResize = useCallback((event: INativeResizeEvent): void => {
    const { h, i, innerX, innerY, minW, maxW, minH, maxH, onResize, onItemResized, transformScale, w, isMirrored, preserveAspectRatio, autoScroll } = optionsRef.current;

    const position = offsetXYFromParentOf(event);
    const { x, y } = position;

    const newSize: { height: number; horizontal?: number; top?: number; width: number } = { height: 0, width: 0 };
    let pos: (IGridItemPosition | ICalcWh) & { h?: number; w?: number };

    switch(event.type) {
      case `resizestart`: {
        pos = calcPosition(innerX, innerY, w, h);
        resizingRef.current = { ...pos };
        setResizing(resizingRef.current);
        setIsResizing(true);
        edgesRef.current = event.edges;
        aspectRatioRef.current = pos.height > 0 ? pos.width / pos.height : undefined;
        lastW.current = x;
        lastH.current = y;
        if(autoScroll) {
          autoScrollRef.current?.start(event.target);
        }
        onResize(i, event.type, innerX, innerY, w, h);
        return;
      }
      case `resizemove`: {
        const coreEvent = createCoreData(lastW.current, lastH.current, x, y);
        // Phase 16 — see this hook's own doc comment above for why only
        // the delta needs dividing by `transformScale`.
        const dx = coreEvent.deltaX / transformScale;
        const dy = coreEvent.deltaY / transformScale;
        const prevHorizontal = Number(isMirrored ? resizingRef.current?.right : resizingRef.current?.left);
        const prevTop = Number(resizingRef.current?.top);
        const prevWidth = Number(resizingRef.current?.width);
        const prevHeight = Number(resizingRef.current?.height);

        newSize.width = prevWidth;
        newSize.height = prevHeight;
        newSize.horizontal = prevHorizontal;
        newSize.top = prevTop;

        const edges = edgesRef.current;
        // Which physical edge moves the anchor depends on RTL — see this
        // hook's own doc comment above for the full explanation; ported
        // line-for-line from Vue's own `handleResize`.
        if(edges.right) {
          newSize.width = prevWidth + dx;
          if(isMirrored) {
            newSize.horizontal = prevHorizontal - dx;
          }
        }
        if(edges.left) {
          newSize.width = prevWidth - dx;
          if(!isMirrored) {
            newSize.horizontal = prevHorizontal + dx;
          }
        }
        if(edges.bottom) {
          newSize.height = prevHeight + dy;
        }
        if(edges.top) {
          newSize.height = prevHeight - dy;
          newSize.top = prevTop + dy;
        }

        // preserveAspectRatio — derives whichever dimension isn't
        // directly driven by the edge(s) in this gesture from the one
        // that is, using the ratio captured at resizestart. Ported
        // line-for-line from Vue's own `handleResize`.
        if(preserveAspectRatio && aspectRatioRef.current) {
          const drivingWidth = edges.left || edges.right;
          const drivingHeight = edges.top || edges.bottom;
          if(drivingWidth && !drivingHeight) {
            newSize.height = newSize.width / aspectRatioRef.current;
          } else if(drivingHeight && !drivingWidth) {
            newSize.width = newSize.height * aspectRatioRef.current;
          } else if(drivingWidth && drivingHeight) {
            const derivedHeight = newSize.width / aspectRatioRef.current;
            if(edges.top) {
              newSize.top = prevTop + (prevHeight - derivedHeight);
            }
            newSize.height = derivedHeight;
          }
        }

        if(autoScroll) {
          autoScrollRef.current?.update(event.clientX, event.clientY);
        }

        resizingRef.current = {
          ...resizingRef.current,
          height: newSize.height,
          top: newSize.top,
          width: newSize.width,
          ...(isMirrored ? { right: newSize.horizontal } : { left: newSize.horizontal }),
        } as IGridItemPosition;
        setResizing(resizingRef.current);
        break;
      }
      case `resizeend`: {
        newSize.width = Number(resizingRef.current?.width);
        newSize.height = Number(resizingRef.current?.height);
        newSize.top = Number(resizingRef.current?.top);
        newSize.horizontal = Number(isMirrored ? resizingRef.current?.right : resizingRef.current?.left);
        resizingRef.current = undefined;
        setResizing(undefined);
        setIsResizing(false);
        aspectRatioRef.current = undefined;
        autoScrollRef.current?.stop();
        break;
      }
      default: {
        return;
      }
    }

    pos = calcWH(newSize.height, newSize.width);
    if(pos.w < minW) {
      pos.w = minW;
    }
    if(pos.w > maxW) {
      pos.w = maxW;
    }
    if(pos.h < minH) {
      pos.h = minH;
    }
    if(pos.h > maxH) {
      pos.h = maxH;
    }
    if(pos.h < 1) {
      pos.h = 1;
    }
    if(pos.w < 1) {
      pos.w = 1;
    }

    let newX = innerX;
    let newY = innerY;
    const edges = edgesRef.current;
    const horizontalAnchorEdge = isMirrored ? edges.right : edges.left;
    if(horizontalAnchorEdge && newSize.horizontal !== undefined) {
      newX = pixelsToGridX(newSize.horizontal, pos.w);
    }
    if(edges.top && newSize.top !== undefined) {
      newY = pixelsToGridY(newSize.top, pos.h);
    }

    lastW.current = x;
    lastH.current = y;

    if(event.type === `resizeend`) {
      onItemResized?.({ h: pos.h, height: newSize.height, i, w: pos.w, width: newSize.width });
    }

    onResize(i, event.type, newX, newY, pos.w, pos.h);
  }, [calcPosition, calcWH, pixelsToGridX, pixelsToGridY]);

  // A plain, per-render value (not read via optionsRef) — deliberately
  // NOT the raw `options.resizeHandles` array itself as the wiring
  // effect's own dependency below: arrays are a new reference on every
  // render regardless of whether their contents actually changed,
  // which would make that effect re-run (and needlessly tear down/
  // recreate the native resize engine) on every single render, not
  // just when the resolved handle set genuinely changes. A joined
  // string is stable across renders unless the actual content differs
  // — the same fix already applied in the Angular package's own
  // GridItemComponent (`lastResolvedResizeHandlesKey`), for the
  // identical underlying bug.
  const resolvedResizeHandlesKey = options.resizeHandles.join(`,`);

  useEffect(() => {
    const root = rootRef.current;
    /* v8 ignore next 3 -- same class of genuinely-unreachable-in-practice guard as GridLayout.tsx's own container-ref check; see that file's comment for the full rationale. */
    if(!root) {
      return undefined;
    }

    const handleEls: Partial<Record<TResizeHandle, HTMLElement>> = {};
    (Object.keys(RESIZE_EDGE_MAP) as TResizeHandle[]).forEach(key => {
      const el = handleRefs[key].current;
      if(el) {
        handleEls[key] = el;
      }
    });
    if(Object.keys(handleEls).length === 0) {
      return undefined;
    }

    const native = createNativeResizable(
      root,
      handleEls,
      () => ({ enabled: optionsRef.current.enabled, ignoreFrom: optionsRef.current.ignoreFrom }),
      handleResize,
    );
    return () => {
      native.destroy();
    };
    // Real, confirmed bug fix, not a stylistic dependency-list change:
    // this effect reads each handle's own current ref value once, at
    // whatever moment it runs, and wires createNativeResizable() to
    // exactly that snapshot. Before `resolvedResizeHandlesKey` existed
    // here, this effect's own dependency array ([handleResize,
    // handleRefs, rootRef]) never actually changed across the lifetime
    // of a mounted GridItem — handleRefs is a useMemo(..., []) whose
    // own reference never changes, and handleResize/rootRef are
    // similarly stable — so this effect only ever ran once, at mount.
    // A handle that starts absent from `resizeHandles` (its own <span>
    // never rendered, so its ref stays null at that first read) and is
    // enabled later gets a real, correctly-positioned <span> the moment
    // GridItem's own render includes it — but this effect never re-ran
    // to attach a pointer listener to that newly-rendered element,
    // leaving it visually present and inert. `resolvedResizeHandlesKey`
    // (a joined string, not the raw array — arrays are a new reference
    // every render regardless of content, which would defeat the whole
    // point of a dependency check) is what makes this effect correctly
    // re-run and re-wire whenever the actual *set* of rendered handles
    // changes, not just at mount. Confirmed as a real, reachable bug
    // via a live e2e run enabling a previously-disabled handle and
    // dragging it — not a hypothetical found by inspection alone.
  }, [handleResize, handleRefs, rootRef, resolvedResizeHandlesKey]);

  return { autoSize, calcPosition, handleRefs, isResizing, resizing };
}
