import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, ref } from 'vue';
import type { Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useGridItemResize } from '../src/components/Grid/composables/useGridItemResize';
import { EGridItemEvent } from '@/core/griditem/enums/EGridItemEvents';
import type { TResizeHandle } from '@/core/helpers/native-interaction';
import type { IGridItemComposableContext } from '../src/components/Grid/composables/grid-item-composable-context';
import type { IGridItemProps } from '../src/components/Grid/grid-item-props.interface';

/**
 * Targets mutants that survived Stryker against `useGridItemResize.ts`
 * (see `reports/mutation/mutation.json`). Kept apart from
 * `useGridItemResize.spec.ts` because each test here exists for one
 * specific surviving mutant, not for a feature. The context builder is
 * a trimmed copy of that file's own, extended with a `handles` parameter.
 *
 * Fixture numbers: containerWidth 1210, margin [10, 10], rowHeight 150,
 * 12 columns -> colWidth 90, column step 100, row step 160. An item at
 * x:0 y:0 w:2 h:2 renders as left 10, top 10, width 190, height 310.
 */
const CONTAINER_WIDTH = 1210;
const MARGIN = [10, 10];
const ROW_HEIGHT = 150;
const COLS = 12;
const ALL_HANDLES: TResizeHandle[] = [`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`];

type TEdges = { bottom: boolean; left: boolean; right: boolean; top: boolean };
const NO_EDGES: TEdges = { bottom: false, left: false, right: false, top: false };

const createContext = (
  propOverrides: Partial<IGridItemProps> = {},
  rtl = false,
  transformScaleOverride = 1,
  handles: TResizeHandle[] = ALL_HANDLES,
  slotContent?: () => unknown[],
) => {
  const gridItem = ref(document.createElement(`div`));
  const emit = vi.fn();
  const eventBus = { emit: vi.fn(), off: vi.fn(), on: vi.fn() };
  const props: IGridItemProps = {
    autoScroll: false,
    h: 2,
    i: `item-1`,
    isStatic: false,
    maxH: Infinity,
    maxW: Infinity,
    minH: 1,
    minW: 1,
    preserveAspectRatio: false,
    resizeIgnoreFrom: null,
    w: 2,
    x: 0,
    y: 0,
    ...propOverrides,
  };

  const resizeHandleRefs = {
    e: ref(document.createElement(`span`)),
    n: ref(document.createElement(`span`)),
    ne: ref(document.createElement(`span`)),
    nw: ref(document.createElement(`span`)),
    s: ref(document.createElement(`span`)),
    se: ref(document.createElement(`span`)),
    sw: ref(document.createElement(`span`)),
    w: ref(document.createElement(`span`)),
  };

  const ctx: IGridItemComposableContext = {
    autoHeightWrapper: ref(null),
    bounded: ref(null),
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
    margin: ref(MARGIN),
    maxRows: ref(Infinity),
    props,
    renderRtl: computed(() => rtl),
    resizeHandleRefs,
    resizeHandles: ref(handles),
    rowHeight: ref(ROW_HEIGHT),
    transformScale: ref(transformScaleOverride),
  };

  // `useGridItemResize` calls `useSlots()` internally, which needs a real
  // running `setup()` — see `useGridItemResize.spec.ts` for the full story.
  let helper!: ReturnType<typeof useGridItemResize>;
  mount(defineComponent({
    setup() {
      helper = useGridItemResize(ctx);
      return () => null;
    },
  }), { slots: slotContent ? { default: slotContent as never } : undefined });
  helper.tryMakeResizable();

  const dispatch = (event: { type: string; clientX?: number; clientY?: number; edges?: Partial<TEdges> }): void => {
    const handler = (gridItem.value as unknown as { __nativeResizeHandler?: (e: unknown) => void }).__nativeResizeHandler;
    handler?.({
      clientX: 0,
      clientY: 0,
      target: gridItem.value,
      ...event,
      edges: { ...NO_EDGES, ...event.edges },
    });
  };

  /** The `resizeEvent` payload most recently sent over the event bus. */
  const lastBusEvent = (): Record<string, unknown> => {
    const calls = eventBus.emit.mock.calls.filter(call => call[0] === `resizeEvent`);
    return calls.at(-1)?.[1] as Record<string, unknown>;
  };

  return { ctx, dispatch, emit, eventBus, gridItem, helper, lastBusEvent, resizeHandleRefs };
};

