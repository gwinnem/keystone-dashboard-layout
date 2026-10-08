import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import { useGridItemDrag } from '../src/components/Grid/composables/useGridItemDrag';
import { EGridItemEvent } from '@/core/griditem/enums/EGridItemEvents';
import type { IGridItemDragContext } from '../src/components/Grid/composables/grid-item-composable-context';
import type { IGridItemProps } from '../src/components/Grid/grid-item-props.interface';

/**
 * Targets mutants that survived Stryker against `useGridItemDrag.ts`
 * (see `reports/mutation/mutation.json`). Kept apart from
 * `useGridItemDrag.spec.ts` because each test here exists for one
 * specific surviving mutant.
 *
 * Fixture numbers: containerWidth 1210, margin [10, 10], rowHeight 150,
 * 12 columns -> colWidth 90, column step 100, row step 160. The item's
 * own rect is {left: 5, right: 100, top: 5}, its parent's all zeros.
 */
const createContext = (
  propOverrides: Partial<IGridItemProps> = {},
  rtl = false,
  transformScale = 1,
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
    cols: ref(12),
    containerWidth: ref(1210),
    editModeEnabled: ref(true),
    emit,
    eventBus,
    gridItem,
    innerH: ref(props.h),
    innerW: ref(props.w),
    innerX: ref(props.x),
    innerY: ref(props.y),
    isResizing: ref(false),
    margin: ref([10, 10]),
    maxRows: ref(Infinity),
    props,
    renderRtl: computed(() => rtl),
    resizeHandleRefs: {
      e: ref(null), n: ref(null), ne: ref(null), nw: ref(null),
      s: ref(null), se: ref(null), sw: ref(null), w: ref(null),
    },
    resizeHandles: ref([`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`]),
    rowHeight: ref(150),
    transformScale: ref(transformScale),
  };

  const helper = useGridItemDrag(ctx);
  helper.tryMakeDraggable();

  Object.defineProperty(gridItem.value, `offsetParent`, { configurable: true, value: document.body });
  document.body.getBoundingClientRect = () => (
    { bottom: 0, height: 0, left: 0, right: 0, toJSON: () => ({}), top: 0, width: 0, x: 0, y: 0 }
  );
  gridItem.value.getBoundingClientRect = () => (
    { bottom: 100, height: 95, left: 5, right: 100, toJSON: () => ({}), top: 5, width: 95, x: 5, y: 5 }
  );

  const dispatch = (event: { type: string; clientX?: number; clientY?: number }): void => {
    const handler = (gridItem.value as unknown as { __nativeDragHandler?: (e: unknown) => void }).__nativeDragHandler;
    handler?.({ clientX: 0, clientY: 0, target: gridItem.value, ...event });
  };

  return { ctx, dispatch, emit, gridItem, helper };
};

/** A real native `pointerdown` — the engine consults `getOptions().enabled` before doing anything else, so `setPointerCapture` being called is what shows it was enabled. */
const pointerDown = (element: HTMLElement): ReturnType<typeof vi.fn> => {
  const capture = vi.fn();
  element.setPointerCapture = capture;
  const event = new MouseEvent(`pointerdown`, { bubbles: true, button: 0 });
  Object.defineProperty(event, `pointerId`, { value: 1 });
  Object.defineProperty(event, `pointerType`, { value: `mouse` });

  // An exception thrown inside a DOM listener never reaches dispatchEvent's caller: jsdom
  // reports it on `window` instead, where the test runner treats it as a crash of the whole
  // run rather than a failed test. Catching it here turns it back into an ordinary failure.
  let listenerError: unknown;
  const onError = (errorEvent: ErrorEvent): void => {
    listenerError = errorEvent.error ?? errorEvent.message;
    errorEvent.preventDefault();
  };
  window.addEventListener(`error`, onError);
  try {
    element.dispatchEvent(event);
  } finally {
    window.removeEventListener(`error`, onError);
  }
  if(listenerError) {
    throw listenerError;
  }
  return capture;
};

