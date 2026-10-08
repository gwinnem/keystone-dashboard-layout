// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, nextTick, reactive } from 'vue';
import { mount } from '@vue/test-utils';
import { GridItem, GridLayout } from '../src/components';
import { restoreOffsetWidth, stubOffsetWidth } from './helpers/mountGrid';

/**
 * A `GridItem` reports its isStatic / isDraggable / isResizable / min-max props to the grid (`itemOverrides` on the
 * eventBus), and the grid copies the non-default ones onto that item's layout ENTRY — which is what collision handling
 * and group move/resize read. These tests pin that contract.
 *
 * The layout entry and the item's props are deliberately separate objects here (unlike `mountGridWithReactiveItem`,
 * which makes them one and the same): the whole point is that a value given only as a prop reaches the entry.
 */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 8; i++) {
    // eslint-disable-next-line no-await-in-loop
    await nextTick();
  }
};

function mountWithItemProps(entry: Record<string, unknown>, initialProps: Record<string, unknown> = {}, extraItems: Record<string, unknown>[] = []) {
  const layout = [entry];
  const itemProps = reactive<Record<string, unknown>>({ ...initialProps });
  const wrapper = mount(GridLayout, {
    props: { layout, margin: [10, 10], rowHeight: 100 },
    slots: {
      default: () => [
        h(GridItem, { ...entry, ...itemProps, key: String(entry.i) }, () => `Item ${entry.i}`),
        ...extraItems.map(extra => h(GridItem, { ...extra, key: String(extra.i) }, () => `Item ${extra.i}`)),
      ],
    },
  });
  return { itemProps, layout, wrapper };
}

describe(`GridItem props reported to the layout entry`, () => {
  beforeEach(() => {
    stubOffsetWidth(1200);
  });

  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should copy a static prop onto the layout entry`, async () => {
    const { layout } = mountWithItemProps({ h: 2, i: `0`, w: 2, x: 0, y: 0 }, { isStatic: true });
    await settle();

    expect(layout[0].isStatic).toBe(true);
  });

  it(`Should copy the explicit interaction flags and size limits onto the entry`, async () => {
    const { layout } = mountWithItemProps(
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { isDraggable: false, isResizable: false, maxH: 5, maxW: 4, minH: 2, minW: 2 },
    );
    await settle();

    expect(layout[0]).toMatchObject({ isDraggable: false, isResizable: false, maxH: 5, maxW: 4, minH: 2, minW: 2 });
  });

  it(`Should leave the entry exactly as it was when every prop is at its default`, async () => {
    const { layout } = mountWithItemProps({ h: 2, i: `0`, w: 2, x: 0, y: 0 });
    await settle();

    for(const key of [`isStatic`, `isDraggable`, `isResizable`, `minW`, `maxW`, `minH`, `maxH`]) {
      expect(key in layout[0]).toBe(false);
    }
  });

  it(`Should pick up a prop that changes after mount`, async () => {
    const { itemProps, layout } = mountWithItemProps({ h: 2, i: `0`, w: 2, x: 0, y: 0 });
    await settle();
    expect(layout[0].isStatic).toBeUndefined();

    itemProps.isStatic = true;
    await settle();

    expect(layout[0].isStatic).toBe(true);
  });

  it(`Should take the field away again when the prop goes back to its default and the entry had nothing`, async () => {
    const { itemProps, layout } = mountWithItemProps({ h: 2, i: `0`, w: 2, x: 0, y: 0 }, { isStatic: true });
    await settle();
    expect(layout[0].isStatic).toBe(true);

    itemProps.isStatic = false;
    await settle();

    expect(`isStatic` in layout[0]).toBe(false);
  });

  it(`Should restore the entry's own value, not leave the prop's, when the prop goes back to its default`, async () => {
    // The entry itself says maxW 6; the item prop narrows it to 4; clearing the prop must bring 6 back.
    const { itemProps, layout } = mountWithItemProps({ h: 2, i: `0`, maxW: 6, w: 2, x: 0, y: 0 });
    await settle();
    itemProps.maxW = 4;
    await settle();
    expect(layout[0].maxW).toBe(4);

    itemProps.maxW = Infinity;
    await settle();

    expect(layout[0].maxW).toBe(6);
  });

  it(`Should ignore an item that is not part of the layout (as the hidden drag-placeholder item is not)`, async () => {
    const entry = { h: 2, i: `0`, w: 2, x: 0, y: 0 };
    const { layout } = mountWithItemProps(entry, {}, [{ h: 1, i: `ghost`, isStatic: true, w: 1, x: 6, y: 0 }]);
    await settle();

    expect(layout).toHaveLength(1);
    expect(`isStatic` in layout[0]).toBe(false);
  });
});

describe(`GridItem autoHeight toggled after mount`, () => {
  beforeEach(() => {
    stubOffsetWidth(1200);
  });

  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should start observing the auto-height wrapper when it is turned on, and stop when it is turned off`, async () => {
    const instances: { disconnect: ReturnType<typeof vi.fn>; observe: ReturnType<typeof vi.fn> }[] = [];
    // tests/setup.ts installs its own ResizeObserver with vi.stubGlobal, so put that one back afterwards rather than
    // calling vi.unstubAllGlobals(), which would remove it for every later test in this file.
    const sharedMock = globalThis.ResizeObserver;
    vi.stubGlobal(`ResizeObserver`, class {
      disconnect = vi.fn();
      observe = vi.fn();
      unobserve = vi.fn();

      constructor() {
        instances.push(this);
      }
    });
    const { itemProps, wrapper } = mountWithItemProps({ h: 2, i: `0`, w: 2, x: 0, y: 0 });
    try {
      await settle();
      const observerOfWrapper = () => instances.find(instance =>
        instance.observe.mock.calls.some(([element]) => element?.classList?.contains(`vue-grid-item-auto-height-wrapper`)));
      expect(observerOfWrapper()).toBeUndefined();

      itemProps.autoHeight = true;
      await settle();
      const observer = observerOfWrapper();
      expect(observer).toBeDefined();
      expect(observer.disconnect).not.toHaveBeenCalled();

      itemProps.autoHeight = false;
      await settle();
      expect(observer.disconnect).toHaveBeenCalled();
    } finally {
      wrapper.unmount();
      vi.stubGlobal(`ResizeObserver`, sharedMock);
    }
  });
});
