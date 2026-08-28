import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
  calcColWidth,
  calcGridItemWH,
  clamp,
  createCoreData,
  createNativeAutoScroll,
  createNativeDraggable,
  offsetXYFromParentOf,
} from '@keystone-dashboard-layout/core';
import type { ICalcXy, IGridItemPosition, INativeDragEvent, TDragActivationDistance } from '@keystone-dashboard-layout/core';
import type { TGridGestureEventType } from '../grid-context';

/**
 * Everything `useGridItemDrag` needs on every render — read through a
 * ref (see `optionsRef` below), not as a `useCallback`/`useEffect`
 * dependency array, so the native engine's own stable `pointerdown`
 * listener (attached once, per `native-interaction.ts`'s own
 * "configure once, read live state via `getOptions()`" design) always
 * sees current values without needing to be re-attached whenever any
 * of them changes mid-session — the same problem Vue's own reactive
 * `ref`s solve for free via closures, that a plain React hook needs an
 * explicit mechanism for instead.
 */
export interface IUseGridItemDragOptions {
  activationDistance?: TDragActivationDistance | null;
  allowFrom?: string | null;
  autoScroll: boolean;
  containerWidth: number;
  cols: number;
  enabled: boolean;
  h: number;
  i: string | number;
  ignoreFrom?: string | null;
  innerX: number;
  innerY: number;
  isBounded: boolean;
  isMirrored: boolean;
  margin: [number, number];
  maxRows: number;
  onDrag: (id: string | number, eventType: TGridGestureEventType, x: number, y: number, w: number, h: number, clientX?: number, clientY?: number) => void;
  /**
   * Fired directly on `dragend`, with this item's own final grid-unit
   * `x`/`y` — the React port of Vue's own `GridItem` `@item-moved`.
   * Optional and purely additive: unset, this hook's own behavior is
   * completely unaffected. See `IGridItemProps.onItemMoved`'s own doc
   * comment for the full rationale (pre-compaction value, not a
   * replacement for `GridLayout`'s own `onLayoutChange`).
   */
  onItemMoved?: (payload: { i: string | number; x: number; y: number }) => void;
  rowHeight: number;
  transformScale: number;
  w: number;
}

export interface IUseGridItemDragReturn {
  dragging: IGridItemPosition | undefined;
  isDragging: boolean;
}

/**
 * The React port of Vue's own `useGridItemDrag.ts` composable — same
 * grid-unit math (`calcXY`), same native pointer-driven engine
 * (`createNativeDraggable`, shared via `@keystone-dashboard-layout/core`
 * since it's already framework-agnostic), adapted to React's hook
 * model: a `ref` (not a Vue `ref`) holds the live pixel position during
 * a gesture so `handleDrag` can read/write it synchronously within a
 * single native-engine callback (state alone can't do this — a
 * `setState` call's new value isn't available until the next render),
 * mirrored into `useState` alongside it purely so `GridItem` re-renders
 * with the latest position on every tick.
 *
 * `isMirrored` (RTL): `dragging.left` always holds the *value* Vue's own
 * composable computes it as — for RTL, a negated distance from the
 * *right* edge, still stored under the field name `left` (matching
 * Vue's own `dragging.value.left` exactly, even in RTL) — it's
 * `GridItem.tsx`'s own style computation that decides whether this
 * value becomes CSS `left` or `right`, not this hook. `calcXY`'s own
 * math is unaffected by RTL either way: it just converts whatever pixel
 * value `dragging.left` already holds back to a grid-unit `x`,
 * regardless of which physical edge that pixel value was measured from.
 *
 * `transformScale` (Phase 16): a scaled ancestor makes a real N-pixel
 * pointer movement correspond to N/`transformScale` unscaled CSS
 * pixels in the item's own coordinate space (the space its `left`/
 * `top`/`transform` style actually operates in, underneath the
 * ancestor's own scale) — dividing `dragmove`'s own delta by
 * `transformScale` before adding it to the running position is what
 * corrects for this, so the item's own *visual* movement matches the
 * pointer's, regardless of the ancestor's scale. Only the *delta*
 * needs this: `dragstart`'s own initial position read
 * (`getBoundingClientRect()`-based) already reflects the real,
 * on-screen (post-scale) position directly, with nothing to divide out
 * of a single absolute read the way a delta needs.
 *
 * `dragAllowFrom`/`dragIgnoreFrom`/`dragActivationDistance` (Phase 11):
 * forwarded straight into `createNativeDraggable`'s own `getOptions()`
 * result below — `passesDragFilters()`/`resolveActivationDistance()`
 * inside `native-interaction.ts` already implement the actual
 * selector-matching/threshold-resolution logic; this hook does no work
 * beyond reading the resolved values off `optionsRef.current` and
 * passing them through.
 *
 * Deliberately narrower than the Vue version for this initial React
 * port: see `packages/react/README.md` for the full scope note.
 */
