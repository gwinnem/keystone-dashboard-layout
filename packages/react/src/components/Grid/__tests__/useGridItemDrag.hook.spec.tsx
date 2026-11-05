import { describe, expect, it, vi } from 'vitest';
import { useEffect, useRef } from 'react';
import { act, render } from '@testing-library/react';
import { useGridItemDrag } from '../hooks/useGridItemDrag';
import type { IUseGridItemDragOptions, IUseGridItemDragReturn } from '../hooks/useGridItemDrag';

/**
 * `createNativeAutoScroll()` drives a real, `requestAnimationFrame`-based
 * scrolling engine — mocked here (same pattern, same rationale, as
 * `GridLayoutAutoScroll.spec.tsx`'s own identical mock) purely so the
 * lazy-init test below can assert on how many times the *factory
 * function itself* gets called, not on the scrolling engine's own
 * internals (already covered by `core`'s own test suite).
 *
 * `vi.hoisted(...)`, not a plain top-level `const` — `vi.mock`'s own
 * factory callback is hoisted above every module-level declaration
 * (regardless of source order), so a plain `const mockCreateNativeAutoScroll
 * = vi.fn(...)` written above the `vi.mock(...)` call below still throws
 * "Cannot access ... before initialization" the moment this file is
 * imported (confirmed via a real, reproduced test run, not assumed) —
 * `vi.hoisted` is Vitest's own documented fix for exactly this: it
 * hoists the variable's own initialization alongside `vi.mock` itself,
 * not just the mock factory.
 */
const { mockCreateNativeAutoScroll } = vi.hoisted(() => ({
  mockCreateNativeAutoScroll: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), update: vi.fn() })),
}));

vi.mock(`keystone-dashboard-layout-core`, async importOriginal => {
  const actual = await importOriginal<typeof import('keystone-dashboard-layout-core')>();
  return {
    ...actual,
    createNativeAutoScroll: mockCreateNativeAutoScroll,
  };
});

/**
 * Same constants as `useGridItemResize.hook.spec.tsx`'s own identical
 * top comment — `containerWidth` chosen so `calcColWidth`
 * (`(1210 - 10*13)/12`) resolves to a clean `90`.
 */
const CONTAINER_WIDTH = 1210;
const MARGIN: [number, number] = [10, 10];
const ROW_HEIGHT = 150;
const COLS = 12;

const defaultOptions = (overrides: Partial<IUseGridItemDragOptions> = {}): IUseGridItemDragOptions => ({
  autoScroll: false,
  containerWidth: CONTAINER_WIDTH,
  cols: COLS,
  enabled: true,
  h: 2,
  i: `item-1`,
  innerX: 0,
  innerY: 0,
  isBounded: false,
  isMirrored: false,
  margin: MARGIN,
  maxRows: Infinity,
  onDrag: vi.fn(),
  rowHeight: ROW_HEIGHT,
  transformScale: 1,
  w: 2,
  ...overrides,
});

/**
 * A minimal harness — same rationale as `useGridItemResize.hook.spec.tsx`'s
 * own identical `Harness`: `onReady` fires from a `useEffect` (not the
 * render body) so `rootRef.current` is already attached by the time it's
 * captured, and `render()`'s own synchronous `act()` wrapping means it's
 * already fired by the time `render()` returns.
 */
function Harness({ onReady, options }: { onReady: (result: IUseGridItemDragReturn, rootEl: HTMLDivElement) => void; options: IUseGridItemDragOptions }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const result = useGridItemDrag(rootRef, options);
  useEffect(() => {
    onReady(result, rootRef.current!);
  });
  return <div ref={rootRef} />;
}

/**
 * A zero-valued `DOMRect`-shaped stub — used whenever a test needs
 * `target.getBoundingClientRect()`/`target.offsetParent`'s own
 * `getBoundingClientRect()` to resolve to *something* (both are read
 * unconditionally on every `dragstart`, regardless of what a given test
 * is actually trying to isolate) without those specific numbers
 * mattering to that test's own assertion.
 */
