import { describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { render } from '@testing-library/react';
import { useGridItemResize } from '../hooks/useGridItemResize';
import type { IUseGridItemResizeOptions, IUseGridItemResizeReturn } from '../hooks/useGridItemResize';

/**
 * Same constants as Vue's own `tests/useGridItemResize.spec.ts` — this
 * hook is a near-line-for-line port, sharing the exact same pixel math
 * (`calcColWidth`, `calcPosition`, `calcWH`, `pixelsToGridX/Y` all come
 * from the same `@keystone-dashboard-layout/core` helpers) — so every
 * precise numeric value verified there transfers directly here.
 * `containerWidth` chosen so `calcColWidth` (`(1210 - 10*13)/12`)
 * resolves to a clean `90`.
 */
const CONTAINER_WIDTH = 1210;
const MARGIN: [number, number] = [10, 10];
const ROW_HEIGHT = 150;
const COLS = 12;

const defaultOptions = (overrides: Partial<IUseGridItemResizeOptions> = {}): IUseGridItemResizeOptions => ({
  autoScroll: false,
  containerWidth: CONTAINER_WIDTH,
  cols: COLS,
  enabled: true,
  h: 2,
  i: `item-1`,
  innerX: 0,
  innerY: 0,
  isMirrored: false,
  margin: MARGIN,
  maxH: Infinity,
  maxRows: Infinity,
  maxW: Infinity,
  minH: 1,
  minW: 1,
  onResize: vi.fn(),
  preserveAspectRatio: false,
  rowHeight: ROW_HEIGHT,
  transformScale: 1,
  w: 2,
  ...overrides,
});

/**
 * A minimal harness rendering the 8 resize-hint spans with their own
 * `ref={handleRefs.x}` actually attached in real JSX — required because
 * React only populates a ref's `.current` during its own commit phase,
 * *before* `useEffect` first runs; mutating `.current` from outside
 * afterward wouldn't re-trigger the hook's own wiring effect at all
 * (its dependency array — `[handleResize, handleRefs, rootRef]` — never
 * changes identity just because a ref's `.current` was mutated).
 */
function Harness({ onReady, options }: { onReady: (result: IUseGridItemResizeReturn, rootEl: HTMLDivElement) => void; options: IUseGridItemResizeOptions }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const result = useGridItemResize(rootRef, options);
  onReady(result, rootRef.current!);
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

const createContext = (options: IUseGridItemResizeOptions) => {
  let result!: IUseGridItemResizeReturn;
  let rootEl!: HTMLDivElement;
  render(<Harness onReady={(r, el) => { result = r; rootEl = el; }} options={options} />);

  /** The `__nativeResizeHandler` test-only backdoor `createNativeResizable` stashes on the root element — shared `core` helper, same technique as Vue's own identical test file. */
  const dispatch = (event: {
    type: `resizestart` | `resizemove` | `resizeend`;
    clientX?: number;
    clientY?: number;
    edges?: { bottom: boolean; left: boolean; right: boolean; top: boolean };
  }): void => {
    const handler = (rootEl as unknown as { __nativeResizeHandler?: (e: unknown) => void }).__nativeResizeHandler;
    handler?.({
      clientX: 0,
      clientY: 0,
      edges: { bottom: false, left: false, right: false, top: false },
      target: rootEl,
      ...event,
    });
  };

  return { dispatch, get result() { return result; }, rootEl };
};

describe(`useGridItemResize`, () => {
  describe(`calcPosition`, () => {
    it(`Should compute left/top/height/width precisely in LTR`, () => {
      const { result } = createContext(defaultOptions());
      const pos = result.calcPosition(2, 3, 4, 5);
      // Identical formulas/values to Vue's own equivalent test — see
      // that file's own comment for the full arithmetic breakdown.
      expect(pos.height).toBe(790);
      expect(pos.left).toBe(210);
      expect(pos).not.toHaveProperty(`right`);
      expect(pos.top).toBe(490);
      expect(pos.width).toBe(390);
    });

    it(`Should compute right/top/height/width precisely when isMirrored (RTL)`, () => {
      const { result } = createContext(defaultOptions({ isMirrored: true }));
      const pos = result.calcPosition(2, 3, 4, 5);
      expect(pos.height).toBe(790);
      expect(pos.right).toBe(210);
      expect(pos).not.toHaveProperty(`left`);
      expect(pos.top).toBe(490);
      expect(pos.width).toBe(390);
    });
  });

  describe(`handleResize — resizestart`, () => {
    it(`Should set isResizing/resizing and call onResize on resizestart`, () => {
      const onResize = vi.fn();
      const { dispatch, result } = createContext(defaultOptions({ onResize }));

      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });

      expect(result.isResizing).toBe(true);
      expect(result.resizing).toBeDefined();
      expect(onResize).toHaveBeenCalledWith(`item-1`, `resizestart`, 0, 0, 2, 2);
    });
  });

  describe(`handleResize — resizemove edges`, () => {
    it(`Should grow width when dragging the right edge (LTR: anchor untouched)`, () => {
      const { dispatch, result } = createContext(defaultOptions());
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });
      const widthBefore = result.resizing!.width;

      dispatch({ clientX: 50, edges: { bottom: false, left: false, right: true, top: false }, type: `resizemove` });

      expect(result.resizing!.width).toBeGreaterThan(widthBefore);
    });

    it(`Should divide (not multiply) coreEvent.deltaY by transformScale during resizemove`, () => {
      const { dispatch, result } = createContext(defaultOptions({ transformScale: 2 }));
      dispatch({ edges: { bottom: true, left: false, right: false, top: false }, type: `resizestart` });
      // resizestart's own pos = calcPosition(0,0,2,2): height = round(150*2 + max(0,1)*10) = 310.
      const heightAtStart = result.resizing!.height;

      // offsetXYFromParentOf reduces to clientY directly for this
      // harness's own unattached-parent stub behavior (same analysis as
      // Vue's own identical test) — lastH after resizestart is 0
      // (dispatch default), so deltaY = 100 - 0 = 100.
      dispatch({ clientY: 100, edges: { bottom: true, left: false, right: false, top: false }, type: `resizemove` });

      // height = prevHeight(310) + deltaY(100)/transformScale(2) = 310+50=360.
      // A "*" mutant would instead give 310+200=510 — genuinely different.
      expect(result.resizing!.height).toBe(heightAtStart + 50);
    });
  });

  describe(`calcWH (via resize clamping)`, () => {
    it(`Should round (not ceil) height by default, and ceil when autoSize is used`, () => {
      // Exercised indirectly via autoSize() (the only exposed path to
      // calcWH's own autoSizeFlag branch) — same 158 height boundary as
      // Vue's own equivalent test. width=50 (not 90, a real mistake found
      // via a fresh mutation report: (90+10)/100=1 and the "-margin"
      // mutant (90-10)/100=0.8 both round to the SAME 1) so the width
      // side's own margin arithmetic is ALSO distinguished: (50+10)/100=
      // 0.6 rounds to 1, while the mutant (50-10)/100=0.4 rounds to 0.
      const onResize = vi.fn();
      const { result } = createContext(defaultOptions({ h: 100, onResize, w: 100 }));
      const wrapper = document.createElement(`div`);
      vi.spyOn(wrapper, `getBoundingClientRect`).mockReturnValue({ height: 158, width: 50 } as DOMRect);

      result.autoSize(wrapper);

      const call = onResize.mock.calls.at(-1);
      // (158+10)/160=1.05 -> ceil=2 (autoSize always uses the ceil path).
      expect(call?.[5]).toBe(2);
      // (50+10)/100=0.6 -> round=1.
      expect(call?.[4]).toBe(1);
    });
  });

  describe(`handleResize — preserveAspectRatio`, () => {
    it(`Should derive height from width when only a horizontal edge is driving`, () => {
      const { dispatch, result } = createContext(defaultOptions({ preserveAspectRatio: true }));
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });
      const heightBefore = result.resizing!.height;

      dispatch({ clientX: 90, edges: { bottom: false, left: false, right: true, top: false }, type: `resizemove` });

      expect(result.resizing!.height).not.toBe(heightBefore);
    });

    it(`Should NOT derive dimensions at all when preserveAspectRatio is false`, () => {
      const { dispatch, result } = createContext(defaultOptions({ preserveAspectRatio: false }));
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });
      const heightAtStart = result.resizing!.height;

      dispatch({ clientX: 90, edges: { bottom: false, left: false, right: true, top: false }, type: `resizemove` });

      expect(result.resizing!.height).toBe(heightAtStart);
    });
  });

  describe(`handleResize — min/max clamping`, () => {
    it(`Should NOT clamp at all when the resized value is already within minW/maxW/minH/maxH`, () => {
      const onResize = vi.fn();
      const { dispatch } = createContext(defaultOptions({ maxH: 100, maxW: 100, minH: 1, minW: 1, onResize }));
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });
      onResize.mockClear();

      dispatch({ clientX: 90, edges: { bottom: false, left: false, right: true, top: false }, type: `resizemove` });
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizeend` });

      const call = onResize.mock.calls.find(c => c[1] === `resizeend`);
      // width grew from 190 (2 cols) by 90px -> 280px -> (280+10)/100=2.9->round=3
      expect(call?.[4]).toBe(3);
    });

    it(`Should clamp pos.w up to minW`, () => {
      const onResize = vi.fn();
      const { dispatch } = createContext(defaultOptions({ minW: 3, onResize }));
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });
      onResize.mockClear();
      dispatch({ clientX: -1000, edges: { bottom: false, left: false, right: true, top: false }, type: `resizemove` });

      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizeend` });

      const call = onResize.mock.calls.find(c => c[1] === `resizeend`);
      expect(call?.[4]).toBeGreaterThanOrEqual(3);
    });

    it(`Should clamp pos.h down to maxH`, () => {
      const onResize = vi.fn();
      const { dispatch } = createContext(defaultOptions({ maxH: 3, onResize }));
      dispatch({ edges: { bottom: true, left: false, right: false, top: false }, type: `resizestart` });
      onResize.mockClear();
      dispatch({ clientY: 1000, edges: { bottom: true, left: false, right: false, top: false }, type: `resizemove` });

      dispatch({ edges: { bottom: true, left: false, right: false, top: false }, type: `resizeend` });

      const call = onResize.mock.calls.find(c => c[1] === `resizeend`);
      expect(call?.[5]).toBeLessThanOrEqual(3);
    });
  });

  describe(`handleResize — position derivation for left/top-edge resizes`, () => {
    it(`Should derive a new x when resizing from the left edge (LTR)`, () => {
      const onResize = vi.fn();
      const { dispatch } = createContext(defaultOptions({ innerX: 3, onResize }));
      dispatch({ edges: { bottom: false, left: true, right: false, top: false }, type: `resizestart` });
      dispatch({ clientX: -90, edges: { bottom: false, left: true, right: false, top: false }, type: `resizemove` });
      onResize.mockClear();

      dispatch({ edges: { bottom: false, left: true, right: false, top: false }, type: `resizeend` });

      const call = onResize.mock.calls.find(c => c[1] === `resizeend`);
      expect(call?.[2]).not.toBe(3);
    });

    it(`Should leave x/y unchanged for a right/bottom-only resize (no anchor-edge active)`, () => {
      const onResize = vi.fn();
      const { dispatch } = createContext(defaultOptions({ innerX: 3, innerY: 4, onResize }));
      dispatch({ edges: { bottom: true, left: false, right: true, top: false }, type: `resizestart` });
      dispatch({ clientX: 90, clientY: 90, edges: { bottom: true, left: false, right: true, top: false }, type: `resizemove` });
      onResize.mockClear();

      dispatch({ edges: { bottom: true, left: false, right: true, top: false }, type: `resizeend` });

      const call = onResize.mock.calls.find(c => c[1] === `resizeend`);
      expect(call?.[2]).toBe(3);
      expect(call?.[3]).toBe(4);
    });
  });

  describe(`autoSize`, () => {
    it(`Should clamp the auto-sized w/h to minW/maxW/minH/maxH`, () => {
      const onResize = vi.fn();
      const { result } = createContext(defaultOptions({ maxH: 1, maxW: 1, onResize }));
      const wrapper = document.createElement(`div`);
      vi.spyOn(wrapper, `getBoundingClientRect`).mockReturnValue({ height: 900, width: 900 } as DOMRect);

      result.autoSize(wrapper);

      const call = onResize.mock.calls.at(-1);
      expect(call?.[4]).toBe(1);
      expect(call?.[5]).toBe(1);
    });

    it(`Should NOT call onResize when the measured size resolves to the same grid units as before`, () => {
      const onResize = vi.fn();
      const { result } = createContext(defaultOptions({ h: 2, onResize, w: 2 }));
      const wrapper = document.createElement(`div`);
      vi.spyOn(wrapper, `getBoundingClientRect`).mockReturnValue({ height: 300, width: 190 } as DOMRect);

      result.autoSize(wrapper);

      expect(onResize).not.toHaveBeenCalled();
    });
  });
});
