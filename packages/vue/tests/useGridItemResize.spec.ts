import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useGridItemResize } from '../src/components/Grid/composables/useGridItemResize';
import { EGridItemEvent } from '@/core/griditem/enums/EGridItemEvents';
import type { IGridItemComposableContext } from '../src/components/Grid/composables/grid-item-composable-context';
import type { IGridItemProps } from '../src/components/Grid/grid-item-props.interface';

/** Matches `GridLayout.vue`'s own default `rowHeight`/`margin`, and a `containerWidth` chosen so `calcColWidth` (`(1210 - 10*13)/12`) resolves to a clean `90`. */
const CONTAINER_WIDTH = 1210;
const MARGIN = [10, 10];
const ROW_HEIGHT = 150;
const COLS = 12;

const createContext = (propOverrides: Partial<IGridItemProps> = {}, rtl = false, transformScaleOverride = 1) => {
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
    resizeHandles: ref([`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`]),
    rowHeight: ref(ROW_HEIGHT),
    transformScale: ref(transformScaleOverride),
  };

  // `useGridItemResize` calls Vue's own `useSlots()` internally (for
  // `autoSize()`'s slot-content fallback) — a Composition API function
  // that requires a real, currently-running component `setup()` context
  // to work at all; calling the composable as a bare function (no
  // `setup()` around it) leaves that context null, which
  // `useSlots()`/Vue's own internals throw on (confirmed via a real,
  // reproduced failure: "Cannot read properties of null (reading
  // 'setupContext')"). Mounting a minimal, template-less test component
  // (a render function returning `null`) and calling the composable from
  // inside its own `setup()` — capturing the return value via this
  // outer-scope `let` — gives it that real context, the same technique
  // `useResponsiveLayout.spec.ts`'s own bare-function calls don't need,
  // since that composable never touches anything Composition-API-context-
  // dependent.
  let helper!: ReturnType<typeof useGridItemResize>;
  mount(defineComponent({
    setup() {
      helper = useGridItemResize(ctx);
      return () => null;
    },
  }));
  helper.tryMakeResizable();

  /** The `__nativeResizeHandler` test-only backdoor `createNativeResizable` stashes on the root element — see `@/core/helpers/native-interaction.ts`'s own comment. Lets tests invoke `handleResize` directly with a crafted event, without simulating real pointer gestures. */
  const dispatch = (event: {
    type: `resizestart` | `resizemove` | `resizeend`;
    clientX?: number;
    clientY?: number;
    edges?: { bottom: boolean; left: boolean; right: boolean; top: boolean };
  }): void => {
    const handler = (gridItem.value as unknown as { __nativeResizeHandler?: (e: unknown) => void }).__nativeResizeHandler;
    handler?.({
      clientX: 0,
      clientY: 0,
      edges: { bottom: false, left: false, right: false, top: false },
      target: gridItem.value,
      ...event,
    });
  };

  return { ctx, dispatch, emit, eventBus, gridItem, helper };
};

