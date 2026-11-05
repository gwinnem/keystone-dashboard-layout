import { describe, expect, it } from 'vitest';
import { compactLayoutFast } from '../src/gridlayout/helpers/fast-compact-helper';
import { verticalCompactor, verticalFastCompactor } from '../src/gridlayout/helpers/compactor';
import { compactLayout } from '../src/helpers/utils';
import { ECompactType } from '../src/gridlayout/enums/ECompactType';
import type { ILayoutItem, TLayout } from '../src/layout-definition';

/** Small deterministic PRNG (mulberry32) so a failing seed can be replayed. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface IRandomLayoutOptions {
  count: number;
  cols?: number;
  maxY?: number;
  staticChance?: number;
  infinityChance?: number;
}

/** Overlapping, gappy, partly static input — the messy case compaction exists for. */
function randomLayout(seed: number, options: IRandomLayoutOptions): TLayout {
  const random = createRandom(seed);
  const { count, cols = 12, maxY = 40, staticChance = 0, infinityChance = 0 } = options;
  const layout: TLayout = [];
  for(let i = 0; i < count; i++) {
    const w = 1 + Math.floor(random() * 4);
    const item: ILayoutItem = {
      h: 1 + Math.floor(random() * 4),
      i: `item-${i}`,
      w,
      x: Math.floor(random() * (cols - w + 1)),
      y: random() < infinityChance ? Infinity : Math.floor(random() * maxY),
    };
    if(random() < staticChance) {
      item.isStatic = true;
      item.y = Math.floor(random() * maxY);
    }
    layout.push(item);
  }
  return layout;
}

/** Both implementations mutate their input, so each gets its own copy. */
function compactBoth(layout: TLayout, minPositions?: Record<string, { y: number }>): { fast: TLayout; reference: TLayout } {
  const copy = (): TLayout => layout.map(item => ({ ...item }));
  return {
    fast: compactLayoutFast(copy(), minPositions),
    reference: compactLayout(copy(), true, minPositions),
  };
}