describe(`useGridItemDrag — mutation-testing gap coverage`, () => {
  describe(`calcXY`, () => {
    it(`Should use the margin on both sides of the column and row step`, () => {
      const { helper } = createContext();

      // x: (350 - 10) / 100 = 3.4 -> 3 (a `+ margin` would give 3.6 -> 4)
      // y: (394 - 10) / 160 = 2.4 -> 2 (a `+ margin` would give 2.53 -> 3, a `rowHeight - margin` 2.74 -> 3)
      expect(helper.calcXY(394, 350)).toEqual({ x: 3, y: 2 });
    });
  });

  describe(`transformScale`, () => {
    it(`Should divide the pointer delta by transformScale in LTR, for both axes`, () => {
      const { dispatch, helper } = createContext({}, false, 2);

      dispatch({ clientX: 0, clientY: 0, type: `dragstart` });
      dispatch({ clientX: 40, clientY: 40, type: `dragmove` });

      // start (5 / 2, 5 / 2) = (2.5, 2.5); delta 40 / 2 = 20 each
      expect(helper.dragging.value).toEqual({ left: 22.5, top: 22.5 });
    });

    it(`Should divide the pointer delta by transformScale in RTL too`, () => {
      const { dispatch, helper } = createContext({}, true, 2);

      dispatch({ clientX: 0, clientY: 0, type: `dragstart` });
      dispatch({ clientX: 40, clientY: 40, type: `dragmove` });

      // start left = (100 / 2 - 0) * -1 = -50; delta 40 / 2 = 20 moves it further negative
      expect(helper.dragging.value).toEqual({ left: -70, top: 22.5 });
    });

    it(`Should not throw on an RTL dragmove that arrives before any dragstart`, () => {
      const { dispatch } = createContext({}, true);

      expect(() => dispatch({ clientX: 10, clientY: 10, type: `dragmove` })).not.toThrow();
    });
  });

  describe(`auto-scroll`, () => {
    let frameCallback: FrameRequestCallback | undefined;

    beforeEach(() => {
      frameCallback = undefined;
      Object.defineProperty(document, `scrollingElement`, { configurable: true, get: () => document.body });
      vi.spyOn(globalThis, `requestAnimationFrame`).mockImplementation(callback => {
        frameCallback = callback;
        return 1;
      });
      vi.spyOn(globalThis, `cancelAnimationFrame`).mockImplementation(() => undefined);
    });

    afterEach(() => {
      delete (document as { scrollingElement?: unknown }).scrollingElement;
      vi.restoreAllMocks();
    });

    it(`Should not start tracking at dragstart when autoScroll is off`, () => {
      const { dispatch } = createContext({ autoScroll: false });

      dispatch({ clientX: 0, clientY: 0, type: `dragstart` });

      expect(globalThis.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it(`Should feed the pointer position to the scroller on every dragmove when autoScroll is on`, () => {
      const { dispatch } = createContext({ autoScroll: true });
      const scrollBy = vi.fn();
      document.body.scrollBy = scrollBy as unknown as typeof document.body.scrollBy;
      document.body.getBoundingClientRect = () => (
        { bottom: 1000, height: 1000, left: 0, right: 1000, toJSON: () => ({}), top: 0, width: 1000, x: 0, y: 0 }
      );

      dispatch({ clientX: 0, clientY: 0, type: `dragstart` });
      dispatch({ clientX: 5, clientY: 500, type: `dragmove` });
      frameCallback!();

      // 5px from the left edge: -12 * (1 - 5 / 40) = -10.5. Without the update the scroller
      // would still believe the pointer is at x = 0 and scroll the full -12.
      expect(scrollBy).toHaveBeenCalledWith(-10.5, 0);
    });
  });

  describe(`which move events get reported`, () => {
    it(`Should report a MOVE when only y changed`, () => {
      const { dispatch, emit } = createContext();

      dispatch({ clientX: 0, clientY: 0, type: `dragstart` });
      dispatch({ clientX: 0, clientY: 200, type: `dragmove` });

      // top 5 + 200 = 205 -> round(195 / 160) = 1; left stays 5 -> x stays 0
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.MOVE, `item-1`, 0, 1);
    });

    it(`Should report MOVED at dragend when only y differs from where the drag started`, () => {
      const { ctx, dispatch, emit } = createContext();

      dispatch({ clientX: 0, clientY: 0, type: `dragstart` });
      ctx.innerY.value = 1; // the parent layout's round trip, mid-gesture
      dispatch({ clientX: 0, clientY: 0, type: `dragend` });

      expect(emit.mock.calls.some(call => call[0] === EGridItemEvent.MOVED)).toBe(true);
    });

    it(`Should not report MOVED before the gesture ends, even if the grid has already moved the item mid-gesture`, () => {
      const { ctx, dispatch, emit } = createContext();

      dispatch({ clientX: 0, clientY: 0, type: `dragstart` });
      ctx.innerX.value = 1;
      dispatch({ clientX: 10, clientY: 0, type: `dragmove` });

      expect(emit.mock.calls.some(call => call[0] === EGridItemEvent.MOVED)).toBe(false);
    });
  });

  describe(`wiring the native drag engine`, () => {
    it(`Should start a drag only while the item is draggable and not static`, () => {
      const draggable = createContext();
      draggable.helper.draggable.value = true;
      const notYetResolved = createContext();
      const isStatic = createContext({ isStatic: true });
      isStatic.helper.draggable.value = true;

      expect(pointerDown(draggable.gridItem.value)).toHaveBeenCalled();
      expect(pointerDown(notYetResolved.gridItem.value)).not.toHaveBeenCalled();
      expect(pointerDown(isStatic.gridItem.value)).not.toHaveBeenCalled();
    });

    it(`Should stop listening once torn down, and tolerate a second teardown`, () => {
      const { gridItem, helper } = createContext();
      helper.draggable.value = true;

      helper.teardownDraggable();

      expect(pointerDown(gridItem.value)).not.toHaveBeenCalled();
      expect(() => helper.teardownDraggable()).not.toThrow();
    });

    // Several watchers call tryMakeDraggable() repeatedly. Without its "already wired" guard
    // each call would attach another engine to the same element, so one pointerdown would start
    // one gesture per call — and in the full component suite that pile-up crashes the test
    // worker outright, which a mutation run can only report as an error, never as a kill.
    it(`Should not attach a second engine when tryMakeDraggable runs again`, () => {
      const { gridItem, helper } = createContext();
      helper.draggable.value = true;

      helper.tryMakeDraggable();
      helper.tryMakeDraggable();

      expect(pointerDown(gridItem.value)).toHaveBeenCalledTimes(1);
    });
  });
});