const zeroRect = (): DOMRect => ({ bottom: 0, height: 0, left: 0, right: 0, toJSON: () => ({}), top: 0, width: 0, x: 0, y: 0 });

const createContext = (options: IUseGridItemDragOptions) => {
  let result!: IUseGridItemDragReturn;
  let rootEl!: HTMLDivElement;
  const view = render(<Harness onReady={(r, el) => { result = r; rootEl = el; }} options={options} />);

  // Real, non-`document.body` element, matching `dispatchDragEvent`'s own
  // established `test-helpers.ts` pattern — `offsetXYFromParentOf`
  // (`keystone-dashboard-layout-core`) special-cases `offsetParent ===
  // document.body` specifically (see that helper's own doc comment), so
  // a distinct stand-in element is what actually exercises its general
  // `getBoundingClientRect()`-reading path, not the `{left:0,top:0}`
  // short-circuit.
  const parentEl = document.createElement(`div`);
  Object.defineProperty(rootEl, `offsetParent`, { configurable: true, value: parentEl });
  vi.spyOn(rootEl, `getBoundingClientRect`).mockReturnValue(zeroRect());
  vi.spyOn(parentEl, `getBoundingClientRect`).mockReturnValue(zeroRect());

  /** The `__nativeDragHandler` test-only backdoor `createNativeDraggable` stashes on the element — see `native-interaction.ts`'s own doc comment on it. */
  const dispatch = (event: {
    type: `dragstart` | `dragmove` | `dragend`;
    clientX?: number;
    clientY?: number;
  }): void => {
    const handler = (rootEl as unknown as { __nativeDragHandler?: (e: unknown) => void }).__nativeDragHandler;
    // Same `act()` rationale as `useGridItemResize.hook.spec.tsx`'s own
    // identical `dispatch` — the native handler calls the hook's own
    // state setters directly, outside React's automatic batching.
    act(() => {
      handler?.({ clientX: 0, clientY: 0, target: rootEl, ...event });
    });
  };

  return {
    dispatch,
    get result() { return result; },
    parentEl,
    rerender: (nextOptions: IUseGridItemDragOptions) => {
      act(() => {
        view.rerender(<Harness onReady={(r, el) => { result = r; rootEl = el; }} options={nextOptions} />);
      });
    },
    rootEl,
    unmount: view.unmount,
  };
};

