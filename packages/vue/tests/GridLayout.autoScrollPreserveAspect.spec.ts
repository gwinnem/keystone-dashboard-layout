// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, nextTick, reactive } from 'vue';
import { mount } from '@vue/test-utils';
import { EGridItemEvent } from '@/core/griditem/enums/EGridItemEvents';
import { calcColWidth } from '@/core/griditem/helpers/grid-item-calculate-helper';
import { GridItem, GridLayout } from '../src/components';
import { restoreOffsetWidth, stubOffsetWidth } from './helpers/mountGrid';

/**
 * `autoScroll` and `preserveAspectRatio` can be set on the whole grid (`GridLayout`) and on each item (`GridItem`).
 * An item prop of `null` (the default) inherits the grid value; an explicit `true`/`false` always wins. The grid value
 * is pushed to inheriting items through the eventBus (`setAutoScroll` / `setPreserveAspectRatio`), so it also has to
 * keep working when the grid prop changes after mount, and when an item goes back to `null` later on.
 *
 * Observed through behaviour, not through internal refs:
 * - autoScroll: whether a drag / resize gesture starts the auto-scroll engine. `createNativeAutoScroll` is replaced by a
 *   factory handing out shared spies, so every item's drag and resize composable reports to the same `start`/`update`/`stop`.
 * - preserveAspectRatio: whether a right-edge-only resize also changes the height (derived from the width).
 */
const autoScrollSpies = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn(), update: vi.fn() }));

vi.mock(`@/core/helpers/native-interaction`, async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createNativeAutoScroll: () => ({ ...actual.createNativeAutoScroll(), ...autoScrollSpies }),
  };
});

const CONTAINER_WIDTH = 1200;
const MARGIN = [10, 10];
const ROW_HEIGHT = 150;
const COLS = 12;
/** An item is 4 columns x 4 rows (see `mountItems`), which renders as this many pixels. */
const START_WIDTH = Math.round(calcColWidth(CONTAINER_WIDTH, MARGIN[0], COLS) * 4 + 3 * MARGIN[0]);
const START_HEIGHT = ROW_HEIGHT * 4 + 3 * MARGIN[1];
const START_RATIO = START_WIDTH / START_HEIGHT;

const RIGHT_EDGE = { bottom: false, left: false, right: true, top: false };

const settle = async (): Promise<void> => {
  for (let i = 0; i < 8; i++) {
    // eslint-disable-next-line no-await-in-loop
    await nextTick();
  }
};

const dispatchDragEvent = (target: Element, type: `dragstart` | `dragmove` | `dragend`, overrides: Record<string, unknown> = {}) => {
  Object.defineProperty(target, `offsetParent`, { configurable: true, value: document.body });
  document.body.getBoundingClientRect = () => ({
    bottom: 0, height: 0, left: 0, right: 0, toJSON: () => ({}), top: 0, width: 0, x: 0, y: 0,
  });
  (target as HTMLElement).getBoundingClientRect = () => ({
    bottom: 100, height: 95, left: 5, right: 100, toJSON: () => ({}), top: 5, width: 95, x: 5, y: 5,
  });

  const handler = (target as unknown as { __nativeDragHandler: (event: unknown) => void }).__nativeDragHandler;
  handler({ clientX: 0, clientY: 0, target, type, ...overrides });
};

const dispatchResizeEvent = (target: Element, type: `resizestart` | `resizemove` | `resizeend`, overrides: Record<string, unknown> = {}) => {
  Object.defineProperty(target, `offsetParent`, { configurable: true, value: document.body });
  document.body.getBoundingClientRect = () => ({
    bottom: 0, height: 0, left: 0, right: 0, toJSON: () => ({}), top: 0, width: 0, x: 0, y: 0,
  });

  const handler = (target as unknown as { __nativeResizeHandler: (event: unknown) => void }).__nativeResizeHandler;
  handler({ clientX: 0, clientY: 0, edges: RIGHT_EDGE, target, type, ...overrides });
};

