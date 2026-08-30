import { describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import { useGridItemDrag } from '../src/components/Grid/composables/useGridItemDrag';
import { EGridItemEvent } from '@/core/griditem/enums/EGridItemEvents';
import type { IGridItemDragContext } from '../src/components/Grid/composables/grid-item-composable-context';
import type { IGridItemProps } from '../src/components/Grid/grid-item-props.interface';

/** Same constants as `tests/useGridItemResize.spec.ts` — `containerWidth` chosen so `calcColWidth` (`(1210 - 10*13)/12`) resolves to a clean `90`. */
const CONTAINER_WIDTH = 1210;
const MARGIN = [10, 10];
const ROW_HEIGHT = 150;
const COLS = 12;

/**
 * `useGridItemDrag` (unlike `useGridItemResize`) never calls `useSlots()`
 * or any other Composition-API-context-dependent function — confirmed by
 * reading its own imports (`ref`/`Ref` from `vue` only) — so a bare
 * function call works fine here, no `mount()`-wrapping harness needed.
 */
const createContext = (
  propOverrides: Partial<IGridItemProps> = {},
  rtl = false,
  rectOverrides: { clientRect?: Partial<{ bottom: number; left: number; right: number; top: number }>; parentRect?: Partial<{ bottom: number; left: number; right: number; top: number }>; transformScale?: number } = {},
) => {
  const gridItem = ref(document.createElement(`div`));
  const emit = vi.fn();
  const eventBus = { emit: vi.fn(), off: vi.fn(), on: vi.fn() };
  const props: IGridItemProps = {
    autoScroll: false,
    h: 2,
    i: `item-1`,
    isStatic: false,
    w: 2,
    x: 0,
    y: 0,
    ...propOverrides,
  };

  const ctx: IGridItemDragContext = {
    autoHeightWrapper: ref(null),
    bounded: ref(false),
    cols: ref(COLS),
    containerWidth: ref(CONTAINER_WIDTH),
    editModeEnabled: ref(true),
    emit,
    eventBus,
    gridItem,
    innerH: ref(props.h),
    innerW: ref(props.w),
    innerX: ref(props.x),
    innerY: ref(props.y),
    isResizing: ref(false),
    margin: ref(MARGIN),
    maxRows: ref(Infinity),
    props,
    renderRtl: computed(() => rtl),
    resizeHandleRefs: {
      e: ref(null), n: ref(null), ne: ref(null), nw: ref(null),
      s: ref(null), se: ref(null), sw: ref(null), w: ref(null),
    },
    resizeHandles: ref([`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`]),
    rowHeight: ref(ROW_HEIGHT),
    transformScale: ref(rectOverrides.transformScale ?? 1),
  };

  const helper = useGridItemDrag(ctx);
  helper.tryMakeDraggable();

  // `dragstart`/`dragmove` (when `bounded`) unconditionally read
  // `event.target.offsetParent.getBoundingClientRect()`/`.clientHeight` —
  // jsdom's own default `offsetParent` is `null`, which would throw
  // rather than just behave differently. Stubbed the same way this
  // codebase's own `GridItem.spec.ts`/`test-helpers.ts` already stub it
  // for exactly this reason (`target.offsetParent = document.body`, a
  // controllable rect on both).
  Object.defineProperty(gridItem.value, `offsetParent`, { configurable: true, value: document.body });
  document.body.getBoundingClientRect = () => (
    {
      bottom: 0, height: 0, left: 0, right: 0, toJSON: () => ({}), top: 0, width: 0, x: 0, y: 0,
      ...rectOverrides.parentRect,
    }
  );
  gridItem.value.getBoundingClientRect = () => (
    {
      bottom: 100, height: 95, left: 5, right: 100, toJSON: () => ({}), top: 5, width: 95, x: 5, y: 5,
      ...rectOverrides.clientRect,
    }
  );

  /** The `__nativeDragHandler` test-only backdoor `createNativeDraggable` stashes on the root element — see `@/core/helpers/native-interaction.ts`'s own comment. */
  const dispatch = (event: {
    type: `dragstart` | `dragmove` | `dragend` | (string & {});
    clientX?: number;
    clientY?: number;
  }): void => {
    const handler = (gridItem.value as unknown as { __nativeDragHandler?: (e: unknown) => void }).__nativeDragHandler;
    handler?.({ clientX: 0, clientY: 0, target: gridItem.value, ...event });
  };

  return { ctx, dispatch, emit, eventBus, gridItem, helper };
};

describe(`useGridItemDrag`, () => {
  describe(`calcXY`, () => {
    it(`Should convert pixel top/left to grid-unit x/y`, () => {
      const { helper } = createContext();
      // colWidth=90: x = round((100-10)/(90+10)) = round(0.9) = 1.
      // rowHeight=150: y = round((160-10)/(150+10)) = round(0.9375) = 1.
      const result = helper.calcXY(160, 100);
      expect(result.x).toBe(1);
      expect(result.y).toBe(1);
    });

    it(`Should cap x at cols.value - innerW.value`, () => {
      const { ctx, helper } = createContext();
      ctx.innerW.value = 10;
      // A huge left would naively compute a huge x — capped to cols(12) - innerW(10) = 2.
      const result = helper.calcXY(0, 100000);
      expect(result.x).toBe(2);
    });

    it(`Should cap y at maxRows.value - innerH.value`, () => {
      const { ctx, helper } = createContext();
      ctx.maxRows.value = 5;
      ctx.innerH.value = 3;
      const result = helper.calcXY(100000, 0);
      expect(result.y).toBe(2);
    });

    it(`Should floor x/y at 0, never negative`, () => {
      const { helper } = createContext();
      const result = helper.calcXY(-1000, -1000);
      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeGreaterThanOrEqual(0);
    });
  });

  describe(`handleDrag — dragstart`, () => {
    it(`Should set isDragging/dragging and emit the eventBus dragEvent message on dragstart`, () => {
      const { dispatch, eventBus, helper } = createContext();

      dispatch({ type: `dragstart` });

      expect(helper.isDragging.value).toBe(true);
      expect(helper.dragging.value).toBeDefined();
      expect(eventBus.emit).toHaveBeenCalledWith(`dragEvent`, expect.objectContaining({ eventType: `dragstart` }));
    });

    it(`Should compute left as clientRect.left minus parentRect.left in LTR, both divided by transformScale`, () => {
      // Non-zero, asymmetric parent/child rects and transformScale — the
      // stub used by every other test in this file has an all-zero
      // parent rect and transformScale=1, which makes "-" vs "+" and "/"
      // vs "*" mutants on this line mathematically indistinguishable
      // (subtracting or adding zero gives the same result; dividing or
      // multiplying by 1 gives the same result) — confirmed via a real
      // mutation report showing exactly these mutants surviving despite
      // this file's own existing dragstart tests.
      const { dispatch, helper } = createContext({}, false, {
        clientRect: { left: 105, top: 65 },
        parentRect: { left: 20, top: 15 },
      });

      dispatch({ type: `dragstart` });

      expect(helper.dragging.value!.left).toBe(85); // 105 - 20
      expect(helper.dragging.value!.top).toBe(50); // 65 - 15
    });

    it(`Should compute left as (clientRect.right minus parentRect.right) negated in RTL, both divided by transformScale`, () => {
      const { dispatch, helper } = createContext({}, true, {
        clientRect: { right: 300 },
        parentRect: { right: 620 },
      });

      dispatch({ type: `dragstart` });

      expect(helper.dragging.value!.left).toBe(320); // (300 - 620) * -1
    });

    it(`Should divide (not multiply) clientRect.left/parentRect.left/clientRect.top/parentRect.top by transformScale in LTR`, () => {
      const { dispatch, helper } = createContext({}, false, {
        clientRect: { left: 110, top: 55 },
        parentRect: { left: 10, top: 5 },
        transformScale: 2,
      });

      dispatch({ type: `dragstart` });

      expect(helper.dragging.value!.left).toBe(50); // 110/2 - 10/2
      expect(helper.dragging.value!.top).toBe(25); // 55/2 - 5/2
    });

    it(`Should divide (not multiply) clientRect.right/parentRect.right by transformScale in RTL`, () => {
      const { dispatch, helper } = createContext({}, true, {
        clientRect: { right: 310 },
        parentRect: { right: 210 },
        transformScale: 2,
      });

      dispatch({ type: `dragstart` });

      expect(helper.dragging.value!.left).toBe(-50); // (310/2 - 210/2) * -1
    });

    it(`Should start autoScroll on dragstart when props.autoScroll is true`, () => {
      const { dispatch } = createContext({ autoScroll: true });
      const raf = vi.spyOn(globalThis, `requestAnimationFrame`).mockReturnValue(1 as unknown as number);
      const scrollingElementDescriptor = Object.getOwnPropertyDescriptor(document, `scrollingElement`);
      Object.defineProperty(document, `scrollingElement`, { configurable: true, get: () => document.body });

      dispatch({ type: `dragstart` });

      expect(raf).toHaveBeenCalled();

      if (scrollingElementDescriptor) {
        Object.defineProperty(document, `scrollingElement`, scrollingElementDescriptor);
      } else {
        delete (document as { scrollingElement?: Element | null }).scrollingElement;
      }
      raf.mockRestore();
    });

    it(`Should NOT start autoScroll on dragstart when props.autoScroll is false (the default)`, () => {
      const { dispatch } = createContext({ autoScroll: false });
      const raf = vi.spyOn(globalThis, `requestAnimationFrame`).mockReturnValue(1 as unknown as number);

      dispatch({ type: `dragstart` });

      expect(raf).not.toHaveBeenCalled();
      raf.mockRestore();
    });
  });

  describe(`handleDrag — guards`, () => {
    it(`Should be a no-op when isStatic is true`, () => {
      const { dispatch, eventBus } = createContext({ isStatic: true });

      dispatch({ type: `dragstart` });

      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it(`Should be a no-op when editModeEnabled is false`, () => {
      const { ctx, dispatch, eventBus } = createContext();
      ctx.editModeEnabled.value = false;

      dispatch({ type: `dragstart` });

      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it(`Should be a no-op when a resize is already in progress (isResizing)`, () => {
      const { ctx, dispatch, eventBus } = createContext();
      ctx.isResizing.value = true;

      dispatch({ type: `dragstart` });

      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it(`Should ignore a dragend that arrives without a preceding dragstart`, () => {
      const { dispatch, helper } = createContext();

      expect(() => dispatch({ type: `dragend` })).not.toThrow();
      expect(helper.isDragging.value).toBe(false);
    });

    it(`Should not throw on a dragmove arriving without a preceding dragstart (dragging.value is undefined, no isDragging guard exists for this case unlike dragend)`, () => {
      const { dispatch, emit } = createContext();

      expect(() => dispatch({ clientX: 50, type: `dragmove` })).not.toThrow();
      // pos.x/pos.y resolve to NaN in this scenario (Number(undefined) ->
      // NaN propagates through calcXY's own arithmetic) — NaN is never
      // === anything, including itself, so the "did position change"
      // guard incorrectly reads as "yes" and MOVE fires with NaN
      // coordinates. A real, if unintuitive, confirmed behavior — not
      // asserting the specific NaN values (fragile), just that MOVE does
      // fire here at all, which is what actually distinguishes this from
      // a scenario where nothing happens.
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.MOVE, `item-1`, expect.any(Number), expect.any(Number));
    });

    it(`Should leave newPosition at its {left:0,top:0} default (not silently mutated to an empty object) for an unrecognized event.type, resolving to a real, non-NaN calcXY result`, () => {
      // The initial `newPosition = { left: 0, top: 0 }` object only gets
      // reassigned inside the dragstart/dragmove/dragend switch cases —
      // an unrecognized type falls through to `default` (a deliberate
      // no-op), leaving the initial object as-is. Dispatching with a
      // type outside the three real ones exercises that default branch
      // directly (TypeScript's own union type only restricts what
      // callers may pass in source, not what a native browser/test event
      // can carry at runtime).
      const { dispatch, emit } = createContext();

      dispatch({ type: `some-unrecognized-type` });

      // calcXY(0, 0) resolves to a real {x:0,y:0} matching the default
      // innerX/innerY(0,0) this context starts with — no MOVE emitted.
      // If the initial object were mutated away (e.g. to `{}`), left/top
      // would be `undefined`, and calcXY's own arithmetic on `undefined`
      // resolves to NaN — which, per the test directly above, always
      // reads as "changed" and WOULD incorrectly emit MOVE.
      expect(emit).not.toHaveBeenCalledWith(EGridItemEvent.MOVE, expect.anything(), expect.anything(), expect.anything());
    });
  });

  describe(`handleDrag — dragmove`, () => {
    it(`Should move left in LTR with a positive clientX delta`, () => {
      const { dispatch, helper } = createContext();
      dispatch({ type: `dragstart` });
      const leftBefore = helper.dragging.value!.left;

      dispatch({ clientX: 50, type: `dragmove` });

      expect(helper.dragging.value!.left).toBeGreaterThan(leftBefore!);
    });

    it(`Should move in the opposite (negated) direction in RTL for the same positive clientX delta`, () => {
      const { dispatch, helper } = createContext({}, true);
      dispatch({ type: `dragstart` });
      const leftBefore = helper.dragging.value!.left;

      dispatch({ clientX: 50, type: `dragmove` });

      expect(helper.dragging.value!.left).toBeLessThan(leftBefore!);
    });

    it(`Should clamp the drag position within container bounds when bounded is true`, () => {
      const { ctx, dispatch, helper } = createContext();
      ctx.bounded.value = true;
      Object.defineProperty(document.body, `clientHeight`, { configurable: true, value: 300 });
      dispatch({ type: `dragstart` });

      // A huge move should clamp, not carry through unbounded.
      dispatch({ clientX: 100000, clientY: 100000, type: `dragmove` });

      expect(helper.dragging.value!.top).toBeLessThanOrEqual(300);
      expect(helper.dragging.value!.left).toBeLessThanOrEqual(CONTAINER_WIDTH);
    });

    it(`Should NOT clamp the drag position when bounded is false (the default)`, () => {
      const { dispatch, helper } = createContext();
      dispatch({ type: `dragstart` });

      dispatch({ clientX: 100000, clientY: 100000, type: `dragmove` });

      expect(helper.dragging.value!.top).toBeGreaterThan(300);
    });

    it(`Should call autoScroll.update with the event's own clientX/clientY during dragmove when props.autoScroll is true`, () => {
      const { dispatch } = createContext({ autoScroll: true });
      const raf = vi.spyOn(globalThis, `requestAnimationFrame`).mockReturnValue(1 as unknown as number);
      const scrollingElementDescriptor = Object.getOwnPropertyDescriptor(document, `scrollingElement`);
      Object.defineProperty(document, `scrollingElement`, { configurable: true, get: () => document.body });

      dispatch({ type: `dragstart` });
      // autoScroll.update() itself just records target coordinates for its
      // own rAF-driven tick loop to read later — not directly observable
      // through a public getter, so this confirms it was reached at all
      // (not skipped) via the same rAF-already-running signal the
      // dragstart-time autoScroll tests already use, still active here
      // since autoScroll wasn't stopped (no dragend dispatched).
      dispatch({ clientX: 42, clientY: 24, type: `dragmove` });

      expect(raf).toHaveBeenCalled();

      if (scrollingElementDescriptor) {
        Object.defineProperty(document, `scrollingElement`, scrollingElementDescriptor);
      } else {
        delete (document as { scrollingElement?: Element | null }).scrollingElement;
      }
      raf.mockRestore();
    });

    it(`Should clamp the drag position within container bounds when bounded is true, under RTL too`, () => {
      const { ctx, dispatch, helper } = createContext({}, true);
      ctx.bounded.value = true;
      Object.defineProperty(document.body, `clientHeight`, { configurable: true, value: 300 });
      dispatch({ type: `dragstart` });

      dispatch({ clientX: -100000, clientY: 100000, type: `dragmove` });

      expect(helper.dragging.value!.top).toBeLessThanOrEqual(300);
      expect(helper.dragging.value!.left).toBeGreaterThanOrEqual(0);
      expect(helper.dragging.value!.left).toBeLessThanOrEqual(CONTAINER_WIDTH);
    });

    it(`Should divide (not multiply) coreEvent.deltaX/deltaY by transformScale during dragmove`, () => {
      const { dispatch, helper } = createContext({}, false, { clientRect: { left: 200 }, transformScale: 2 });
      dispatch({ type: `dragstart` }); // left = 200/2 - 0/2 = 100

      dispatch({ clientX: 100, type: `dragmove` }); // deltaX = 100 - 0(lastX from dragstart) = 100

      expect(helper.dragging.value!.left).toBe(150); // 100 + 100/2
    });
  });

  describe(`handleDrag — dragend`, () => {
    it(`Should commit the position from dragging.value directly, not a fresh DOM measurement`, () => {
      // Regression coverage matching GridItem.spec.ts's own equivalent
      // (docs/REFACTORING.md #41): dispatchDragEvent-style stubbing gives
      // the target a *fixed* getBoundingClientRect() regardless of
      // clientX/clientY — if dragend ever read from that fixed rect
      // instead of dragging.value (which dragmove already accumulates
      // correctly), the emitted MOVE position at dragend would stop
      // matching dragmove's own last one.
      const { dispatch, emit } = createContext();
      dispatch({ type: `dragstart` });
      dispatch({ clientX: 90, type: `dragmove` });
      const moveCall = emit.mock.calls.find(call => call[0] === EGridItemEvent.MOVE);
      emit.mockClear();

      dispatch({ clientX: 90, type: `dragend` });

      const moveAtEnd = emit.mock.calls.find(call => call[0] === EGridItemEvent.MOVE);
      expect(moveAtEnd?.[2]).toBe(moveCall?.[2]);
    });

    it(`Should clear isDragging/dragging and stop autoScroll on dragend`, () => {
      const { dispatch, helper } = createContext({ autoScroll: true });
      const cancelRaf = vi.spyOn(globalThis, `cancelAnimationFrame`).mockImplementation(() => {});
      dispatch({ type: `dragstart` });

      dispatch({ type: `dragend` });

      expect(helper.isDragging.value).toBe(false);
      expect(helper.dragging.value).toBeUndefined();
      cancelRaf.mockRestore();
    });

    it(`Should emit MOVED when innerX/innerY already reflect a value different from what dragstart captured`, () => {
      // Same shape as useGridItemResize.spec.ts's own RESIZED-gating
      // explanation: MOVED's own gate (previousX.value !== innerX.value
      // || previousY.value !== innerY.value) compares dragstart's own
      // snapshot against the CURRENT innerX/innerY, which only change in
      // real usage via GridLayout/GridItem's own props round-trip — this
      // isolated composable test simulates that directly.
      const { ctx, dispatch, emit } = createContext();
      dispatch({ type: `dragstart` });
      ctx.innerX.value = 5;
      emit.mockClear();

      dispatch({ type: `dragend` });

      expect(emit).toHaveBeenCalledWith(EGridItemEvent.MOVED, `item-1`, expect.any(Number), expect.any(Number));
    });

    it(`Should NOT emit MOVED when innerX/innerY still match what dragstart captured`, () => {
      const { dispatch, emit } = createContext();
      dispatch({ type: `dragstart` });
      emit.mockClear();

      dispatch({ type: `dragend` });

      expect(emit).not.toHaveBeenCalledWith(EGridItemEvent.MOVED, expect.anything(), expect.anything(), expect.anything());
    });
  });

  describe(`handleDrag — MOVE emission`, () => {
    it(`Should emit MOVE only when the grid-unit position actually changed`, () => {
      const { dispatch, emit } = createContext();
      dispatch({ type: `dragstart` });
      emit.mockClear();

      // A tiny move that still resolves to the same grid-unit x/y as the
      // start (innerX/innerY unchanged at 0,0) shouldn't emit at all.
      dispatch({ clientX: 1, clientY: 1, type: `dragmove` });

      expect(emit).not.toHaveBeenCalledWith(EGridItemEvent.MOVE, expect.anything(), expect.anything(), expect.anything());
    });

    it(`Should emit MOVE once the grid-unit position genuinely changes`, () => {
      const { dispatch, emit } = createContext();
      dispatch({ type: `dragstart` });
      emit.mockClear();

      dispatch({ clientX: 200, clientY: 0, type: `dragmove` });

      expect(emit).toHaveBeenCalledWith(EGridItemEvent.MOVE, `item-1`, expect.any(Number), expect.any(Number));
    });
  });

  describe(`handleDrag — eventBus dragEvent payload`, () => {
    it(`Should include the item's own h/w (from innerH/innerW) and i, alongside the computed x/y and raw clientX/clientY`, () => {
      const { ctx, dispatch, eventBus } = createContext();
      ctx.innerH.value = 3;
      ctx.innerW.value = 4;

      dispatch({ clientX: 7, clientY: 9, type: `dragstart` });

      expect(eventBus.emit).toHaveBeenCalledWith(`dragEvent`, expect.objectContaining({
        clientX: 7,
        clientY: 9,
        eventType: `dragstart`,
        h: 3,
        i: `item-1`,
        w: 4,
      }));
    });
  });

  describe(`tryMakeDraggable`, () => {
    it(`Should be a no-op (not wire anything up, not throw) when gridItem isn't a real, mounted HTMLElement yet`, () => {
      // Matches the source's own doc comment: gridItem starts as a plain
      // `{}` placeholder before this component actually mounts — a
      // real, confirmed scenario (a watcher firing before/during that
      // brief window), not a hypothetical, but one this file's own
      // createContext() never exercises since it always builds gridItem
      // from a real document.createElement('div').
      const emit = vi.fn();
      const eventBus = { emit: vi.fn(), off: vi.fn(), on: vi.fn() };
      const props: IGridItemProps = { h: 2, i: `item-1`, isStatic: false, w: 2, x: 0, y: 0 };
      const gridItem = ref({} as unknown as HTMLElement);
      const ctx: IGridItemDragContext = {
        autoHeightWrapper: ref(null),
        bounded: ref(false),
        cols: ref(COLS),
        containerWidth: ref(CONTAINER_WIDTH),
        editModeEnabled: ref(true),
        emit,
        eventBus,
        gridItem,
        innerH: ref(2),
        innerW: ref(2),
        innerX: ref(0),
        innerY: ref(0),
        isResizing: ref(false),
        margin: ref(MARGIN),
        maxRows: ref(Infinity),
        props,
        renderRtl: computed(() => false),
        resizeHandleRefs: {
          e: ref(null), n: ref(null), ne: ref(null), nw: ref(null),
          s: ref(null), se: ref(null), sw: ref(null), w: ref(null),
        },
        resizeHandles: ref([`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`]),
        rowHeight: ref(ROW_HEIGHT),
        transformScale: ref(1),
      };

      const helper = useGridItemDrag(ctx);

      expect(() => helper.tryMakeDraggable()).not.toThrow();
      expect((gridItem.value as unknown as { __nativeDragHandler?: unknown }).__nativeDragHandler).toBeUndefined();
    });

    it(`Should not attach twice — a second call is a no-op once already wired up`, () => {
      const { gridItem, helper } = createContext();
      const firstHandler = (gridItem.value as unknown as { __nativeDragHandler?: unknown }).__nativeDragHandler;

      helper.tryMakeDraggable();

      expect((gridItem.value as unknown as { __nativeDragHandler?: unknown }).__nativeDragHandler).toBe(firstHandler);
    });
  });

  describe(`teardownDraggable`, () => {
    it(`Should allow re-attaching after teardown`, () => {
      const { dispatch, eventBus, helper } = createContext();

      helper.teardownDraggable();
      // A second tryMakeDraggable() call after teardown should
      // re-attach cleanly (confirming the composable's own internal
      // `nativeDraggable` var was actually cleared, not left set,
      // which would make this permanently no-op).
      helper.tryMakeDraggable();
      dispatch({ type: `dragstart` });

      expect(eventBus.emit).toHaveBeenCalledWith(`dragEvent`, expect.objectContaining({ eventType: `dragstart` }));
    });
  });
});