describe(`useGridItemDrag`, () => {
  it(`Should start with isDragging false, before any gesture at all`, () => {
    // Kills the BooleanLiteral mutant on this hook's own initial
    // `useState(false)` for `isDragging` — `useState(true)` would make
    // every freshly-mounted item report itself as mid-drag before any
    // gesture ever occurred.
    const { result } = createContext(defaultOptions());
    expect(result.isDragging).toBe(false);
  });

  describe(`dragstart geometry (LTR)`, () => {
    it(`Should compute newPosition.left/top from clientRect minus parentRect precisely, in LTR`, () => {
      // clientRect.left=155, parentRect.left=10 -> newPosition.left=145
      // -> x = round((145-10)/100) = round(1.35) = 1.
      // A "+" mutant on this same subtraction would instead give
      // 155+10=165 -> round(1.55)=2 — genuinely different.
      // clientRect.top=87, parentRect.top=5 -> newPosition.top=82
      // -> y = round((82-10)/160) = round(0.45) = 0.
      // A "+" mutant on THIS subtraction (in the dragstart branch
      // itself, distinct from calcXY's own arithmetic below) would give
      // 87+5=92 -> round(0.5125)=1 — also genuinely different.
      // Emptying either branch's own block entirely leaves
      // newPosition.left/top at their initial 0 -> x=round(-0.1)=0,
      // y=round(-0.0625)=0 — the x=0 case alone already differs from
      // the expected x=1 either way.
      const onDrag = vi.fn();
      const ctx = createContext(defaultOptions({ onDrag }));
      vi.spyOn(ctx.rootEl, `getBoundingClientRect`).mockReturnValue({ ...zeroRect(), left: 155, top: 87 });
      vi.spyOn(ctx.parentEl, `getBoundingClientRect`).mockReturnValue({ ...zeroRect(), left: 10, top: 5 });

      ctx.dispatch({ type: `dragstart` });

      expect(onDrag).toHaveBeenCalledWith(`item-1`, `dragstart`, 1, 0, 2, 2, 0, 0);
    });

    it(`Should compute calcXY's own y using (top - margin[1]) / (rowHeight + margin[1]), not +/- variants`, () => {
      // Same top=82 value as above, isolated here specifically to spell
      // out calcXY's own two distinct mutants (as opposed to the
      // dragstart-branch arithmetic the test above already covers):
      // numerator (top + margin[1]) -> round((82+10)/160)=round(0.575)=1
      // (vs correct 0), and denominator (rowHeight - margin[1]) ->
      // round((82-10)/140)=round(0.514)=1 (vs correct 0). Both differ
      // from the correct y=0 asserted here.
      const onDrag = vi.fn();
      const ctx = createContext(defaultOptions({ onDrag }));
      vi.spyOn(ctx.rootEl, `getBoundingClientRect`).mockReturnValue({ ...zeroRect(), left: 10, top: 87 });
      vi.spyOn(ctx.parentEl, `getBoundingClientRect`).mockReturnValue({ ...zeroRect(), left: 10, top: 5 });

      ctx.dispatch({ type: `dragstart` });

      const call = onDrag.mock.calls.at(-1);
      expect(call?.[3]).toBe(0);
    });
  });

  describe(`dragstart geometry (RTL / isMirrored)`, () => {
    it(`Should compute newPosition.left as (clientRect.right - parentRect.right) * -1, not any of the nearby arithmetic/conditional mutants`, () => {
      // clientRect.right=50, parentRect.right=200 ->
      // (50-200)*-1 = 150 -> x = round((150-10)/100) = round(1.4) = 1.
      //
      // Distinguishes every non-equivalent mutant on this one line:
      // - "(right + parentRight) * -1": (50+200)*-1=-250 -> clamps to 0.
      // - "(right - parentRight) * 1" (unary flip): (50-200)*1=-150 ->
      //   clamps to 0.
      // - the `if(isMirrored)` conditional forced to `false` (falls
      //   through to the LTR branch instead, reading clientRect.left/
      //   parentRect.left — deliberately set far apart, 999 vs 777,
      //   below — so that branch's own result is also clearly wrong):
      //   999-777=222 -> round((222-10)/100)=round(2.12)=2.
      // - emptying the mirrored branch's own block entirely: left stays
      //   at its initial 0 -> round((0-10)/100)=round(-0.1)=0.
      // (The remaining "/-1 instead of *-1" mutant on this same line is
      // a genuine equivalent — dividing by exactly -1 is bit-for-bit
      // identical to multiplying by -1 for every finite number, so no
      // test can ever distinguish it; left unaddressed deliberately,
      // not an oversight.)
      const onDrag = vi.fn();
      const ctx = createContext(defaultOptions({ isMirrored: true, onDrag }));
      vi.spyOn(ctx.rootEl, `getBoundingClientRect`).mockReturnValue({ ...zeroRect(), left: 999, right: 50 });
      vi.spyOn(ctx.parentEl, `getBoundingClientRect`).mockReturnValue({ ...zeroRect(), left: 777, right: 200 });

      ctx.dispatch({ type: `dragstart` });

      const call = onDrag.mock.calls.at(-1);
      expect(call?.[2]).toBe(1);
    });
  });

  describe(`dragmove — guards against a missing dragstart`, () => {
    it(`Should not throw when dragmove fires with no prior dragstart, isMirrored true (left branch)`, () => {
      // `draggingRef.current` is still `undefined` at this point (no
      // dragstart ever ran) — `Number(draggingRef.current?.left)`
      // safely resolves to `Number(undefined)` (NaN), while the
      // optional-chaining-removed mutant (`draggingRef.current.left`)
      // throws a real TypeError reading a property off `undefined`,
      // which Stryker's own test run catches as an uncaught exception.
      const ctx = createContext(defaultOptions({ isMirrored: true }));
      expect(() => ctx.dispatch({ clientX: 10, clientY: 10, type: `dragmove` })).not.toThrow();
    });

    it(`Should not throw when dragmove fires with no prior dragstart, isMirrored false (left branch) and the shared top calc`, () => {
      // Same rationale, exercising the LTR `left` branch's own optional
      // chaining and the always-run `top` calc's own optional chaining
      // together.
      const ctx = createContext(defaultOptions({ isMirrored: false }));
      expect(() => ctx.dispatch({ clientX: 10, clientY: 10, type: `dragmove` })).not.toThrow();
    });
  });

  describe(`dragmove — transformScale`, () => {
    it(`Should divide (not multiply) coreEvent.deltaY by transformScale`, () => {
      // dragstart at clientY=0 -> lastY.current=0, draggingRef.current.top=0
      // (both rects zeroed). dragmove at clientY=300 -> deltaY=300,
      // scaledDeltaY = 300/transformScale(2) = 150 -> top=0+150=150 ->
      // y=round((150-10)/160)=round(0.875)=1.
      // A "*" mutant instead gives scaledDeltaY=300*2=600 -> top=600 ->
      // y=round((600-10)/160)=round(3.6875)=4 — genuinely different
      // after rounding, and still different post-clamp (maxRows:
      // Infinity here, so nothing clamps either value away).
      const onDrag = vi.fn();
      const ctx = createContext(defaultOptions({ onDrag, transformScale: 2 }));
      ctx.dispatch({ clientX: 0, clientY: 0, type: `dragstart` });
      onDrag.mockClear();

      ctx.dispatch({ clientX: 0, clientY: 300, type: `dragmove` });

      const call = onDrag.mock.calls.at(-1);
      expect(call?.[3]).toBe(1);
    });
  });

  describe(`dragmove — isMirrored subtracts, LTR adds`, () => {
    it(`Should subtract (not add) the scaled deltaX from left when isMirrored, and the isMirrored conditional isn't force-false`, () => {
      // dragstart at clientX=100 -> lastX.current=100, draggingRef.current.left=0.
      // dragmove at clientX=180 -> deltaX=80, scaledDeltaX=80.
      // Correct (isMirrored, subtract): left=0-80=-80 ->
      // x=round((-80-10)/100)=round(-0.9)=-1, clamped to 0.
      // Either the arithmetic mutant (+ instead of -, still inside the
      // real isMirrored branch) or the conditional forced to `false`
      // (falls through to the LTR add branch instead) both give
      // left=0+80=80 -> x=round((80-10)/100)=round(0.7)=1 — clamped
      // value (0) still differs from the mutants' clamped value (1)
      // even after `Math.max(Math.min(x, cols-w), 0)`.
      const onDrag = vi.fn();
      const ctx = createContext(defaultOptions({ isMirrored: true, onDrag }));
      ctx.dispatch({ clientX: 100, clientY: 0, type: `dragstart` });
      onDrag.mockClear();

      ctx.dispatch({ clientX: 180, clientY: 0, type: `dragmove` });

      const call = onDrag.mock.calls.at(-1);
      expect(call?.[2]).toBe(0);
    });
  });

  // `isBounded`'s own rightBoundary arithmetic (`containerWidth -
  // calcGridItemWH(...)` mutated to `+`) was deliberately left
  // unaddressed after a real, worked-through attempt, not skipped for
  // lack of trying: `calcXY`'s own outer `Math.min(x, cols - w)` cap
  // structurally absorbs the difference between the two boundaries for
  // *any* `containerWidth` that's naturally consistent with its own
  // `cols` (which every valid config is, by construction — `colWidth`
  // is always derived from `containerWidth`/`cols` via the same
  // formula, never independent of it). Worked out algebraically, not
  // just by trial and error: for an item of width `w` clamped to the
  // container's own right edge, the resulting pre-cap `x` reduces to
  // `(cols - w) + 10/(colWidth + margin[0])` — always just barely
  // *above* `cols - w`, rounding back down to exactly `cols - w` for
  // any realistic `colWidth`. The mutant's own (wider) boundary produces
  // a substantially larger pre-cap `x`, but `Math.min` clamps it right
  // back down to the identical `cols - w` the correct code already
  // lands on — genuinely unkillable through this hook's own `onDrag`
  // output, confirmed via a real, reproduced test failure while trying
  // several different `containerWidth`/`cols` combinations, not assumed
  // from the algebra alone.

  describe(`dragend`, () => {
    it(`Should set isDragging back to false on dragend`, () => {
      // Kills the BooleanLiteral mutant on `setIsDragging(false)` here
      // specifically — distinct from the initial-state mutant on
      // useState's own default, since this one only fires along the
      // dragend path.
      const ctx = createContext(defaultOptions());
      ctx.dispatch({ type: `dragstart` });
      expect(ctx.result.isDragging).toBe(true);

      ctx.dispatch({ type: `dragend` });

      expect(ctx.result.isDragging).toBe(false);
    });
  });

  describe(`handleDrag — unrecognized event type`, () => {
    it(`Should not call onDrag at all for an event type outside dragstart/dragmove/dragend`, () => {
      // The `default: { return; }` case is what makes this a genuine
      // no-op — emptying that block (or otherwise defeating the early
      // return) would let execution fall through to the post-switch
      // code, which unconditionally calls `onDrag` with whatever
      // `calcXY` resolves the placeholder `{left:0,top:0}` to.
      const onDrag = vi.fn();
      const ctx = createContext(defaultOptions({ onDrag }));

      ctx.dispatch({ clientX: 0, clientY: 0, type: `bogus-event-type` as never });

      expect(onDrag).not.toHaveBeenCalled();
    });
  });

  describe(`autoScrollRef — lazy init`, () => {
    it(`Should construct the native auto-scroll engine exactly once, not on every render`, () => {
      // `if(!autoScrollRef.current) { autoScrollRef.current = createNativeAutoScroll(); }`
      // forced to `if(true)` would re-invoke the factory on every
      // single render of this hook, not just the first — observable
      // here via the mocked factory's own call count across a
      // same-instance re-render (a prop change, not a remount).
      mockCreateNativeAutoScroll.mockClear();
      const ctx = createContext(defaultOptions());
      expect(mockCreateNativeAutoScroll).toHaveBeenCalledTimes(1);

      ctx.rerender(defaultOptions({ enabled: false }));

      expect(mockCreateNativeAutoScroll).toHaveBeenCalledTimes(1);
    });
  });

  describe(`unmount — native engine teardown`, () => {
    it(`Should actually remove the pointerdown listener on unmount, not silently skip it`, () => {
      // The wiring effect's own cleanup function (`() => { native.destroy(); }`)
      // emptied entirely would mean `removeEventListener('pointerdown', ...)`
      // never gets called at all when this hook unmounts.
      const ctx = createContext(defaultOptions());
      const removeSpy = vi.spyOn(ctx.rootEl, `removeEventListener`);

      ctx.unmount();

      expect(removeSpy).toHaveBeenCalledWith(`pointerdown`, expect.any(Function));
    });
  });

  describe(`onItemMoved`, () => {
    it(`Should report a drag that changed only the row, ending in the column the item started in`, () => {
      // The item starts in cell (0, 0). A drag straight down keeps x at 0 and lands in row 2 (top 300 -> round((300 - 10) / 160)), so the
      // x comparison alone would call this "not moved": only the y comparison can tell.
      const onItemMoved = vi.fn();
      const ctx = createContext(defaultOptions({ onItemMoved }));
      ctx.dispatch({ clientX: 0, clientY: 0, type: `dragstart` });
      ctx.dispatch({ clientX: 0, clientY: 300, type: `dragmove` });

      ctx.dispatch({ clientX: 0, clientY: 300, type: `dragend` });

      expect(onItemMoved).toHaveBeenCalledTimes(1);
      expect(onItemMoved).toHaveBeenCalledWith({ i: `item-1`, x: 0, y: 2 });
    });
  });
});