export function useGridItemDrag(rootRef: RefObject<HTMLDivElement | null>, options: IUseGridItemDragOptions): IUseGridItemDragReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [dragging, setDragging] = useState<IGridItemPosition | undefined>(undefined);

  const draggingRef = useRef<IGridItemPosition | undefined>(undefined);
  const lastX = useRef(NaN);
  const lastY = useRef(NaN);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Constructed once (not on every render) via the standard "lazy ref
  // init" pattern — `createNativeAutoScroll()` itself is cheap, but
  // there's no reason to discard-and-recreate it every render just
  // because `useRef`'s own initial-value argument is otherwise
  // re-evaluated (and thrown away past the first render) each time.
  const autoScrollRef = useRef<ReturnType<typeof createNativeAutoScroll> | null>(null);
  if(!autoScrollRef.current) {
    autoScrollRef.current = createNativeAutoScroll();
  }

  const calcXY = useCallback((top: number, left: number): ICalcXy => {
    const { cols, containerWidth, margin, maxRows, rowHeight, w, h } = optionsRef.current;
    const colWidth = calcColWidth(containerWidth, margin[0], cols);

    let x = Math.round((left - margin[0]) / (colWidth + margin[0]));
    let y = Math.round((top - margin[1]) / (rowHeight + margin[1]));

    x = Math.max(Math.min(x, cols - w), 0);
    y = Math.max(Math.min(y, maxRows - h), 0);

    return { x, y };
  }, []);

  const handleDrag = useCallback((event: INativeDragEvent): void => {
    const { h, i, isBounded, isMirrored, margin, cols, containerWidth, rowHeight, transformScale, w, onDrag, onItemMoved, autoScroll } = optionsRef.current;

    const position = offsetXYFromParentOf(event);
    const { x, y } = position;
    const newPosition = { left: 0, top: 0 };

    switch(event.type) {
      case `dragstart`: {
        const target = event.target;
        const parentTarget = target.offsetParent as HTMLElement;
        const parentRect = parentTarget.getBoundingClientRect();
        const clientRect = target.getBoundingClientRect();
        if(isMirrored) {
          newPosition.left = (clientRect.right - parentRect.right) * -1;
        } else {
          newPosition.left = clientRect.left - parentRect.left;
        }
        newPosition.top = clientRect.top - parentRect.top;
        draggingRef.current = newPosition as IGridItemPosition;
        setDragging(draggingRef.current);
        setIsDragging(true);
        if(autoScroll) {
          autoScrollRef.current?.start(target);
        }
        break;
      }
      case `dragend`: {
        if(!draggingRef.current) {
          return;
        }
        newPosition.left = Number(draggingRef.current.left);
        newPosition.top = Number(draggingRef.current.top);
        draggingRef.current = undefined;
        setDragging(undefined);
        setIsDragging(false);
        autoScrollRef.current?.stop();
        break;
      }
      case `dragmove`: {
        const coreEvent = createCoreData(lastX.current, lastY.current, x, y);
        // Phase 16 — see this hook's own doc comment above for why only
        // the delta (not the dragstart-derived absolute position it's
        // added to) needs dividing by `transformScale`.
        const scaledDeltaX = coreEvent.deltaX / transformScale;
        const scaledDeltaY = coreEvent.deltaY / transformScale;
        let left: number;
        if(isMirrored) {
          left = Number(draggingRef.current?.left) - scaledDeltaX;
        } else {
          left = Number(draggingRef.current?.left) + scaledDeltaX;
        }
        let top = Number(draggingRef.current?.top) + scaledDeltaY;
        if(isBounded) {
          const target = event.target;
          const parentTarget = target.offsetParent as HTMLElement;
          const bottomBoundary = parentTarget.clientHeight - calcGridItemWH(h, rowHeight, margin[1]);
          top = clamp(top, 0, bottomBoundary);
          const colWidth = calcColWidth(containerWidth, margin[0], cols);
          const rightBoundary = containerWidth - calcGridItemWH(w, colWidth, margin[0]);
          left = clamp(left, 0, rightBoundary);
        }
        newPosition.left = left;
        newPosition.top = top;
        draggingRef.current = newPosition as IGridItemPosition;
        setDragging(draggingRef.current);
        if(autoScroll) {
          autoScrollRef.current?.update(event.clientX, event.clientY);
        }
        break;
      }
      default: {
        return;
      }
    }

    const pos = calcXY(newPosition.top, newPosition.left);
    lastX.current = x;
    lastY.current = y;

    if(event.type === `dragend`) {
      onItemMoved?.({ i, x: pos.x, y: pos.y });
    }

    onDrag(i, event.type, pos.x, pos.y, w, h, event.clientX, event.clientY);
  }, [calcXY]);

  useEffect(() => {
    const el = rootRef.current;
    /* v8 ignore next 3 -- same class of genuinely-unreachable-in-practice guard as GridLayout.tsx's own container-ref check; see that file's comment for the full rationale. */
    if(!el) {
      return undefined;
    }
    const native = createNativeDraggable(
      el,
      () => ({
        activationDistance: optionsRef.current.activationDistance,
        allowFrom: optionsRef.current.allowFrom,
        enabled: optionsRef.current.enabled,
        ignoreFrom: optionsRef.current.ignoreFrom,
      }),
      handleDrag,
    );
    return () => {
      native.destroy();
    };
  }, [handleDrag, rootRef]);

  return useMemo(() => ({ dragging, isDragging }), [dragging, isDragging]);
}
