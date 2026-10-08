import { describe, expect, it, vi } from 'vitest';
import { useEffect, useRef } from 'react';
import { act, render, renderHook } from '@testing-library/react';
import { useGridItemDrag } from '../hooks/useGridItemDrag';
import type { IUseGridItemDragOptions, IUseGridItemDragReturn } from '../hooks/useGridItemDrag';
import { useGridItemResize } from '../hooks/useGridItemResize';
import type { IUseGridItemResizeOptions, IUseGridItemResizeReturn } from '../hooks/useGridItemResize';
import { useLayoutStorage } from '../../../hooks/useLayoutStorage';

/**
 * Hook-level mutation gaps left after `GridLayoutMutationGaps3.spec.tsx` — each test names the surviving
 * mutant it exists for. The two harnesses are trimmed copies of `useGridItemDrag.hook.spec.tsx`'s and
 * `useGridItemResize.mutation.hook.spec.tsx`'s own.
 *
 * Fixture numbers (both hooks): containerWidth 1210, margin [10, 10], rowHeight 150, 12 columns ->
 * colWidth 90, column step 100, row step 160. An item at x:0 y:0 w:2 h:2 renders as
 * left 10, top 10, width 190, height 310.
 */

// ── drag ───────────────────────────────────────────────────────────────────────────────────────

const dragOptions = (overrides: Partial<IUseGridItemDragOptions> = {}): IUseGridItemDragOptions => ({
  autoScroll: false,
  containerWidth: 1210,
  cols: 12,
  enabled: true,
  h: 2,
  i: `item-1`,
  innerX: 0,
  innerY: 0,
  isBounded: false,
  isMirrored: false,
  margin: [10, 10],
  maxRows: Infinity,
  onDrag: vi.fn(),
  rowHeight: 150,
  transformScale: 1,
  w: 2,
  ...overrides,
});

function DragHarness({ onReady, options }: { onReady: (result: IUseGridItemDragReturn, rootEl: HTMLDivElement) => void; options: IUseGridItemDragOptions }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const result = useGridItemDrag(rootRef, options);
  useEffect(() => {
    onReady(result, rootRef.current!);
  });
  return <div ref={rootRef} />;
}

const zeroRect = (): DOMRect => ({ bottom: 0, height: 0, left: 0, right: 0, toJSON: () => ({}), top: 0, width: 0, x: 0, y: 0 });

const createDragContext = (options: IUseGridItemDragOptions) => {
  let rootEl!: HTMLDivElement;
  render(<DragHarness onReady={(_r, el) => { rootEl = el; }} options={options} />);
  const parentEl = document.createElement(`div`);
  Object.defineProperty(rootEl, `offsetParent`, { configurable: true, value: parentEl });
  vi.spyOn(rootEl, `getBoundingClientRect`).mockReturnValue(zeroRect());
  vi.spyOn(parentEl, `getBoundingClientRect`).mockReturnValue(zeroRect());
  const dispatch = (event: { type: `dragstart` | `dragmove` | `dragend`; clientX?: number; clientY?: number }): void => {
    const handler = (rootEl as unknown as { __nativeDragHandler?: (e: unknown) => void }).__nativeDragHandler;
    act(() => {
      handler?.({ clientX: 0, clientY: 0, target: rootEl, ...event });
    });
  };
  return { dispatch };
};

describe(`useGridItemDrag — maxRows`, () => {
  it(`Should cap the reported row at maxRows minus the item's own height`, () => {
    const onDrag = vi.fn();
    const { dispatch } = createDragContext(dragOptions({ h: 2, maxRows: 5, onDrag }));
    dispatch({ clientX: 0, clientY: 0, type: `dragstart` });
    onDrag.mockClear();

    // 2000px down would be row round(1990 / 160) = 12; the lowest row a 2-high item can start on in 5 rows is 3.
    dispatch({ clientX: 0, clientY: 2000, type: `dragmove` });

    expect((onDrag.mock.calls.at(-1) as unknown[])[3]).toBe(3);
  });
});

// ── resize ─────────────────────────────────────────────────────────────────────────────────────

