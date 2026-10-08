import { describe, expect, it, vi } from 'vitest';
import { useEffect, useRef } from 'react';
import { act, render } from '@testing-library/react';
import { useGridItemResize } from '../hooks/useGridItemResize';
import type { IUseGridItemResizeOptions, IUseGridItemResizeReturn } from '../hooks/useGridItemResize';

/**
 * Targets mutants that survived Stryker against `useGridItemResize.ts`
 * (see `reports/mutation/mutation.json`). Kept apart from
 * `useGridItemResize.hook.spec.tsx` because every test here exists for
 * one specific surviving mutant. The harness is a trimmed copy of that
 * file's own.
 *
 * Fixture numbers: containerWidth 1210, margin [10, 10], rowHeight 150,
 * 12 columns -> colWidth 90, column step 100, row step 160. An item at
 * x:0 y:0 w:2 h:2 renders as left 10, top 10, width 190, height 310.
 */
const defaultOptions = (overrides: Partial<IUseGridItemResizeOptions> = {}): IUseGridItemResizeOptions => ({
  autoScroll: false,
  containerWidth: 1210,
  cols: 12,
  enabled: true,
  h: 2,
  i: `item-1`,
  innerX: 0,
  innerY: 0,
  isMirrored: false,
  margin: [10, 10],
  maxH: Infinity,
  maxRows: Infinity,
  maxW: Infinity,
  minH: 1,
  minW: 1,
  onResize: vi.fn(),
  preserveAspectRatio: false,
  resizeHandles: [`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`],
  rowHeight: 150,
  transformScale: 1,
  w: 2,
  ...overrides,
});

function Harness({ onReady, options }: { onReady: (result: IUseGridItemResizeReturn, rootEl: HTMLDivElement) => void; options: IUseGridItemResizeOptions }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const result = useGridItemResize(rootRef, options);
  useEffect(() => {
    onReady(result, rootRef.current!);
  });
  return (
    <div ref={rootRef}>
      <span ref={result.handleRefs.n} />
      <span ref={result.handleRefs.s} />
      <span ref={result.handleRefs.e} />
      <span ref={result.handleRefs.w} />
      <span ref={result.handleRefs.ne} />
      <span ref={result.handleRefs.nw} />
      <span ref={result.handleRefs.se} />
      <span ref={result.handleRefs.sw} />
    </div>
  );
}

type TEdges = { bottom: boolean; left: boolean; right: boolean; top: boolean };
const NO_EDGES: TEdges = { bottom: false, left: false, right: false, top: false };

const createContext = (options: IUseGridItemResizeOptions) => {
  let result!: IUseGridItemResizeReturn;
  let rootEl!: HTMLDivElement;
  render(<Harness onReady={(r, el) => { result = r; rootEl = el; }} options={options} />);

  const dispatch = (event: { type: string; clientX?: number; clientY?: number; edges?: Partial<TEdges> }): void => {
    const handler = (rootEl as unknown as { __nativeResizeHandler?: (e: unknown) => void }).__nativeResizeHandler;
    act(() => {
      handler?.({
        clientX: 0,
        clientY: 0,
        target: rootEl,
        ...event,
        edges: { ...NO_EDGES, ...event.edges },
      });
    });
  };

  // `result` changes identity on every render, so it can't just be handed out: a
  // destructured copy (`const { result } = createContext(...)`) would stay frozen at
  // the first render's value and miss every later `resizing`/`isResizing` update.
  // A proxy that always reads the latest value keeps destructuring safe.
  const latestResult = new Proxy({} as IUseGridItemResizeReturn, {
    get: (_target, property) => (result as unknown as Record<string | symbol, unknown>)[property],
  });

  return { dispatch, result: latestResult, rootEl };
};

const lastCall = (onResize: ReturnType<typeof vi.fn>): unknown[] | undefined => onResize.mock.calls.at(-1);

const wrapperWithRect = (width: number, height: number): HTMLElement => {
  const wrapper = document.createElement(`div`);
  wrapper.getBoundingClientRect = () => ({
    bottom: 0, height, left: 0, right: 0, top: 0, width, x: 0, y: 0, toJSON: () => ({}),
  });
  return wrapper;
};

