import { describe, expect, it } from 'vitest';
import { createSwapDragState, swapElement } from '../src/gridlayout/helpers/swap-helper';
import type { ILayoutItem, TLayout } from '../src/layout-definition';

const item = (i: string, x: number, y: number, w = 2, h = 2, extra: Partial<ILayoutItem> = {}): ILayoutItem => ({ h, i, w, x, y, ...extra });

const row = (): TLayout => [item(`a`, 0, 0), item(`b`, 2, 0), item(`c`, 4, 0)];
const pos = (layout: TLayout, id: string) => {
  const found = layout.find(l => l.i === id) as ILayoutItem;
  return [found.x, found.y];
};

describe(`swap-helper`, () => {
  describe(`createSwapDragState`, () => {
    it(`Should capture the item's own position and start with nothing displaced`, () => {
      expect(createSwapDragState(item(`a`, 3, 5))).toEqual({ displaced: null, originX: 3, originY: 5 });
    });
  });

  describe(`swapElement`, () => {
    it(`Should trade places with the one item it lands on`, () => {
      const layout = row();
      const [a] = layout;
      const state = createSwapDragState(a);

      expect(swapElement(layout, a, 2, 0, 6, state)).toBe(true);
      expect(pos(layout, `a`)).toEqual([2, 0]);
      expect(pos(layout, `b`)).toEqual([0, 0]);
      expect(pos(layout, `c`)).toEqual([4, 0]);
    });

    it(`Should flag both items as moved`, () => {
      const layout = row();
      const [a, b] = layout;

      swapElement(layout, a, 2, 0, 6, createSwapDragState(a));

      expect(a.moved).toBe(true);
      expect(b.moved).toBe(true);
    });

    it(`Should remember the displaced item and put it back on the next tick`, () => {
      const layout = row();
      const [a, b] = layout;
      const state = createSwapDragState(a);
      swapElement(layout, a, 2, 0, 6, state);

      expect(state.displaced).toEqual({ i: `b`, moved: undefined, x: 2, y: 0 });

      // Moving on to the free space above: b must go home, nothing else swaps.
      expect(swapElement(layout, a, 0, 4, 6, state)).toBe(false);
      expect(pos(layout, `b`)).toEqual([2, 0]);
      expect(b.moved).toBeUndefined();
      expect(state.displaced).toBeNull();
    });

    it(`Should restore the displaced item's own previous moved flag`, () => {
      const layout = [item(`a`, 0, 0), item(`b`, 2, 0, 2, 2, { moved: false })];
      const [a, b] = layout;
      const state = createSwapDragState(a);
      swapElement(layout, a, 2, 0, 6, state);

      swapElement(layout, a, 0, 4, 6, state);

      expect(b.moved).toBe(false);
    });

    it(`Should swap with a different item on the next tick, after putting the first one back`, () => {
      const layout = row();
      const [a] = layout;
      const state = createSwapDragState(a);
      swapElement(layout, a, 2, 0, 6, state);

      expect(swapElement(layout, a, 4, 0, 6, state)).toBe(true);
      expect(pos(layout, `a`)).toEqual([4, 0]);
      expect(pos(layout, `b`)).toEqual([2, 0]);
      expect(pos(layout, `c`)).toEqual([0, 0]);
    });

    it(`Should put the displaced item back by id, even when the next tick hands over fresh copies of the layout`, () => {
      const first = row();
      const state = createSwapDragState(first[0]);
      swapElement(first, first[0], 2, 0, 6, state);

      // A framework that clones the layout every tick: same ids, new objects.
      const second = first.map(entry => ({ ...entry }));
      expect(swapElement(second, second[0], 0, 6, 6, state)).toBe(false);

      expect(pos(second, `b`)).toEqual([2, 0]);
    });

    it(`Should not fail when the displaced item is no longer in the layout`, () => {
      const layout = row();
      const state = createSwapDragState(layout[0]);
      swapElement(layout, layout[0], 2, 0, 6, state);

      const withoutB = layout.filter(entry => entry.i !== `b`);

      expect(() => swapElement(withoutB, withoutB[0], 0, 6, 6, state)).not.toThrow();
      expect(state.displaced).toBeNull();
    });

    it(`Should return false and leave the item where it was when nothing is hit`, () => {
      const layout = row();
      const [a] = layout;

      expect(swapElement(layout, a, 0, 6, 6, createSwapDragState(a))).toBe(false);
      expect(pos(layout, `a`)).toEqual([0, 0]);
    });

    it(`Should return false when the target overlaps more than one item`, () => {
      const layout = row();
      const [a] = layout;

      // At x=3 the dragged item covers columns 3-4, which hits both b (2-3) and c (4-5).
      expect(swapElement(layout, a, 3, 0, 6, createSwapDragState(a))).toBe(false);
      expect(pos(layout, `a`)).toEqual([0, 0]);
      expect(pos(layout, `b`)).toEqual([2, 0]);
      expect(pos(layout, `c`)).toEqual([4, 0]);
    });

    it(`Should return false when the item it lands on is static`, () => {
      const layout = [item(`a`, 0, 0), item(`b`, 2, 0, 2, 2, { isStatic: true })];
      const [a] = layout;

      expect(swapElement(layout, a, 2, 0, 6, createSwapDragState(a))).toBe(false);
      expect(pos(layout, `a`)).toEqual([0, 0]);
      expect(pos(layout, `b`)).toEqual([2, 0]);
    });

    it(`Should return false for a static dragged item`, () => {
      const layout = [item(`a`, 0, 0, 2, 2, { isStatic: true }), item(`b`, 2, 0)];
      const [a] = layout;

      expect(swapElement(layout, a, 2, 0, 6, createSwapDragState(a))).toBe(false);
      expect(pos(layout, `b`)).toEqual([2, 0]);
    });

    it(`Should return false for a negative target, leaving it to moveElement to reject`, () => {
      const layout = row();
      const [a] = layout;
      const state = createSwapDragState(a);

      expect(swapElement(layout, a, -1, 0, 6, state)).toBe(false);
      expect(swapElement(layout, a, 0, -1, 6, state)).toBe(false);
      expect(pos(layout, `a`)).toEqual([0, 0]);
    });

    it(`Should return false when the other item is too wide for the dragged item's starting cell`, () => {
      // a starts at x=4 in a 6-column grid; b is 3 wide, so at x=4 it would end at column 7.
      const layout = [item(`a`, 4, 0), item(`b`, 0, 0, 3, 2)];
      const [a] = layout;

      expect(swapElement(layout, a, 0, 0, 6, createSwapDragState(a))).toBe(false);
      expect(pos(layout, `a`)).toEqual([4, 0]);
      expect(pos(layout, `b`)).toEqual([0, 0]);
    });

    it(`Should accept an item that ends exactly at the last column`, () => {
      const layout = [item(`a`, 4, 0), item(`b`, 0, 0)];
      const [a] = layout;

      expect(swapElement(layout, a, 0, 0, 6, createSwapDragState(a))).toBe(true);
      expect(pos(layout, `b`)).toEqual([4, 0]);
    });

    it(`Should return false when the other item would land on a third one`, () => {
      // b is 4 wide: at a's starting cell (0,0) it would cover columns 0-3 and hit c at x=2.
      const layout = [item(`a`, 0, 0), item(`b`, 0, 4, 4, 2), item(`c`, 2, 0)];
      const [a] = layout;

      expect(swapElement(layout, a, 0, 4, 6, createSwapDragState(a))).toBe(false);
      expect(pos(layout, `a`)).toEqual([0, 0]);
      expect(pos(layout, `b`)).toEqual([0, 4]);
    });

    it(`Should return false when a partial overlap would leave the two items on top of each other`, () => {
      const layout = row();
      const [a] = layout;

      // One column over: b would move to (0,0) and still overlap a at (1,0).
      expect(swapElement(layout, a, 1, 0, 6, createSwapDragState(a))).toBe(false);
      expect(pos(layout, `a`)).toEqual([0, 0]);
      expect(pos(layout, `b`)).toEqual([2, 0]);
    });
  });
});