/** A real native `pointerdown` on a resize handle — the engine checks `getOptions().enabled` before it does anything else, which is what these tests observe through `defaultPrevented`. */
const pointerDown = (element: HTMLElement): Event => {
  element.setPointerCapture = vi.fn();
  element.releasePointerCapture = vi.fn();
  const event = new MouseEvent(`pointerdown`, { bubbles: true, button: 0, cancelable: true });
  Object.defineProperty(event, `pointerId`, { value: 1 });
  element.dispatchEvent(event);
  return event;
};

describe(`useGridItemResize — mutation-testing gap coverage`, () => {
  describe(`calcWH`, () => {
    it(`Should round a pixel height to the nearest row by default and round up only when asked to`, () => {
      const { helper } = createContext();

      // (182 + 10) / 160 = 1.2
      expect(helper.calcWH(182, 190).h).toBe(1);
      expect(helper.calcWH(182, 190, true).h).toBe(2);
    });
  });

  describe(`new grid position after a left/top-edge resize`, () => {
    it(`Should convert the new left edge to a grid x using the margin on both sides of the column step`, () => {
      const { dispatch, lastBusEvent } = createContext({ x: 4, y: 0 });
      const left = { left: true };

      // x = 4 -> left px = 90 * 4 + 5 * 10 = 410. Pulling 160px further left: width 350 (4 columns), left 250 -> round(240 / 100) = 2.
      dispatch({ clientX: 0, clientY: 0, edges: left, type: `resizestart` });
      dispatch({ clientX: -160, clientY: 0, edges: left, type: `resizemove` });

      expect(lastBusEvent()).toMatchObject({ w: 4, x: 2 });
    });

    it(`Should cap the new grid x so the resized item can't pass the right edge`, () => {
      const { dispatch, lastBusEvent } = createContext({ x: 10, y: 0 });
      const left = { left: true };

      // Shrinking far past zero width floors w at 1; the unclamped x would be 15, capped at 12 - 1 = 11.
      dispatch({ clientX: 0, clientY: 0, edges: left, type: `resizestart` });
      dispatch({ clientX: 500, clientY: 0, edges: left, type: `resizemove` });

      expect(lastBusEvent()).toMatchObject({ x: 11 });
    });

    it(`Should convert the new top edge to a grid y using the margin on both sides of the row step`, () => {
      const { dispatch, lastBusEvent } = createContext({ x: 0, y: 3 });
      const top = { top: true };

      // y = 3 -> top px = 150 * 3 + 4 * 10 = 490. Pulling 88px up: height 398 (3 rows), top 402 -> round(392 / 160) = 2.
      dispatch({ clientX: 0, clientY: 0, edges: top, type: `resizestart` });
      dispatch({ clientX: 0, clientY: -88, edges: top, type: `resizemove` });

      expect(lastBusEvent()).toMatchObject({ h: 3, y: 2 });
    });

    it(`Should cap the new grid y at maxRows minus the resized item's own height`, () => {
      const { ctx, dispatch, lastBusEvent } = createContext({ x: 0, y: 3 });
      ctx.maxRows.value = 8;
      const top = { top: true };

      // Shrinking far past zero height floors h at 1; the unclamped y would be 12, capped at 8 - 1 = 7.
      dispatch({ clientX: 0, clientY: 0, edges: top, type: `resizestart` });
      dispatch({ clientX: 0, clientY: 1500, edges: top, type: `resizemove` });

      expect(lastBusEvent()).toMatchObject({ y: 7 });
    });
  });

  describe(`resizemove`, () => {
    it(`Should grow only the width, leaving height, top and left alone, when only the right edge is dragged`, () => {
      const { dispatch, helper } = createContext();
      const right = { right: true };

      dispatch({ edges: right, type: `resizestart` });
      dispatch({ clientX: 100, clientY: 40, edges: right, type: `resizemove` });

      expect(helper.resizing.value).toEqual({ height: 310, left: 10, top: 10, width: 290 });
    });

    it(`Should divide the pointer delta by transformScale, not multiply it`, () => {
      const { dispatch, helper } = createContext({}, false, 2);
      const bottom = { bottom: true };

      dispatch({ edges: bottom, type: `resizestart` });
      dispatch({ clientX: 0, clientY: 40, edges: bottom, type: `resizemove` });

      // 40 / 2 = 20 on top of the starting 310
      expect(helper.resizing.value?.height).toBe(330);
    });

    it(`Should not throw on a resizemove that arrives before any resizestart`, () => {
      const ltr = createContext();
      const rtl = createContext({}, true);
      const right = { right: true };

      expect(() => ltr.dispatch({ clientX: 10, clientY: 10, edges: right, type: `resizemove` })).not.toThrow();
      expect(() => rtl.dispatch({ clientX: 10, clientY: 10, edges: right, type: `resizemove` })).not.toThrow();
    });

    // Kept apart from the resizemove test above on purpose: a resizemove with no start
    // still writes a (NaN-filled) object into `resizing`, so a resizeend dispatched after
    // it would never meet the `undefined` these optional chains exist to survive.
    it(`Should not throw on a resizeend that arrives with no resizestart or resizemove at all`, () => {
      const ltr = createContext();
      const rtl = createContext({}, true);
      const right = { right: true };

      expect(() => ltr.dispatch({ edges: right, type: `resizeend` })).not.toThrow();
      expect(() => rtl.dispatch({ edges: right, type: `resizeend` })).not.toThrow();
    });

    it(`Should treat an unrecognised event type as a no-size gesture rather than leaving its size undefined`, () => {
      const { dispatch, emit } = createContext();

      dispatch({ type: `resizecancel` });

      // calcWH(0, 0) -> 0x0, floored to the 1x1 minimum, which differs from the item's 2x2.
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZE, `item-1`, 1, 1, 0, 0);
    });
  });

  describe(`preserveAspectRatio`, () => {
    it(`Should leave the top anchor alone when the right and bottom edges drive the resize`, () => {
      const { dispatch, helper } = createContext({ preserveAspectRatio: true });
      const corner = { bottom: true, right: true };

      dispatch({ edges: corner, type: `resizestart` });
      dispatch({ clientX: 100, clientY: 40, edges: corner, type: `resizemove` });

      expect(helper.resizing.value?.top).toBe(10);
    });

    it(`Should move the top anchor by the derived height change for a top-right corner resize`, () => {
      const { dispatch, helper } = createContext({ preserveAspectRatio: true });
      const corner = { right: true, top: true };

      // ratio 190 / 310; width 290 -> derived height 473.158; top = 10 + (310 - 473.158)
      dispatch({ edges: corner, type: `resizestart` });
      dispatch({ clientX: 100, clientY: -20, edges: corner, type: `resizemove` });

      expect(helper.resizing.value?.height).toBeCloseTo(473.1579, 3);
      expect(helper.resizing.value?.top).toBeCloseTo(-153.1579, 3);
    });

    it(`Should derive the width by multiplying the height by the ratio when only a vertical edge drives the resize`, () => {
      const { dispatch, helper } = createContext({ preserveAspectRatio: true });
      const bottom = { bottom: true };

      // height 350 * (190 / 310) = 214.516
      dispatch({ edges: bottom, type: `resizestart` });
      dispatch({ clientX: 0, clientY: 40, edges: bottom, type: `resizemove` });

      expect(helper.resizing.value?.width).toBeCloseTo(214.5161, 3);
    });

    it(`Should not preserve an aspect ratio at all when the item starts with zero height`, () => {
      const { dispatch, helper } = createContext({ h: 0, preserveAspectRatio: true });
      const bottom = { bottom: true };

      dispatch({ edges: bottom, type: `resizestart` });
      dispatch({ clientX: 0, clientY: 40, edges: bottom, type: `resizemove` });

      expect(helper.resizing.value?.width).toBe(190);
    });
  });

  describe(`which resize events get reported`, () => {
    it(`Should report a RESIZE when only the width changed`, () => {
      const { dispatch, emit } = createContext();
      const right = { right: true };

      dispatch({ edges: right, type: `resizestart` });
      dispatch({ clientX: 100, clientY: 0, edges: right, type: `resizemove` });

      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZE, `item-1`, 2, 3, 310, 290);
    });

    it(`Should report a RESIZE when only the height changed`, () => {
      const { dispatch, emit } = createContext();
      const bottom = { bottom: true };

      dispatch({ edges: bottom, type: `resizestart` });
      dispatch({ clientX: 0, clientY: 170, edges: bottom, type: `resizemove` });

      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZE, `item-1`, 3, 2, 480, 190);
    });

    it(`Should report RESIZED only when the gesture ends, even if the grid has already updated the item mid-gesture`, () => {
      const { ctx, dispatch, emit } = createContext();
      const right = { right: true };
      const resizedCalls = (): number => emit.mock.calls.filter(call => call[0] === EGridItemEvent.RESIZED).length;

      dispatch({ edges: right, type: `resizestart` });
      ctx.innerW.value = 3; // the parent layout's round trip, mid-gesture
      dispatch({ clientX: 100, clientY: 0, edges: right, type: `resizemove` });
      expect(resizedCalls()).toBe(0);

      dispatch({ clientX: 100, clientY: 0, edges: right, type: `resizeend` });
      expect(resizedCalls()).toBe(1);
    });
  });

  describe(`autoSize`, () => {
    const measure = (width: number, height: number): ReturnType<typeof createContext> => {
      const context = createContext();
      const wrapper = document.createElement(`div`);
      wrapper.getBoundingClientRect = () => ({
        bottom: 0, height, left: 0, right: 0, top: 0, width, x: 0, y: 0, toJSON: () => ({}),
      });
      (context.ctx.autoHeightWrapper as Ref<HTMLElement | null>).value = wrapper;
      context.helper.autoSize();
      return context;
    };

    it(`Should report both RESIZE and RESIZED when only the height changed`, () => {
      // width 190 -> 2 columns (unchanged); height 470 -> ceil(480 / 160) = 3 rows
      const { emit } = measure(190, 470);

      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZE, `item-1`, 3, 2, 470, 190);
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZED, `item-1`, 3, 2, 470, 190);
    });

    it(`Should report both RESIZE and RESIZED when only the width changed`, () => {
      // width 290 -> round(300 / 100) = 3 columns; height 310 -> ceil(320 / 160) = 2 rows (unchanged)
      const { emit } = measure(290, 310);

      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZE, `item-1`, 2, 3, 310, 290);
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZED, `item-1`, 2, 3, 310, 290);
    });

    it(`Should round a measured height up to the next row rather than to the nearest`, () => {
      // (330 + 10) / 160 = 2.125 -> 3 rounding up, 2 rounding to nearest
      const { emit } = measure(190, 330);

      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZE, `item-1`, 3, 2, 330, 190);
    });
  });

  describe(`wiring the native resize engine`, () => {
    it(`Should start a resize only while the item is resizable and not static`, () => {
      const resizable = createContext();
      resizable.helper.resizable.value = true;
      const notYetResolved = createContext();
      const isStatic = createContext({ isStatic: true });
      isStatic.helper.resizable.value = true;

      expect(pointerDown(resizable.resizeHandleRefs.e.value).defaultPrevented).toBe(true);
      expect(pointerDown(notYetResolved.resizeHandleRefs.e.value).defaultPrevented).toBe(false);
      expect(pointerDown(isStatic.resizeHandleRefs.e.value).defaultPrevented).toBe(false);
    });

    it(`Should listen only on the handles that are in resizeHandles`, () => {
      const { helper, resizeHandleRefs } = createContext({}, false, 1, [`e`]);
      helper.resizable.value = true;

      expect(pointerDown(resizeHandleRefs.e.value).defaultPrevented).toBe(true);
      expect(pointerDown(resizeHandleRefs.n.value).defaultPrevented).toBe(false);
    });

    it(`Should not wire anything up until at least one handle exists, then wire up once one does`, () => {
      const { ctx, gridItem, helper } = createContext({}, false, 1, []);
      const backdoor = (): unknown => (gridItem.value as unknown as { __nativeResizeHandler?: unknown }).__nativeResizeHandler;
      expect(backdoor()).toBeUndefined();

      ctx.resizeHandles.value = [`e`];
      helper.tryMakeResizable();

      expect(backdoor()).toBeDefined();
    });

    it(`Should not attach a second set of listeners when tryMakeResizable runs again`, () => {
      const { emit, helper, resizeHandleRefs } = createContext();
      helper.resizable.value = true;
      helper.tryMakeResizable();

      pointerDown(resizeHandleRefs.e.value);

      expect(emit.mock.calls.filter(call => call[0] === EGridItemEvent.RESIZE)).toHaveLength(1);
    });

    it(`Should stop listening once torn down, tolerate a second teardown, and wire up again on request`, () => {
      const { helper, resizeHandleRefs } = createContext();
      helper.resizable.value = true;

      helper.teardownResizable();
      expect(pointerDown(resizeHandleRefs.e.value).defaultPrevented).toBe(false);
      expect(() => helper.teardownResizable()).not.toThrow();

      helper.tryMakeResizable();
      expect(pointerDown(resizeHandleRefs.e.value).defaultPrevented).toBe(true);
    });
  });

  describe(`autoHeight ResizeObserver`, () => {
    type TObserverInstance = { callback: () => void; disconnect: ReturnType<typeof vi.fn>; observe: ReturnType<typeof vi.fn> };
    const installMockResizeObserver = (): { instances: TObserverInstance[]; restore: () => void } => {
      const instances: TObserverInstance[] = [];
      const original = globalThis.ResizeObserver;
      globalThis.ResizeObserver = class {
        callback: () => void;
        disconnect = vi.fn();
        observe = vi.fn();
        unobserve = vi.fn();
        constructor(callback: () => void) {
          this.callback = callback;
          instances.push(this as unknown as TObserverInstance);
        }
      } as unknown as typeof ResizeObserver;
      return { instances, restore: () => { globalThis.ResizeObserver = original; } };
    };

    const withWrapper = (propOverrides: Partial<IGridItemProps>): { context: ReturnType<typeof createContext>; wrapper: HTMLElement } => {
      const context = createContext(propOverrides);
      const wrapper = document.createElement(`div`);
      wrapper.getBoundingClientRect = () => ({
        bottom: 0, height: 470, left: 0, right: 0, top: 0, width: 190, x: 0, y: 0, toJSON: () => ({}),
      });
      (context.ctx.autoHeightWrapper as Ref<HTMLElement | null>).value = wrapper;
      return { context, wrapper };
    };

    it(`Should observe the wrapper, run autoSize when the observer fires, and disconnect on teardown`, () => {
      const { instances, restore } = installMockResizeObserver();
      try {
        const { context, wrapper } = withWrapper({ autoHeight: true });

        context.helper.setupAutoHeight();
        expect(instances).toHaveLength(1);
        expect(instances[0].observe).toHaveBeenCalledWith(wrapper);

        instances[0].callback();
        expect(context.emit).toHaveBeenCalledWith(EGridItemEvent.RESIZE, `item-1`, 3, 2, 470, 190);

        context.helper.teardownAutoHeight();
        expect(instances[0].disconnect).toHaveBeenCalledTimes(1);
        expect(() => context.helper.teardownAutoHeight()).not.toThrow();
      } finally {
        restore();
      }
    });

    it(`Should not create an observer when autoHeight is off`, () => {
      const { instances, restore } = installMockResizeObserver();
      try {
        const { context } = withWrapper({ autoHeight: false });

        context.helper.setupAutoHeight();

        expect(instances).toHaveLength(0);
      } finally {
        restore();
      }
    });

    it(`Should not throw when autoHeight is on but the platform has no ResizeObserver`, () => {
      const original = globalThis.ResizeObserver;
      (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = undefined;
      try {
        const { context } = withWrapper({ autoHeight: true });

        expect(() => context.helper.setupAutoHeight()).not.toThrow();
      } finally {
        globalThis.ResizeObserver = original;
      }
    });
  });

  describe(`auto-scroll during a resize`, () => {
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

    it(`Should feed the pointer position to the scroller on every resizemove when autoScroll is on`, () => {
      const { dispatch } = createContext({ autoScroll: true });
      const scrollBy = vi.fn();
      document.body.scrollBy = scrollBy as unknown as typeof document.body.scrollBy;
      document.body.getBoundingClientRect = () => (
        { bottom: 1000, height: 1000, left: 0, right: 1000, toJSON: () => ({}), top: 0, width: 1000, x: 0, y: 0 }
      );
      const right = { right: true };

      dispatch({ edges: right, type: `resizestart` });
      dispatch({ clientX: 5, clientY: 500, edges: right, type: `resizemove` });
      frameCallback!();

      // 5px from the left edge: -12 * (1 - 5 / 40) = -10.5. Without the update the scroller
      // would still believe the pointer is at x = 0 and scroll the full -12.
      expect(scrollBy).toHaveBeenCalledWith(-10.5, 0);
    });
  });

  describe(`reporting a resize only when the size really changed`, () => {
    it(`Should not report a RESIZE for a resizemove that leaves the size exactly where it was`, () => {
      const { dispatch, emit } = createContext();
      const bottom = { bottom: true };
      dispatch({ edges: bottom, type: `resizestart` });
      emit.mockClear();

      dispatch({ clientX: 0, clientY: 0, edges: bottom, type: `resizemove` });

      expect(emit.mock.calls.some(call => call[0] === EGridItemEvent.RESIZE)).toBe(false);
    });
  });

  // autoSize() falls back to the default slot's first vnode element when there is no
  // autoHeight wrapper. A slot that renders nothing, or a vnode whose element has no
  // getBoundingClientRect, must be skipped quietly rather than throwing.
  describe(`autoSize reading its measurement from the default slot`, () => {
    it(`Should do nothing when the default slot renders no vnodes at all`, () => {
      const { emit, helper } = createContext({}, false, 1, ALL_HANDLES, () => []);

      expect(() => helper.autoSize()).not.toThrow();
      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should do nothing when the measured element has no getBoundingClientRect`, () => {
      const { ctx, emit, helper } = createContext();
      (ctx.autoHeightWrapper as Ref<unknown>).value = {};

      expect(() => helper.autoSize()).not.toThrow();
      expect(emit).not.toHaveBeenCalled();
    });
  });
});