const mountedWrappers: { unmount: () => void }[] = [];

/**
 * Mounts a real grid with one real item per id (each 4x4, stacked in column 0 so a width grow is never capped by the
 * grid's right edge). `itemProps` is keyed by item id and is what the returned reactive `itemState` starts out as;
 * mutating `itemState[id]` afterwards changes that item's own props exactly like a reactive `v-for` binding would.
 */
function mountItems(ids: string[], { itemProps = {}, layoutProps = {} }: { itemProps?: Record<string, Record<string, unknown>>; layoutProps?: Record<string, unknown> } = {}) {
  const layout = ids.map((i, n) => ({ h: 4, i, w: 4, x: 0, y: n * 4 }));
  const itemState = reactive(Object.fromEntries(ids.map(i => [i, { ...(itemProps[i] ?? {}) }])));
  const wrapper = mount(GridLayout, {
    props: { layout, margin: MARGIN, rowHeight: ROW_HEIGHT, ...layoutProps },
    slots: {
      default: () => layout.map(item => h(GridItem, { ...item, ...itemState[item.i], key: item.i }, () => `Item ${item.i}`)),
    },
  });
  mountedWrappers.push(wrapper);
  return { itemState, layout, wrapper };
}

/** The real (non-placeholder) `GridItem` component with the given id. */
const itemComponent = (wrapper, id: string) =>
  wrapper.findAllComponents(GridItem).find(c => c.props(`i`) === id && !c.classes().includes(`vue-grid-placeholder`));

/** Runs a drag on the item and reports whether the auto-scroll engine was started by it. */
const dragStartsAutoScroll = async (wrapper, id: string): Promise<boolean> => {
  const { element } = itemComponent(wrapper, id);
  autoScrollSpies.start.mockClear();
  dispatchDragEvent(element, `dragstart`, { clientX: 10, clientY: 10 });
  const started = autoScrollSpies.start.mock.calls.length > 0;
  dispatchDragEvent(element, `dragend`, { clientX: 10, clientY: 10 });
  await settle();
  return started;
};

/** Runs a resize on the item (no movement) and reports whether the auto-scroll engine was started by it. */
const resizeStartsAutoScroll = async (wrapper, id: string): Promise<boolean> => {
  const { element } = itemComponent(wrapper, id);
  autoScrollSpies.start.mockClear();
  autoScrollSpies.stop.mockClear();
  dispatchResizeEvent(element, `resizestart`);
  const started = autoScrollSpies.start.mock.calls.length > 0;
  dispatchResizeEvent(element, `resizeend`);
  await settle();
  return started;
};

/** Drags the right edge of the item `dx` pixels and reports the size the item asked for. */
const resizeRightBy = async (wrapper, id: string, dx: number) => {
  const component = itemComponent(wrapper, id);
  const { element } = component;
  dispatchResizeEvent(element, `resizestart`, { clientX: 0, clientY: 0 });
  dispatchResizeEvent(element, `resizemove`, { clientX: dx, clientY: 0 });
  // [id, gridH, gridW, pixelHeight, pixelWidth] — the last RESIZE of the gesture is the one the move caused.
  const call = component.emitted(EGridItemEvent.RESIZE).at(-1) as number[];
  dispatchResizeEvent(element, `resizeend`, { clientX: dx, clientY: 0 });
  await settle();
  return { gridH: call[1], gridW: call[2], height: call[3], width: call[4] };
};

/** Width grew with the start ratio kept, so the height was derived from it. */
const expectRatioKept = (result: { gridH: number; height: number; width: number }) => {
  expect(result.width).toBeGreaterThan(START_WIDTH);
  expect(result.gridH).toBeGreaterThan(4);
  expect(result.height).toBeGreaterThan(START_HEIGHT);
  expect(result.width / result.height).toBeCloseTo(START_RATIO, 2);
};