describe(`compactLayoutFast`, () => {
  describe(`equivalence with compactLayout(layout, true)`, () => {
    it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])(`Should match on a random dense layout (seed %i)`, seed => {
      const { fast, reference } = compactBoth(randomLayout(seed, { count: 150 }));
      expect(fast).toStrictEqual(reference);
    });

    it.each([11, 12, 13, 14, 15, 16, 17, 18])(`Should match with static items scattered through the layout (seed %i)`, seed => {
      const { fast, reference } = compactBoth(randomLayout(seed, { count: 120, staticChance: 0.15 }));
      expect(fast).toStrictEqual(reference);
    });

    it.each([21, 22, 23, 24, 25, 26])(`Should match with Infinity y (append-past-everything) items mixed in (seed %i)`, seed => {
      const { fast, reference } = compactBoth(randomLayout(seed, { count: 100, staticChance: 0.1, infinityChance: 0.2 }));
      expect(fast).toStrictEqual(reference);
    });

    it.each([31, 32, 33, 34, 35, 36])(`Should match when minPositions limits how far items may rise (seed %i)`, seed => {
      const layout = randomLayout(seed, { count: 100, staticChance: 0.1 });
      const random = createRandom(seed + 1000);
      const minPositions: Record<string, { y: number }> = {};
      for(const item of layout) {
        if(random() < 0.6) {
          minPositions[item.i] = { y: Math.floor(random() * 20) };
        }
      }
      const { fast, reference } = compactBoth(layout, minPositions);
      expect(fast).toStrictEqual(reference);
    });

    it(`Should match on a layout that is already compact`, () => {
      const layout: TLayout = [
        { h: 2, i: `a`, w: 6, x: 0, y: 0 },
        { h: 2, i: `b`, w: 6, x: 6, y: 0 },
        { h: 3, i: `c`, w: 12, x: 0, y: 2 },
      ];
      const { fast, reference } = compactBoth(layout);
      expect(fast).toStrictEqual(reference);
      expect(fast.map(item => item.y)).toStrictEqual([0, 0, 2]);
    });

    it(`Should match on a layout where every item starts in the same cell`, () => {
      const layout: TLayout = Array.from({ length: 12 }, (_, index) => ({ h: 2, i: `${index}`, w: 3, x: 0, y: 0 }));
      const { fast, reference } = compactBoth(layout);
      expect(fast).toStrictEqual(reference);
    });

    it(`Should leave an item resting on a static item below a free gap where the reference leaves it`, () => {
      const layout: TLayout = [
        { h: 1, i: `wall`, isStatic: true, w: 2, x: 0, y: 2 },
        { h: 1, i: `far`, w: 2, x: 0, y: 6 },
        { h: 1, i: `top`, w: 2, x: 0, y: 0 },
      ];
      const { fast, reference } = compactBoth(layout);
      expect(fast).toStrictEqual(reference);
      expect(fast.find(item => item.i === `far`)?.y).toBe(3);
      expect(fast.find(item => item.i === `top`)?.y).toBe(0);
    });
  });

  describe(`contract`, () => {
    it(`Should return an empty array for an empty layout`, () => {
      expect(compactLayoutFast([])).toStrictEqual([]);
    });

    it(`Should return items in their original order, not the processing order`, () => {
      const layout: TLayout = [
        { h: 1, i: `bottom`, w: 2, x: 0, y: 9 },
        { h: 1, i: `top`, w: 2, x: 0, y: 0 },
      ];
      const result = compactLayoutFast(layout);
      expect(result.map(item => item.i)).toStrictEqual([`bottom`, `top`]);
      expect(result.map(item => item.y)).toStrictEqual([1, 0]);
    });

    it(`Should clear the moved flag on every item, statics included, like the reference`, () => {
      const layout: TLayout = [
        { h: 1, i: `a`, moved: true, w: 1, x: 0, y: 3 },
        { h: 1, i: `s`, isStatic: true, moved: true, w: 1, x: 5, y: 3 },
      ];
      const result = compactLayoutFast(layout);
      expect(result.every(item => item.moved === false)).toBe(true);
    });

    it(`Should never move a static item`, () => {
      const layout: TLayout = [{ h: 2, i: `s`, isStatic: true, w: 2, x: 3, y: 7 }];
      expect(compactLayoutFast(layout)[0].y).toBe(7);
    });

    it(`Should not rise above minPositions`, () => {
      const layout: TLayout = [{ h: 1, i: `a`, w: 1, x: 0, y: 9 }];
      expect(compactLayoutFast(layout, { a: { y: 4 } })[0].y).toBe(4);
    });

    it(`Should leave an item alone that already sits above its minPositions floor`, () => {
      const layout: TLayout = [{ h: 1, i: `a`, w: 1, x: 0, y: 2 }];
      expect(compactLayoutFast(layout, { a: { y: 4 } })[0].y).toBe(2);
    });

    it(`Should treat an entry without y in minPositions as no floor`, () => {
      const layout: TLayout = [{ h: 1, i: `a`, w: 1, x: 0, y: 9 }];
      expect(compactLayoutFast(layout, { a: {} })[0].y).toBe(0);
    });
  });

  describe(`input outside the integer-grid contract`, () => {
    const cases: Array<[string, TLayout]> = [
      [`a fractional y`, [{ h: 1, i: `a`, w: 1, x: 0, y: 2.5 }, { h: 1, i: `b`, w: 1, x: 0, y: 7 }]],
      [`a fractional width`, [{ h: 1, i: `a`, w: 1.5, x: 0, y: 3 }]],
      [`a zero height`, [{ h: 0, i: `a`, w: 1, x: 0, y: 3 }, { h: 1, i: `b`, w: 1, x: 0, y: 5 }]],
      [`a zero width`, [{ h: 1, i: `a`, w: 0, x: 0, y: 3 }]],
      [`a negative x`, [{ h: 1, i: `a`, w: 1, x: -1, y: 3 }]],
      [`an x far beyond any real grid`, [{ h: 1, i: `a`, w: 1, x: 99999, y: 3 }]],
      [`a static item with a fractional y`, [{ h: 1, i: `s`, isStatic: true, w: 1, x: 0, y: 1.5 }, { h: 1, i: `a`, w: 1, x: 0, y: 4 }]],
      [`a static item with Infinity y`, [{ h: 1, i: `s`, isStatic: true, w: 1, x: 0, y: Infinity }]],
      [`a -Infinity y`, [{ h: 1, i: `a`, w: 1, x: 0, y: -Infinity }]],
      [`a NaN y`, [{ h: 1, i: `a`, w: 1, x: 0, y: NaN }]],
    ];

    it.each(cases)(`Should give the reference result for %s`, (_name, layout) => {
      const { fast, reference } = compactBoth(layout);
      expect(fast).toStrictEqual(reference);
    });

    it(`Should give the reference result for a fractional minPositions entry`, () => {
      const layout: TLayout = [{ h: 1, i: `a`, w: 1, x: 0, y: 9 }];
      const { fast, reference } = compactBoth(layout, { a: { y: 2.5 } });
      expect(fast).toStrictEqual(reference);
    });
  });

  describe(`verticalFastCompactor`, () => {
    it(`Should have type "vertical-fast"`, () => {
      expect(verticalFastCompactor.type).toBe(`vertical-fast`);
    });

    it(`Should produce the same result as verticalCompactor`, () => {
      const layout = randomLayout(99, { count: 80, staticChance: 0.1 });
      const context = { compactType: ECompactType.VERTICAL };
      const fast = verticalFastCompactor.compact(layout.map(item => ({ ...item })), 12, context);
      const reference = verticalCompactor.compact(layout.map(item => ({ ...item })), 12, context);
      expect(fast).toStrictEqual(reference);
    });

    it(`Should pass context.minPositions through`, () => {
      const layout: TLayout = [{ h: 1, i: `a`, w: 1, x: 0, y: 9 }];
      const result = verticalFastCompactor.compact(layout, 12, {
        compactType: ECompactType.VERTICAL,
        minPositions: { a: { y: 6 } },
      });
      expect(result[0].y).toBe(6);
    });
  });
});