describe(`useGridItemResize — mutation-testing gap coverage`, () => {
  describe(`autoSize`, () => {
    it(`Should report a resize when only the height changed`, () => {
      const onResize = vi.fn();
      const { result } = createContext(defaultOptions({ onResize }));

      // width 190 -> 2 columns (unchanged); height 470 -> ceil(480 / 160) = 3 rows
      result.autoSize(wrapperWithRect(190, 470));

      expect(onResize).toHaveBeenCalledWith(`item-1`, `resizeend`, 0, 0, 2, 3);
    });

    it(`Should report a resize when only the width changed`, () => {
      const onResize = vi.fn();
      const { result } = createContext(defaultOptions({ onResize }));

      // width 290 -> round(300 / 100) = 3 columns; height 310 -> ceil(320 / 160) = 2 rows (unchanged)
      result.autoSize(wrapperWithRect(290, 310));

      expect(onResize).toHaveBeenCalledWith(`item-1`, `resizeend`, 0, 0, 3, 2);
    });

    it(`Should report nothing when neither dimension changed`, () => {
      const onResize = vi.fn();
      const { result } = createContext(defaultOptions({ onResize }));

      result.autoSize(wrapperWithRect(190, 310));

      expect(onResize).not.toHaveBeenCalled();
    });

    it(`Should round a measured height up to the next row rather than to the nearest`, () => {
      const onResize = vi.fn();
      const { result } = createContext(defaultOptions({ onResize }));

      // (330 + 10) / 160 = 2.125 -> 3 rounding up, 2 rounding to nearest
      result.autoSize(wrapperWithRect(190, 330));

      expect(onResize).toHaveBeenCalledWith(`item-1`, `resizeend`, 0, 0, 2, 3);
    });
  });

  describe(`new grid position after a left/top-edge resize`, () => {
    it(`Should convert the new left edge to a grid x using the margin on both sides of the column step`, () => {
      const onResize = vi.fn();
      const { dispatch } = createContext(defaultOptions({ innerX: 4, onResize }));
      const left = { left: true };

      // x = 4 -> left px = 90 * 4 + 5 * 10 = 410. Pulling 160px further left: width 350 (4 columns), left 250 -> round(240 / 100) = 2.
      dispatch({ clientX: 0, clientY: 0, edges: left, type: `resizestart` });
      dispatch({ clientX: -160, clientY: 0, edges: left, type: `resizemove` });

      expect(lastCall(onResize)).toEqual([`item-1`, `resizemove`, 2, 0, 4, 2]);
    });

    it(`Should cap the new grid x so the resized item can't pass the right edge`, () => {
      const onResize = vi.fn();
      const { dispatch } = createContext(defaultOptions({ innerX: 10, onResize }));
      const left = { left: true };

      // Shrinking far past zero width floors w at 1; the unclamped x would be 15, capped at 12 - 1 = 11.
      dispatch({ clientX: 0, clientY: 0, edges: left, type: `resizestart` });
      dispatch({ clientX: 500, clientY: 0, edges: left, type: `resizemove` });

      expect((lastCall(onResize) as unknown[])[2]).toBe(11);
    });

    it(`Should convert the new top edge to a grid y using the margin on both sides of the row step`, () => {
      const onResize = vi.fn();
      const { dispatch, result } = createContext(defaultOptions({ innerY: 3, onResize }));
      const top = { top: true };

      // y = 3 -> top px = 150 * 3 + 4 * 10 = 490. Pulling 88px up: height 398 (3 rows), top 402 -> round(392 / 160) = 2.
      dispatch({ clientX: 0, clientY: 0, edges: top, type: `resizestart` });
      dispatch({ clientX: 0, clientY: -88, edges: top, type: `resizemove` });

      expect(lastCall(onResize)).toEqual([`item-1`, `resizemove`, 0, 2, 2, 3]);
      expect(result.resizing?.top).toBe(402);
    });

    it(`Should cap the new grid y at maxRows minus the resized item's own height`, () => {
      const onResize = vi.fn();
      const { dispatch } = createContext(defaultOptions({ innerY: 3, maxRows: 8, onResize }));
      const top = { top: true };

      // Shrinking far past zero height floors h at 1; the unclamped y would be 12, capped at 8 - 1 = 7.
      dispatch({ clientX: 0, clientY: 0, edges: top, type: `resizestart` });
      dispatch({ clientX: 0, clientY: 1500, edges: top, type: `resizemove` });

      expect((lastCall(onResize) as unknown[])[3]).toBe(7);
    });
  });

  describe(`resizemove`, () => {
    it(`Should grow only the width, leaving height, top and left alone, when only the right edge is dragged`, () => {
      const { dispatch, result } = createContext(defaultOptions());
      const right = { right: true };

      dispatch({ edges: right, type: `resizestart` });
      dispatch({ clientX: 100, clientY: 40, edges: right, type: `resizemove` });

      expect(result.resizing).toEqual({ height: 310, left: 10, top: 10, width: 290 });
    });

    it(`Should divide the pointer delta by transformScale, not multiply it`, () => {
      const { dispatch, result } = createContext(defaultOptions({ transformScale: 2 }));
      const bottom = { bottom: true };

      dispatch({ edges: bottom, type: `resizestart` });
      dispatch({ clientX: 0, clientY: 40, edges: bottom, type: `resizemove` });

      // 40 / 2 = 20 on top of the starting 310
      expect(result.resizing?.height).toBe(330);
    });

    it(`Should leave a mirrored item's right anchor alone when its left edge is dragged`, () => {
      const { dispatch, result } = createContext(defaultOptions({ isMirrored: true }));
      const left = { left: true };

      dispatch({ edges: left, type: `resizestart` });
      dispatch({ clientX: -100, clientY: 0, edges: left, type: `resizemove` });

      expect(result.resizing).toEqual({ height: 310, right: 10, top: 10, width: 290 });
    });

    it(`Should move a mirrored item's right anchor the opposite way when its right edge is dragged`, () => {
      const { dispatch, result } = createContext(defaultOptions({ isMirrored: true }));
      const right = { right: true };

      dispatch({ edges: right, type: `resizestart` });
      dispatch({ clientX: 100, clientY: 0, edges: right, type: `resizemove` });

      expect(result.resizing).toEqual({ height: 310, right: -90, top: 10, width: 290 });
    });

    it(`Should not throw on a resizemove or resizeend that arrives before any resizestart`, () => {
      const ltr = createContext(defaultOptions());
      const rtl = createContext(defaultOptions({ isMirrored: true }));
      const right = { right: true };

      expect(() => ltr.dispatch({ clientX: 10, clientY: 10, edges: right, type: `resizemove` })).not.toThrow();
      expect(() => ltr.dispatch({ edges: right, type: `resizeend` })).not.toThrow();
      expect(() => rtl.dispatch({ clientX: 10, clientY: 10, edges: right, type: `resizemove` })).not.toThrow();
      expect(() => rtl.dispatch({ edges: right, type: `resizeend` })).not.toThrow();
    });

    it(`Should ignore an unrecognised event type entirely`, () => {
      const onResize = vi.fn();
      const { dispatch } = createContext(defaultOptions({ onResize }));

      dispatch({ type: `resizecancel` });

      expect(onResize).not.toHaveBeenCalled();
    });
  });

  describe(`preserveAspectRatio`, () => {
    it(`Should leave the top anchor alone when the right and bottom edges drive the resize`, () => {
      const { dispatch, result } = createContext(defaultOptions({ preserveAspectRatio: true }));
      const corner = { bottom: true, right: true };

      dispatch({ edges: corner, type: `resizestart` });
      dispatch({ clientX: 100, clientY: 40, edges: corner, type: `resizemove` });

      expect(result.resizing?.top).toBe(10);
    });

    it(`Should move the top anchor by the derived height change for a top-right corner resize`, () => {
      const { dispatch, result } = createContext(defaultOptions({ preserveAspectRatio: true }));
      const corner = { right: true, top: true };

      // ratio 190 / 310; width 290 -> derived height 473.158; top = 10 + (310 - 473.158)
      dispatch({ edges: corner, type: `resizestart` });
      dispatch({ clientX: 100, clientY: -20, edges: corner, type: `resizemove` });

      expect(result.resizing?.height).toBeCloseTo(473.1579, 3);
      expect(result.resizing?.top).toBeCloseTo(-153.1579, 3);
    });

    it(`Should derive the width by multiplying the height by the ratio when only a vertical edge drives the resize`, () => {
      const { dispatch, result } = createContext(defaultOptions({ preserveAspectRatio: true }));
      const bottom = { bottom: true };

      // height 350 * (190 / 310) = 214.516
      dispatch({ edges: bottom, type: `resizestart` });
      dispatch({ clientX: 0, clientY: 40, edges: bottom, type: `resizemove` });

      expect(result.resizing?.width).toBeCloseTo(214.5161, 3);
    });

    it(`Should derive the height by dividing the width by the ratio when only a horizontal edge drives the resize`, () => {
      const { dispatch, result } = createContext(defaultOptions({ preserveAspectRatio: true }));
      const right = { right: true };

      // width 290 / (190 / 310) = 473.158
      dispatch({ edges: right, type: `resizestart` });
      dispatch({ clientX: 100, clientY: 0, edges: right, type: `resizemove` });

      expect(result.resizing?.height).toBeCloseTo(473.1579, 3);
    });

    it(`Should not preserve an aspect ratio at all when the item starts with zero height`, () => {
      const { dispatch, result } = createContext(defaultOptions({ h: 0, preserveAspectRatio: true }));
      const bottom = { bottom: true };

      dispatch({ edges: bottom, type: `resizestart` });
      dispatch({ clientX: 0, clientY: 40, edges: bottom, type: `resizemove` });

      expect(result.resizing?.width).toBe(190);
    });
  });
});