const resizeOptions = (overrides: Partial<IUseGridItemResizeOptions> = {}): IUseGridItemResizeOptions => ({
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

function ResizeHarness({ onReady, options }: { onReady: (result: IUseGridItemResizeReturn, rootEl: HTMLDivElement) => void; options: IUseGridItemResizeOptions }) {
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

const createResizeContext = (options: IUseGridItemResizeOptions) => {
  let result!: IUseGridItemResizeReturn;
  let rootEl!: HTMLDivElement;
  render(<ResizeHarness onReady={(r, el) => { result = r; rootEl = el; }} options={options} />);
  const dispatch = (event: { type: string; clientX?: number; clientY?: number; edges?: Partial<TEdges> }): void => {
    const handler = (rootEl as unknown as { __nativeResizeHandler?: (e: unknown) => void }).__nativeResizeHandler;
    act(() => {
      handler?.({ clientX: 0, clientY: 0, target: rootEl, ...event, edges: { ...NO_EDGES, ...event.edges } });
    });
  };
  // `result` changes identity every render, so reads go through a proxy that always sees the latest one.
  const latest = new Proxy({} as IUseGridItemResizeReturn, {
    get: (_target, property) => (result as unknown as Record<string | symbol, unknown>)[property],
  });
  return { dispatch, result: latest };
};

const lastCall = (onResize: ReturnType<typeof vi.fn>): unknown[] => onResize.mock.calls.at(-1) as unknown[];

describe(`useGridItemResize — size rounding, caps and reset`, () => {
  it(`Should round a dragged height to the nearest row by default, not up`, () => {
    const onResize = vi.fn();
    const { dispatch } = createResizeContext(resizeOptions({ onResize }));
    const bottom = { bottom: true };

    // 310px + 48px = 358px -> (358 + 10) / 160 = 2.3 rows: nearest is 2, rounding up would give 3.
    dispatch({ edges: bottom, type: `resizestart` });
    dispatch({ clientY: 48, edges: bottom, type: `resizemove` });

    expect(lastCall(onResize)[5]).toBe(2);
  });

  it(`Should cap the width at the columns left to the right of the item, measured from its own column`, () => {
    const onResize = vi.fn();
    const { dispatch } = createResizeContext(resizeOptions({ innerX: 8, onResize }));
    const right = { right: true };

    // Dragging 1000px right asks for far more than 12 columns; an item starting on column 8 has 4 left.
    dispatch({ edges: right, type: `resizestart` });
    dispatch({ clientX: 1000, edges: right, type: `resizemove` });

    expect(lastCall(onResize)[4]).toBe(4);
  });

  it(`Should cap the height at the rows left below the item, measured from its own row`, () => {
    const onResize = vi.fn();
    const { dispatch } = createResizeContext(resizeOptions({ innerY: 3, maxRows: 6, onResize }));
    const bottom = { bottom: true };

    // Dragging 1000px down asks for far more than 6 rows; an item starting on row 3 has 3 left.
    dispatch({ edges: bottom, type: `resizestart` });
    dispatch({ clientY: 1000, edges: bottom, type: `resizemove` });

    expect(lastCall(onResize)[5]).toBe(3);
  });

  it(`Should not throw on a mirrored resizeend that arrives before any resizestart`, () => {
    // A separate, fresh context: a resizemove first would define the internal state the optional
    // chains guard against, which is exactly the case this one needs to be absent.
    const { dispatch } = createResizeContext(resizeOptions({ isMirrored: true }));
    expect(() => dispatch({ type: `resizeend` })).not.toThrow();
  });

  it(`Should not throw on an LTR resizeend that arrives before any resizestart`, () => {
    const { dispatch } = createResizeContext(resizeOptions({ isMirrored: false }));
    expect(() => dispatch({ type: `resizeend` })).not.toThrow();
  });

  it(`Should report isResizing false again once the resize has ended`, () => {
    const { dispatch, result } = createResizeContext(resizeOptions());
    dispatch({ edges: { right: true }, type: `resizestart` });
    expect(result.isResizing).toBe(true);

    dispatch({ edges: { right: true }, type: `resizeend` });

    expect(result.isResizing).toBe(false);
  });
});

// ── storage ────────────────────────────────────────────────────────────────────────────────────

const fakeStorage = (initial: Record<string, string>): Storage => {
  const store = new Map(Object.entries(initial));
  return {
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
    removeItem: (key: string) => { store.delete(key); },
    setItem: (key: string, value: string) => { store.set(key, value); },
  };
};

describe(`useLayoutStorage — hasSaved follows a changed key`, () => {
  it(`Should read the new key, not the one the hook was first rendered with`, () => {
    const storage = fakeStorage({ second: `[]` });
    const { result, rerender } = renderHook(({ storageKey }) => useLayoutStorage(storageKey, { storage }), {
      initialProps: { storageKey: `first` },
    });
    expect(result.current.hasSaved()).toBe(false);

    rerender({ storageKey: `second` });

    expect(result.current.hasSaved()).toBe(true);
  });
});