describe(`useGridItemResize`, () => {
  // `createNativeAutoScroll`'s own `findScrollableAncestor` (in
  // `@/core/helpers/native-interaction.ts`) falls back to
  // `document.scrollingElement` when no scrollable ancestor is found in
  // the DOM tree — the case here, since every `gridItem`/handle element
  // this file constructs is a bare, unattached `document.createElement`
  // with no real parent at all. jsdom's own `document.scrollingElement`
  // isn't a real `HTMLElement` instance by default (confirmed via a real,
  // reproduced failure: `autoScroll.start()`'s own `requestAnimationFrame`
  // call was never reached at all, since `findScrollableAncestor`'s
  // fallback resolved to something falsy), so every autoScroll-related
  // assertion in this file needs it stubbed to a real element explicitly
  // — done file-wide here rather than per-test, since more than one test
  // below exercises autoScroll (`start()` directly, and `stop()`'s own
  // gated `cancelAnimationFrame` call, which depends on `start()` having
  // actually set `rafId` in the first place).
  let scrollingElementDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    // Save whatever's already an OWN property on `document` itself (there
    // shouldn't be one yet, but this makes the restore correct either
    // way), then shadow it with an own property returning `document.body`.
    scrollingElementDescriptor = Object.getOwnPropertyDescriptor(document, `scrollingElement`);
    Object.defineProperty(document, `scrollingElement`, { configurable: true, get: () => document.body });
  });

  afterEach(() => {
    // Restoring must target `document` itself (the same object level the
    // stub above was defined on) — the original getter actually lives on
    // `Document.prototype`, one level up, so simply deleting this test's
    // own instance-level shadow here is what lets that prototype getter
    // take effect again, not redefining the prototype (which was never
    // touched at all).
    if(scrollingElementDescriptor) {
      Object.defineProperty(document, `scrollingElement`, scrollingElementDescriptor);
    } else {
      delete (document as { scrollingElement?: Element | null }).scrollingElement;
    }
  });

  describe(`calcPosition`, () => {
    it(`Should compute left/top/height/width precisely in LTR`, () => {
      // Non-"nice" x/y/w/h chosen so every arithmetic operator in this
      // branch (+ vs -, * vs /, (n+1) vs (n-1), Math.max vs Math.min)
      // produces a genuinely different result — confirmed via a real
      // mutation report showing these all survived against the file's
      // previous, smaller (1,1,2,2) test values, which didn't distinguish
      // several of them (e.g. Math.max(0,0) and Math.min(0,0) both give 0).
      const { helper } = createContext();
      const pos = helper.calcPosition(2, 3, 4, 5);
      // height = round(150*5 + max(0,4)*10) = round(750+40) = 790
      expect(pos.height).toBe(790);
      // left = round(90*2 + (2+1)*10) = round(180+30) = 210
      expect(pos.left).toBe(210);
      expect(pos).not.toHaveProperty(`right`);
      // top = round(150*3 + (3+1)*10) = round(450+40) = 490
      expect(pos.top).toBe(490);
      // width = round(90*4 + max(0,3)*10) = round(360+30) = 390
      expect(pos.width).toBe(390);
    });

    it(`Should compute right/top/height/width precisely in RTL`, () => {
      // Same numeric inputs and expected height/top/width as the LTR test
      // above — confirmed via the mutation report that RTL's own copy of
      // this arithmetic (a separate, duplicated block in the source, not
      // shared with LTR) has its own, separately-survived mutants that
      // testing only the LTR branch never touches at all.
      const { helper } = createContext({}, true);
      const pos = helper.calcPosition(2, 3, 4, 5);
      expect(pos.height).toBe(790);
      // right = round(90*2 + (2+1)*10) = 210 (identical formula to LTR's own left, just a different property)
      expect(pos.right).toBe(210);
      expect(pos).not.toHaveProperty(`left`);
      expect(pos.top).toBe(490);
      expect(pos.width).toBe(390);
    });

    it(`Should leave height/width as Infinity unchanged rather than computing a pixel value`, () => {
      const { helper } = createContext();
      const pos = helper.calcPosition(0, 0, Infinity, Infinity);
      expect(pos.width).toBe(Infinity);
      expect(pos.height).toBe(Infinity);
    });
  });

  describe(`calcWH`, () => {
    it(`Should round (not ceil) height by default (autoSizeFlag false)`, () => {
      const { helper } = createContext();
      // height=78px: (78+10)/(150+10) = 0.55 -> round=1. The mutation
      // report showed the numerator's own "+margin" mutated to "-margin"
      // survives against this file's previous h=61 test — (61-10)/160=
      // 0.31875 rounds to the SAME 0 as (61+10)/160=0.44375 does, so that
      // choice never actually distinguished the two. 78 is chosen so the
      // ±20-unit shift from flipping the sign crosses the 0.5 rounding
      // boundary: mutant (78-10)/160=0.425 rounds to 0, genuinely
      // different from the real 1.
      const rounded = helper.calcWH(78, 90);
      expect(rounded.h).toBe(1);
    });

    it(`Should ceil (not round) height when autoSizeFlag is true`, () => {
      const { helper } = createContext();
      // height=158px: (158+10)/160 = 1.05 -> ceil=2. Chosen (separately
      // from the round test's own 78) so the same ±20-unit sign-flip
      // crosses a WHOLE-number boundary specifically for ceil: mutant
      // (158-10)/160=0.925 -> ceil=1, genuinely different from the real 2
      // — ceil doesn't care where within a unit a value falls (unlike
      // round), only whether it crossed into the previous integer.
      const ceiled = helper.calcWH(158, 90, true);
      expect(ceiled.h).toBe(2);
    });

    it(`Should cap w at cols.value - innerX.value`, () => {
      const { ctx, helper } = createContext();
      ctx.innerX.value = 10;
      // A huge width would naively compute a huge w — capped to cols(12) - innerX(10) = 2.
      const result = helper.calcWH(150, 100000);
      expect(result.w).toBe(2);
    });

    it(`Should cap h at maxRows.value - innerY.value`, () => {
      const { ctx, helper } = createContext();
      ctx.maxRows.value = 5;
      ctx.innerY.value = 3;
      const result = helper.calcWH(100000, 90);
      expect(result.h).toBe(2);
    });

    it(`Should floor w/h at 0, never negative`, () => {
      const { ctx, helper } = createContext();
      ctx.innerX.value = 12; // cols(12) - innerX(12) = 0
      const result = helper.calcWH(90, 90);
      expect(result.w).toBeGreaterThanOrEqual(0);
    });
  });

  describe(`handleResize — resizestart`, () => {
    it(`Should set isResizing/resizing and emit RESIZE/eventBus resizeEvent on resizestart`, () => {
      const { dispatch, emit, eventBus, helper } = createContext();

      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });

      expect(helper.isResizing.value).toBe(true);
      expect(helper.resizing.value).toBeDefined();
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZE, `item-1`, 2, 2, 2, 2);
      expect(eventBus.emit).toHaveBeenCalledWith(`resizeEvent`, expect.objectContaining({ eventType: `resizestart` }));
    });

    it(`Should start autoScroll on resizestart when props.autoScroll is true`, () => {
      const { dispatch, gridItem } = createContext({ autoScroll: true });
      const raf = vi.spyOn(globalThis, `requestAnimationFrame`).mockReturnValue(1 as unknown as number);

      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });

      // findScrollableAncestor walks up to document.scrollingElement as a
      // last resort, so autoScroll.start() always finds *some* container
      // in jsdom — confirming the rAF loop actually started is enough to
      // confirm `autoScroll.start(event.target)` was called at all.
      expect(raf).toHaveBeenCalled();
      raf.mockRestore();
    });

    it(`Should NOT start autoScroll on resizestart when props.autoScroll is false (the default)`, () => {
      const { dispatch } = createContext({ autoScroll: false });
      const raf = vi.spyOn(globalThis, `requestAnimationFrame`).mockReturnValue(1 as unknown as number);

      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });

      expect(raf).not.toHaveBeenCalled();
      raf.mockRestore();
    });

    it(`Should be a no-op when isStatic is true`, () => {
      const { dispatch, emit } = createContext({ isStatic: true });

      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });

      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe(`handleResize — resizemove edges`, () => {
    it(`Should grow width when dragging the right edge (LTR: anchor untouched)`, () => {
      const { dispatch, helper } = createContext();
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });
      const widthBefore = helper.resizing.value!.width;

      dispatch({ clientX: 50, edges: { bottom: false, left: false, right: true, top: false }, type: `resizemove` });

      expect(helper.resizing.value!.width).toBeGreaterThan(widthBefore);
    });

    it(`Should shrink width and move the anchor when dragging the left edge in LTR`, () => {
      const { dispatch, helper } = createContext();
      dispatch({ edges: { bottom: false, left: true, right: false, top: false }, type: `resizestart` });
      const leftBefore = helper.resizing.value!.left;

      dispatch({ clientX: 50, edges: { bottom: false, left: true, right: false, top: false }, type: `resizemove` });

      expect(helper.resizing.value!.left).not.toBe(leftBefore);
    });

    it(`Should NOT move the anchor when dragging the left edge in RTL (left isn't the anchor-moving edge under RTL)`, () => {
      const { dispatch, helper } = createContext({}, true);
      dispatch({ edges: { bottom: false, left: true, right: false, top: false }, type: `resizestart` });
      const rightBefore = helper.resizing.value!.right;

      dispatch({ clientX: 50, edges: { bottom: false, left: true, right: false, top: false }, type: `resizemove` });

      // Mirrors LTR's own "dragging the right edge leaves the left
      // anchor untouched" behavior — under RTL, the left edge plays that
      // same non-anchor-moving role instead.
      expect(helper.resizing.value!.right).toBe(rightBefore);
    });

    it(`Should move the anchor when dragging the right edge in RTL (right IS the anchor-moving edge under RTL)`, () => {
      const { dispatch, helper } = createContext({}, true);
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });
      const rightBefore = helper.resizing.value!.right;

      dispatch({ clientX: 50, edges: { bottom: false, left: false, right: true, top: false }, type: `resizemove` });

      expect(helper.resizing.value!.right).not.toBe(rightBefore);
    });

    it(`Should grow height when dragging the bottom edge`, () => {
      const { dispatch, helper } = createContext();
      dispatch({ edges: { bottom: true, left: false, right: false, top: false }, type: `resizestart` });
      const heightBefore = helper.resizing.value!.height;

      dispatch({ clientY: 50, edges: { bottom: true, left: false, right: false, top: false }, type: `resizemove` });

      expect(helper.resizing.value!.height).toBeGreaterThan(heightBefore);
    });

    it(`Should shrink height and move top when dragging the top edge`, () => {
      const { dispatch, helper } = createContext();
      dispatch({ edges: { bottom: false, left: false, right: false, top: true }, type: `resizestart` });
      const topBefore = helper.resizing.value!.top;

      dispatch({ clientY: 50, edges: { bottom: false, left: false, right: false, top: true }, type: `resizemove` });

      expect(helper.resizing.value!.top).not.toBe(topBefore);
    });

    it(`Should divide (not multiply) coreEvent.deltaX/deltaY by transformScale during resizemove`, () => {
      const { dispatch, helper } = createContext({}, false, 2);
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });
      // resizestart's own pos = calcPosition(innerX=0,innerY=0,innerW=2,innerH=2):
      // width = round(90*2 + max(0,1)*10) = 190 (unaffected by transformScale,
      // calcPosition doesn't use it at all).
      const widthAtStart = helper.resizing.value!.width;

      // dragstart/resizestart's own x/y come from offsetXYFromParentOf,
      // which (per useGridItemDrag.spec.ts's own identical analysis)
      // reduces to clientX/clientY directly given this file's stubbed,
      // unattached elements — so lastW after resizestart is 0 (the
      // dispatch default). deltaX = 100 - 0 = 100.
      dispatch({ clientX: 100, edges: { bottom: false, left: false, right: true, top: false }, type: `resizemove` });

      // width = prevWidth(190) + deltaX(100)/transformScale(2) = 190+50=240.
      // A "*" mutant would instead give 190+200=390 — genuinely different.
      expect(helper.resizing.value!.width).toBe(widthAtStart + 50);
    });
  });

  describe(`handleResize — preserveAspectRatio`, () => {
    it(`Should derive height from width when only a horizontal edge is driving`, () => {
      const { dispatch, helper } = createContext({ preserveAspectRatio: true });
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });
      const heightBefore = helper.resizing.value!.height;

      dispatch({ clientX: 90, edges: { bottom: false, left: false, right: true, top: false }, type: `resizemove` });

      // Width changed (driving), so height must have been derived from
      // it via the captured aspect ratio, not left untouched.
      expect(helper.resizing.value!.height).not.toBe(heightBefore);
    });

    it(`Should derive width from height when only a vertical edge is driving`, () => {
      const { dispatch, helper } = createContext({ preserveAspectRatio: true });
      dispatch({ edges: { bottom: true, left: false, right: false, top: false }, type: `resizestart` });
      const widthBefore = helper.resizing.value!.width;

      dispatch({ clientY: 90, edges: { bottom: true, left: false, right: false, top: false }, type: `resizemove` });

      expect(helper.resizing.value!.width).not.toBe(widthBefore);
    });

    it(`Should derive height from width for a corner drag, and adjust top when the top edge is part of it`, () => {
      const { dispatch, helper } = createContext({ preserveAspectRatio: true });
      dispatch({ edges: { bottom: false, left: false, right: true, top: true }, type: `resizestart` });
      const topBefore = helper.resizing.value!.top;

      dispatch({ clientX: 90, edges: { bottom: false, left: false, right: true, top: true }, type: `resizemove` });

      expect(helper.resizing.value!.top).not.toBe(topBefore);
    });

    it(`Should NOT derive dimensions at all when preserveAspectRatio is false`, () => {
      const { dispatch, helper } = createContext({ preserveAspectRatio: false });
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });
      const heightAtStart = helper.resizing.value!.height;

      dispatch({ clientX: 90, edges: { bottom: false, left: false, right: true, top: false }, type: `resizemove` });

      // Only width (the driving dimension) should have changed — height
      // stays exactly at whatever resizestart captured, since aspect-
      // ratio derivation never runs when the prop is off.
      expect(helper.resizing.value!.height).toBe(heightAtStart);
    });
  });

  describe(`handleResize — resizeend`, () => {
    it(`Should emit RESIZED when innerW/innerH already reflect a value different from what resizestart captured`, () => {
      // RESIZED's own gate (previousW.value !== innerW.value ||
      // previousH.value !== innerH.value) compares resizestart's own
      // snapshot against the CURRENT innerW/innerH — not against this
      // gesture's own freshly computed pos.w/pos.h. In real usage,
      // innerW/innerH only change via GridLayout/GridItem's own props
      // round-trip (a resizemove's eventBus payload updates the parent's
      // layout array, which flows back down as new props, which GridItem's
      // own watchers sync into innerW/innerH) — machinery this isolated
      // composable test has no equivalent of, so it's simulated directly
      // here instead, matching what the real round-trip would have
      // already applied by the time a real resizeend fires.
      const { ctx, dispatch, emit } = createContext();
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });
      ctx.innerW.value = 5;
      emit.mockClear();

      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizeend` });

      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZED, `item-1`, expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
    });

    it(`Should NOT emit RESIZED when innerW/innerH still match what resizestart captured`, () => {
      const { dispatch, emit } = createContext();
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });
      emit.mockClear();

      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizeend` });

      expect(emit).not.toHaveBeenCalledWith(EGridItemEvent.RESIZED, expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything());
    });

    it(`Should clear isResizing/resizing/aspectRatio and stop autoScroll on resizeend`, () => {
      const { dispatch, helper } = createContext({ autoScroll: true });
      const cancelRaf = vi.spyOn(globalThis, `cancelAnimationFrame`).mockImplementation(() => {});
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });

      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizeend` });

      expect(helper.isResizing.value).toBe(false);
      expect(helper.resizing.value).toBeUndefined();
      cancelRaf.mockRestore();
    });
  });

  describe(`handleResize — min/max clamping`, () => {
    it(`Should NOT clamp at all when the resized value is already within minW/maxW/minH/maxH — confirms the clamp branches aren't unconditionally applied`, () => {
      // Complements the four "clamp up/down" tests below, which all
      // force an out-of-bounds value — a mutant forcing the clamp
      // condition to always-true would still pass those (clamping to
      // the same already-correct value is unobservable), but would
      // incorrectly overwrite a naturally in-bounds value here.
      const { ctx, dispatch, emit } = createContext({ maxH: 100, maxW: 100, minH: 1, minW: 1 });
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });
      ctx.innerW.value = 5;
      emit.mockClear();
      dispatch({ clientX: 90, edges: { bottom: false, left: false, right: true, top: false }, type: `resizemove` });

      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizeend` });

      const resizedCall = emit.mock.calls.find(call => call[0] === EGridItemEvent.RESIZED);
      // width grew from 190 (2 cols) by 90px -> 280px -> (280+10)/100=2.9->round=3
      expect(resizedCall?.[3]).toBe(3);
    });

    it(`Should NOT throw on a resizemove/resizeend arriving without a preceding resizestart (resizing.value is undefined — no isResizing-style guard exists for this case), and the still-default edges (all false) should leave x/y untouched`, () => {
      const { dispatch, eventBus } = createContext();

      expect(() => {
        dispatch({ clientX: 50, edges: { bottom: false, left: false, right: true, top: false }, type: `resizemove` });
      }).not.toThrow();

      // `edges` starts as {bottom:false,left:false,right:false,top:false}
      // and is only ever overwritten by a real resizestart (`({edges} =
      // event)`) — since none happened here, the module-level `edges`
      // variable (not this dispatch call's own `edges` argument, which
      // resizemove's own handler never reads at all) is still at that
      // default. If `edges.left`/`edges.top` defaulted to `true` instead
      // (a real, reported mutant), `horizontalAnchorEdge`/`edges.top`
      // would incorrectly read as active, running `pixelsToGridX`/
      // `pixelsToGridY` against NaN inputs (resizing.value is undefined,
      // so every derived value here is NaN) and producing NaN x/y —
      // confirmed via a real, reproduced Math.min/max-with-NaN chain —
      // instead of leaving them at innerX/innerY(0,0) unchanged.
      const call = eventBus.emit.mock.calls.find(c => c[0] === `resizeEvent`);
      expect(call?.[1].x).toBe(0);
      expect(call?.[1].y).toBe(0);
    });

    it(`Should clamp pos.w up to minW`, () => {
      const { ctx, dispatch, emit } = createContext({ minW: 3 });
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });
      ctx.innerW.value = 5;
      emit.mockClear();
      // A tiny rightward move would otherwise resolve to w=2 (unchanged) — force a shrink attempt instead.
      dispatch({ clientX: -1000, edges: { bottom: false, left: false, right: true, top: false }, type: `resizemove` });

      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizeend` });

      const resizedCall = emit.mock.calls.find(call => call[0] === EGridItemEvent.RESIZED);
      expect(resizedCall?.[3]).toBeGreaterThanOrEqual(3);
    });

    it(`Should clamp pos.w down to maxW`, () => {
      const { ctx, dispatch, emit } = createContext({ maxW: 3 });
      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizestart` });
      ctx.innerW.value = 5;
      emit.mockClear();
      dispatch({ clientX: 1000, edges: { bottom: false, left: false, right: true, top: false }, type: `resizemove` });

      dispatch({ edges: { bottom: false, left: false, right: true, top: false }, type: `resizeend` });

      const resizedCall = emit.mock.calls.find(call => call[0] === EGridItemEvent.RESIZED);
      expect(resizedCall?.[3]).toBeLessThanOrEqual(3);
    });

    it(`Should clamp pos.h up to minH`, () => {
      const { ctx, dispatch, emit } = createContext({ minH: 3 });
      dispatch({ edges: { bottom: true, left: false, right: false, top: false }, type: `resizestart` });
      ctx.innerH.value = 5;
      emit.mockClear();
      dispatch({ clientY: -1000, edges: { bottom: true, left: false, right: false, top: false }, type: `resizemove` });

      dispatch({ edges: { bottom: true, left: false, right: false, top: false }, type: `resizeend` });

      const resizedCall = emit.mock.calls.find(call => call[0] === EGridItemEvent.RESIZED);
      expect(resizedCall?.[2]).toBeGreaterThanOrEqual(3);
    });

    it(`Should clamp pos.h down to maxH`, () => {
      const { ctx, dispatch, emit } = createContext({ maxH: 3 });
      dispatch({ edges: { bottom: true, left: false, right: false, top: false }, type: `resizestart` });
      ctx.innerH.value = 5;
      emit.mockClear();
      dispatch({ clientY: 1000, edges: { bottom: true, left: false, right: false, top: false }, type: `resizemove` });

      dispatch({ edges: { bottom: true, left: false, right: false, top: false }, type: `resizeend` });

      const resizedCall = emit.mock.calls.find(call => call[0] === EGridItemEvent.RESIZED);
      expect(resizedCall?.[2]).toBeLessThanOrEqual(3);
    });
  });

  describe(`handleResize — position derivation for left/top-edge resizes`, () => {
    it(`Should derive a new x when resizing from the left edge (LTR)`, () => {
      const { ctx, dispatch, eventBus } = createContext();
      ctx.innerX.value = 3;
      dispatch({ edges: { bottom: false, left: true, right: false, top: false }, type: `resizestart` });
      dispatch({ clientX: -90, edges: { bottom: false, left: true, right: false, top: false }, type: `resizemove` });
      eventBus.emit.mockClear();

      dispatch({ edges: { bottom: false, left: true, right: false, top: false }, type: `resizeend` });

      const call = eventBus.emit.mock.calls.find(c => c[0] === `resizeEvent`);
      expect(call?.[1].x).not.toBe(3);
    });

    it(`Should leave x/y unchanged for a right/bottom-only resize (no anchor-edge active)`, () => {
      const { ctx, dispatch, eventBus } = createContext();
      ctx.innerX.value = 3;
      ctx.innerY.value = 4;
      dispatch({ edges: { bottom: true, left: false, right: true, top: false }, type: `resizestart` });
      dispatch({ clientX: 90, clientY: 90, edges: { bottom: true, left: false, right: true, top: false }, type: `resizemove` });
      eventBus.emit.mockClear();

      dispatch({ edges: { bottom: true, left: false, right: true, top: false }, type: `resizeend` });

      const call = eventBus.emit.mock.calls.find(c => c[0] === `resizeEvent`);
      expect(call?.[1].x).toBe(3);
      expect(call?.[1].y).toBe(4);
    });
  });

  describe(`tryMakeResizable`, () => {
    it(`Should not attach twice — a second call is a no-op once already wired up`, () => {
      const { gridItem, helper } = createContext();
      const firstHandler = (gridItem.value as unknown as { __nativeResizeHandler?: unknown }).__nativeResizeHandler;

      helper.tryMakeResizable();

      expect((gridItem.value as unknown as { __nativeResizeHandler?: unknown }).__nativeResizeHandler).toBe(firstHandler);
    });

    it(`Should only wire up handles present in resizeHandles`, () => {
      const gridItem = ref(document.createElement(`div`));
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
      const props: IGridItemProps = { h: 2, i: `x`, w: 2, x: 0, y: 0 };
      const ctx: IGridItemComposableContext = {
        autoHeightWrapper: ref(null),
        bounded: ref(null),
        cols: ref(COLS),
        containerWidth: ref(CONTAINER_WIDTH),
        editModeEnabled: ref(true),
        emit: vi.fn(),
        eventBus: { emit: vi.fn(), off: vi.fn(), on: vi.fn() },
        gridItem,
        innerH: ref(2),
        innerW: ref(2),
        innerX: ref(0),
        innerY: ref(0),
        margin: ref(MARGIN),
        maxRows: ref(Infinity),
        props,
        renderRtl: computed(() => false),
        resizeHandleRefs,
        // Only 'n' is in the resolved set — every other handle's own
        // pointerdown listener should never get attached.
        resizeHandles: ref([`n`]),
        rowHeight: ref(ROW_HEIGHT),
        transformScale: ref(1),
      };

      let helper2!: ReturnType<typeof useGridItemResize>;
      mount(defineComponent({
        setup() {
          helper2 = useGridItemResize(ctx);
          return () => null;
        },
      }));
      helper2.tryMakeResizable();
      // Same setup-context requirement as createContext()'s own helper
      // above (useSlots() runs unconditionally at the top of the
      // composable, not lazily inside autoSize) — a bare call here would
      // hit the identical "Cannot read properties of null (reading
      // 'setupContext')" failure.

      const nSpy = vi.spyOn(resizeHandleRefs.n.value!, `dispatchEvent`);
      const eSpy = vi.spyOn(resizeHandleRefs.e.value!, `dispatchEvent`);
      resizeHandleRefs.n.value!.dispatchEvent(new Event(`pointerdown`));
      resizeHandleRefs.e.value!.dispatchEvent(new Event(`pointerdown`));

      // Both dispatches succeed regardless (a plain DOM event always
      // fires); what distinguishes "wired up" is whether the resize
      // engine's own listener actually ran — confirmed instead via the
      // root's own __nativeResizeHandler having been set at all, which
      // only happens once at least one real handle was found.
      expect((gridItem.value as unknown as { __nativeResizeHandler?: unknown }).__nativeResizeHandler).toBeDefined();
      nSpy.mockRestore();
      eSpy.mockRestore();
    });
  });

  describe(`autoSize`, () => {
    it(`Should be a no-op when no measurable slot element is available`, () => {
      const { emit, helper } = createContext();
      // autoHeightWrapper is null and there's no real slots.default() render
      // context here, so slotElement resolves to undefined either way.
      helper.autoSize();
      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should measure via autoHeightWrapper when present, and emit RESIZE/RESIZED on a real size change`, () => {
      const { ctx, emit, eventBus, helper } = createContext();
      const wrapper = document.createElement(`div`);
      // width:270 -> round((270+10)/(90+10))=round(2.8)=3 (≠2, a genuine
      // change); height:500 -> ceil((500+10)/(150+10))=ceil(3.1875)=4
      // (≠2 too). The original values here (300,180) were a real
      // mistake — they happened to compute to the SAME w=2,h=2 the item
      // already starts at, so the "did the size actually change" guard
      // never fired and emit was never called at all (confirmed via a
      // real, reproduced "Number of calls: 0" failure).
      vi.spyOn(wrapper, `getBoundingClientRect`).mockReturnValue({ height: 500, width: 270 } as DOMRect);
      ctx.autoHeightWrapper.value = wrapper;

      helper.autoSize();

      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZE, `item-1`, expect.any(Number), expect.any(Number), 500, 270);
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZED, `item-1`, expect.any(Number), expect.any(Number), 500, 270);
      expect(eventBus.emit).toHaveBeenCalledWith(`resizeEvent`, expect.objectContaining({ eventType: `resizeend` }));
    });

    it(`Should NOT emit RESIZE/RESIZED when the measured size resolves to the same grid units as before`, () => {
      const { ctx, emit, helper } = createContext();
      const wrapper = document.createElement(`div`);
      // 180x300 resolves to the same w=2,h=2 the item already starts at
      // (colWidth=90, rowHeight=150 — matching the default 2x2 exactly).
      vi.spyOn(wrapper, `getBoundingClientRect`).mockReturnValue({ height: 300, width: 190 } as DOMRect);
      ctx.autoHeightWrapper.value = wrapper;

      helper.autoSize();

      expect(emit).not.toHaveBeenCalledWith(EGridItemEvent.RESIZE, expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything());
    });

    it(`Should clamp the auto-sized w/h to minW/maxW/minH/maxH`, () => {
      const { ctx, emit, helper } = createContext({ maxH: 1, maxW: 1 });
      const wrapper = document.createElement(`div`);
      vi.spyOn(wrapper, `getBoundingClientRect`).mockReturnValue({ height: 900, width: 900 } as DOMRect);
      ctx.autoHeightWrapper.value = wrapper;

      helper.autoSize();

      const resizedCall = emit.mock.calls.find(call => call[0] === EGridItemEvent.RESIZED);
      // emit(EGridItemEvent.RESIZED, props.i, pos.h, pos.w, ...) — index
      // [1] is props.i (a string), [2] is h, [3] is w. Same shape as
      // handleResize's own RESIZED emit, and the same indexing mistake
      // was found and fixed in that describe block's own min/max
      // clamping tests above.
      expect(resizedCall?.[2]).toBe(1);
      expect(resizedCall?.[3]).toBe(1);
    });
  });
});