/** Width grew, height was left exactly where it started. */
const expectRatioFree = (result: { gridH: number; gridW: number; height: number; width: number }) => {
  expect(result.width).toBeGreaterThan(START_WIDTH);
  expect(result.gridW).toBeGreaterThan(4);
  expect(result.gridH).toBe(4);
  expect(result.height).toBe(START_HEIGHT);
};

describe(`GridLayout autoScroll / preserveAspectRatio inheritance`, () => {
  beforeEach(() => {
    stubOffsetWidth(CONTAINER_WIDTH);
  });

  afterEach(() => {
    mountedWrappers.splice(0).forEach(wrapper => wrapper.unmount());
    autoScrollSpies.start.mockClear();
    autoScrollSpies.stop.mockClear();
    autoScrollSpies.update.mockClear();
    restoreOffsetWidth();
  });

  describe(`autoScroll while dragging`, () => {
    it(`Should not start auto-scroll when neither the grid nor the item turns it on`, async () => {
      const { wrapper } = mountItems([`a`]);
      await settle();

      expect(await dragStartsAutoScroll(wrapper, `a`)).toBe(false);
    });

    it(`Should start auto-scroll for an item that sets nothing when the grid's autoScroll is true`, async () => {
      const { wrapper } = mountItems([`a`], { layoutProps: { autoScroll: true } });
      await settle();

      expect(await dragStartsAutoScroll(wrapper, `a`)).toBe(true);
    });

    it(`Should keep feeding the pointer position to the engine during the drag of an item that inherits autoScroll`, async () => {
      const { wrapper } = mountItems([`a`], { layoutProps: { autoScroll: true } });
      await settle();
      const { element } = itemComponent(wrapper, `a`);
      autoScrollSpies.update.mockClear();
      autoScrollSpies.stop.mockClear();

      dispatchDragEvent(element, `dragstart`, { clientX: 10, clientY: 10 });
      dispatchDragEvent(element, `dragmove`, { clientX: 12, clientY: 14 });
      dispatchDragEvent(element, `dragend`, { clientX: 12, clientY: 14 });

      expect(autoScrollSpies.update).toHaveBeenCalledWith(12, 14);
      expect(autoScrollSpies.stop).toHaveBeenCalled();
    });

    it(`Should let an item's own autoScroll false override a grid-level true`, async () => {
      const { wrapper } = mountItems([`a`], { itemProps: { a: { autoScroll: false } }, layoutProps: { autoScroll: true } });
      await settle();

      expect(await dragStartsAutoScroll(wrapper, `a`)).toBe(false);
    });

    it(`Should let an item's own autoScroll true override a grid-level false`, async () => {
      const { wrapper } = mountItems([`a`], { itemProps: { a: { autoScroll: true } }, layoutProps: { autoScroll: false } });
      await settle();

      expect(await dragStartsAutoScroll(wrapper, `a`)).toBe(true);
    });

    it(`Should treat an explicit null on the item like leaving the prop out (inherit)`, async () => {
      const { wrapper } = mountItems([`a`], { itemProps: { a: { autoScroll: null } }, layoutProps: { autoScroll: true } });
      await settle();

      expect(await dragStartsAutoScroll(wrapper, `a`)).toBe(true);
    });

    it(`Should update inheriting items, but not items with their own value, when the grid prop changes after mount`, async () => {
      const { wrapper } = mountItems([`inherit`, `off`, `on`], {
        itemProps: { off: { autoScroll: false }, on: { autoScroll: true } },
        layoutProps: { autoScroll: false },
      });
      await settle();

      expect(await dragStartsAutoScroll(wrapper, `inherit`)).toBe(false);
      expect(await dragStartsAutoScroll(wrapper, `off`)).toBe(false);
      expect(await dragStartsAutoScroll(wrapper, `on`)).toBe(true);

      await wrapper.setProps({ autoScroll: true });
      await settle();

      expect(await dragStartsAutoScroll(wrapper, `inherit`)).toBe(true);
      expect(await dragStartsAutoScroll(wrapper, `off`)).toBe(false);
      expect(await dragStartsAutoScroll(wrapper, `on`)).toBe(true);

      await wrapper.setProps({ autoScroll: false });
      await settle();

      expect(await dragStartsAutoScroll(wrapper, `inherit`)).toBe(false);
      expect(await dragStartsAutoScroll(wrapper, `off`)).toBe(false);
      expect(await dragStartsAutoScroll(wrapper, `on`)).toBe(true);
    });

    it(`Should re-inherit the grid value when an item's own autoScroll goes back to null (false -> null under a grid true)`, async () => {
      const { itemState, wrapper } = mountItems([`a`], { itemProps: { a: { autoScroll: false } }, layoutProps: { autoScroll: true } });
      await settle();
      expect(await dragStartsAutoScroll(wrapper, `a`)).toBe(false);

      itemState.a.autoScroll = null;
      await settle();

      expect(await dragStartsAutoScroll(wrapper, `a`)).toBe(true);
    });

    it(`Should re-inherit the grid value when an item's own autoScroll goes back to null (true -> null under a grid false)`, async () => {
      const { itemState, wrapper } = mountItems([`a`], { itemProps: { a: { autoScroll: true } }, layoutProps: { autoScroll: false } });
      await settle();
      expect(await dragStartsAutoScroll(wrapper, `a`)).toBe(true);

      itemState.a.autoScroll = null;
      await settle();

      expect(await dragStartsAutoScroll(wrapper, `a`)).toBe(false);
    });

    it(`Should re-inherit the grid's current value, not the one it had at mount, when the item goes back to null`, async () => {
      const { itemState, wrapper } = mountItems([`a`], { itemProps: { a: { autoScroll: false } }, layoutProps: { autoScroll: false } });
      await settle();

      // The grid changes while the item holds its own value: the item must ignore it ...
      await wrapper.setProps({ autoScroll: true });
      await settle();
      expect(await dragStartsAutoScroll(wrapper, `a`)).toBe(false);

      // ... but pick it up the moment it stops having an opinion of its own.
      itemState.a.autoScroll = null;
      await settle();
      expect(await dragStartsAutoScroll(wrapper, `a`)).toBe(true);
    });

    it(`Should follow later grid changes again after an item went back to null`, async () => {
      const { itemState, wrapper } = mountItems([`a`], { itemProps: { a: { autoScroll: true } }, layoutProps: { autoScroll: false } });
      await settle();

      itemState.a.autoScroll = null;
      await settle();
      expect(await dragStartsAutoScroll(wrapper, `a`)).toBe(false);

      await wrapper.setProps({ autoScroll: true });
      await settle();
      expect(await dragStartsAutoScroll(wrapper, `a`)).toBe(true);
    });

    it(`Should stop inheriting once an item gets its own value after mount`, async () => {
      const { itemState, wrapper } = mountItems([`a`], { layoutProps: { autoScroll: true } });
      await settle();
      expect(await dragStartsAutoScroll(wrapper, `a`)).toBe(true);

      itemState.a.autoScroll = false;
      await settle();
      expect(await dragStartsAutoScroll(wrapper, `a`)).toBe(false);

      // The grid flipping must not reach it now.
      await wrapper.setProps({ autoScroll: false });
      await settle();
      await wrapper.setProps({ autoScroll: true });
      await settle();
      expect(await dragStartsAutoScroll(wrapper, `a`)).toBe(false);
    });
  });

  describe(`autoScroll while resizing`, () => {
    it(`Should start auto-scroll on a resize for an item that sets nothing when the grid's autoScroll is true`, async () => {
      const { wrapper } = mountItems([`a`], { layoutProps: { autoScroll: true } });
      await settle();

      expect(await resizeStartsAutoScroll(wrapper, `a`)).toBe(true);
      expect(autoScrollSpies.stop).toHaveBeenCalled();
    });

    it(`Should not start auto-scroll on a resize when neither the grid nor the item turns it on`, async () => {
      const { wrapper } = mountItems([`a`]);
      await settle();

      expect(await resizeStartsAutoScroll(wrapper, `a`)).toBe(false);
    });

    it(`Should let item-level values override the grid on a resize, both ways`, async () => {
      const { wrapper } = mountItems([`off`, `on`], {
        itemProps: { off: { autoScroll: false }, on: { autoScroll: true } },
        layoutProps: { autoScroll: true },
      });
      await settle();
      expect(await resizeStartsAutoScroll(wrapper, `off`)).toBe(false);
      expect(await resizeStartsAutoScroll(wrapper, `on`)).toBe(true);

      await wrapper.setProps({ autoScroll: false });
      await settle();

      expect(await resizeStartsAutoScroll(wrapper, `off`)).toBe(false);
      expect(await resizeStartsAutoScroll(wrapper, `on`)).toBe(true);
    });

    it(`Should pick up a grid change after mount on a resize, and re-inherit after going back to null`, async () => {
      const { itemState, wrapper } = mountItems([`inherit`, `own`], { itemProps: { own: { autoScroll: false } } });
      await settle();
      expect(await resizeStartsAutoScroll(wrapper, `inherit`)).toBe(false);

      await wrapper.setProps({ autoScroll: true });
      await settle();
      expect(await resizeStartsAutoScroll(wrapper, `inherit`)).toBe(true);
      expect(await resizeStartsAutoScroll(wrapper, `own`)).toBe(false);

      itemState.own.autoScroll = null;
      await settle();
      expect(await resizeStartsAutoScroll(wrapper, `own`)).toBe(true);
    });
  });

  describe(`preserveAspectRatio while resizing`, () => {
    it(`Should leave the height alone when neither the grid nor the item turns it on`, async () => {
      const { wrapper } = mountItems([`a`]);
      await settle();

      expectRatioFree(await resizeRightBy(wrapper, `a`, 200));
    });

    it(`Should keep the ratio for an item that sets nothing when the grid's preserveAspectRatio is true`, async () => {
      const { wrapper } = mountItems([`a`], { layoutProps: { preserveAspectRatio: true } });
      await settle();

      expectRatioKept(await resizeRightBy(wrapper, `a`, 200));
    });

    it(`Should let an item's own preserveAspectRatio false override a grid-level true`, async () => {
      const { wrapper } = mountItems([`a`], { itemProps: { a: { preserveAspectRatio: false } }, layoutProps: { preserveAspectRatio: true } });
      await settle();

      expectRatioFree(await resizeRightBy(wrapper, `a`, 200));
    });

    it(`Should let an item's own preserveAspectRatio true override a grid-level false`, async () => {
      const { wrapper } = mountItems([`a`], { itemProps: { a: { preserveAspectRatio: true } }, layoutProps: { preserveAspectRatio: false } });
      await settle();

      expectRatioKept(await resizeRightBy(wrapper, `a`, 200));
    });

    it(`Should treat an explicit null on the item like leaving the prop out (inherit)`, async () => {
      const { wrapper } = mountItems([`a`], { itemProps: { a: { preserveAspectRatio: null } }, layoutProps: { preserveAspectRatio: true } });
      await settle();

      expectRatioKept(await resizeRightBy(wrapper, `a`, 200));
    });

    it(`Should derive the width from the height for an inheriting item when only the bottom edge is dragged`, async () => {
      const { wrapper } = mountItems([`a`], { layoutProps: { preserveAspectRatio: true } });
      await settle();
      const component = itemComponent(wrapper, `a`);
      const bottom = { bottom: true, left: false, right: false, top: false };

      dispatchResizeEvent(component.element, `resizestart`, { clientX: 0, clientY: 0, edges: bottom });
      dispatchResizeEvent(component.element, `resizemove`, { clientX: 0, clientY: 200, edges: bottom });

      const call = component.emitted(EGridItemEvent.RESIZE).at(-1) as number[];
      expect(call[4]).toBeGreaterThan(START_WIDTH);
      expect(call[4] / call[3]).toBeCloseTo(START_RATIO, 2);
    });

    // One fresh item per kind per phase: an item that has been resized once is no longer the 4x4 the start ratio assumes.
    it(`Should update inheriting items, but not items with their own value, when the grid prop changes after mount`, async () => {
      const ids = [`inherit-1`, `off-1`, `on-1`, `inherit-2`, `off-2`, `on-2`, `inherit-3`, `off-3`, `on-3`];
      const itemProps = {};
      ids.filter(id => id.startsWith(`off`)).forEach(id => { itemProps[id] = { preserveAspectRatio: false }; });
      ids.filter(id => id.startsWith(`on`)).forEach(id => { itemProps[id] = { preserveAspectRatio: true }; });
      const { wrapper } = mountItems(ids, { itemProps, layoutProps: { preserveAspectRatio: false } });
      await settle();

      expectRatioFree(await resizeRightBy(wrapper, `inherit-1`, 200));
      expectRatioFree(await resizeRightBy(wrapper, `off-1`, 200));
      expectRatioKept(await resizeRightBy(wrapper, `on-1`, 200));

      await wrapper.setProps({ preserveAspectRatio: true });
      await settle();

      expectRatioKept(await resizeRightBy(wrapper, `inherit-2`, 200));
      expectRatioFree(await resizeRightBy(wrapper, `off-2`, 200));
      expectRatioKept(await resizeRightBy(wrapper, `on-2`, 200));

      await wrapper.setProps({ preserveAspectRatio: false });
      await settle();

      expectRatioFree(await resizeRightBy(wrapper, `inherit-3`, 200));
      expectRatioFree(await resizeRightBy(wrapper, `off-3`, 200));
      expectRatioKept(await resizeRightBy(wrapper, `on-3`, 200));
    });

    it(`Should re-inherit the grid value when an item's own preserveAspectRatio goes back to null (false -> null under a grid true)`, async () => {
      const { itemState, wrapper } = mountItems([`before`, `after`], {
        itemProps: { after: { preserveAspectRatio: false }, before: { preserveAspectRatio: false } },
        layoutProps: { preserveAspectRatio: true },
      });
      await settle();
      expectRatioFree(await resizeRightBy(wrapper, `before`, 200));

      itemState.after.preserveAspectRatio = null;
      await settle();

      expectRatioKept(await resizeRightBy(wrapper, `after`, 200));
    });

    it(`Should re-inherit the grid value when an item's own preserveAspectRatio goes back to null (true -> null under a grid false)`, async () => {
      const { itemState, wrapper } = mountItems([`before`, `after`], {
        itemProps: { after: { preserveAspectRatio: true }, before: { preserveAspectRatio: true } },
        layoutProps: { preserveAspectRatio: false },
      });
      await settle();
      expectRatioKept(await resizeRightBy(wrapper, `before`, 200));

      itemState.after.preserveAspectRatio = null;
      await settle();

      expectRatioFree(await resizeRightBy(wrapper, `after`, 200));
    });

    it(`Should re-inherit the grid's current value, not the one it had at mount, when the item goes back to null`, async () => {
      const { itemState, wrapper } = mountItems([`a`], { itemProps: { a: { preserveAspectRatio: false } }, layoutProps: { preserveAspectRatio: false } });
      await settle();

      await wrapper.setProps({ preserveAspectRatio: true });
      await settle();
      itemState.a.preserveAspectRatio = null;
      await settle();

      expectRatioKept(await resizeRightBy(wrapper, `a`, 200));
    });

    it(`Should stop inheriting once an item gets its own value after mount`, async () => {
      const { itemState, wrapper } = mountItems([`first`, `second`], { layoutProps: { preserveAspectRatio: true } });
      await settle();

      itemState.second.preserveAspectRatio = false;
      await settle();
      // The grid flipping must not reach it now.
      await wrapper.setProps({ preserveAspectRatio: false });
      await settle();
      await wrapper.setProps({ preserveAspectRatio: true });
      await settle();

      expectRatioFree(await resizeRightBy(wrapper, `second`, 200));
      expectRatioKept(await resizeRightBy(wrapper, `first`, 200));
    });
  });
});
