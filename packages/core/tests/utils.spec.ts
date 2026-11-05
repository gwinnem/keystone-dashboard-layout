// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { describe, expect, it } from 'vitest';
import {
  getLayoutItem,
  setTopRight,
  setTopLeft,
  setTransformRtl,
  setTransform,
  cloneLayoutItem,
  cloneLayout,
  compactItem,
  compactLayout,
  compactItemHorizontal,
  compactLayoutHorizontal,
  compactLayoutOverlapVertical,
  compactLayoutOverlapHorizontal,
} from '../src/helpers/utils';
import {
  ITopRightStyle,
  ITopLeftStyle,
  ITransformStyle,
} from '../src/common/interfaces/transform-style.interfaces';
import { EErrorMessage } from '../src/common/enums/ErrorMessages';
import { TLayout, ILayoutItem } from '../src/layout-definition';
import { testLayoutOne, testLayoutTwo } from './testLayout';

describe('cloneLayoutItem', () => {
  it('Should return exact copy of layout item', () => {
    const item: ILayoutItem = {
      i: 2,
      h: 1,
      w: 2,
      x: 1,
      y: 0,
    };
    const result = cloneLayoutItem(item);
    expect(result).toStrictEqual(item);
  });

  it('Should preserve Infinity/-Infinity/NaN through the JSON round-trip, not silently corrupt them to null — regression test for a real, confirmed bug', () => {
    // Bug fix: JSON.stringify(Infinity) === "null" is a well-known JSON
    // limitation (JSON itself has no representation for Infinity/
    // -Infinity/NaN). `y: Infinity`/`x: Infinity` is a common, widely-
    // used convention for "place this new item past everything else,
    // then let compaction settle it" (see compactItem's own regression
    // test above), and maxH/maxW/minH/minW/zIndex/borderRadiusPx can all
    // legitimately be Infinity too ("no maximum"). Every one of those
    // silently became null the moment a layout item carrying one passed
    // through cloneLayout — which happens on essentially every drag/
    // resize tick and controlled-component sync in both the Vue and
    // React packages.
    const item: ILayoutItem = {
      i: 'a', h: 1, w: 2, x: 1, y: Infinity,
      maxH: Infinity, maxW: -Infinity, minH: NaN,
    };
    const result = cloneLayoutItem(item);
    expect(result.y).toBe(Infinity);
    expect(result.maxH).toBe(Infinity);
    expect(result.maxW).toBe(-Infinity);
    expect(Number.isNaN(result.minH)).toBe(true);
  });

  it('Should not rewrite a genuine string value that happens to equal the sentinel format, when it lives under an unrelated key name — the fix is scoped by key, not applied to every value in the tree, so a consumer-provided data payload is never touched regardless of what it contains', () => {
    // The consumer-defined `data` field is "never read or written by the
    // library itself" (see that field's own doc comment) — it could
    // legitimately contain any string at all, under any key name. This
    // confirms the sentinel transformation genuinely only applies to the
    // specific known numeric field names (h/w/x/y/minH/minW/maxH/maxW/
    // zIndex/borderRadiusPx) — `label` here isn't one of them, so this
    // string round-trips unchanged even though its own value happens to
    // exactly match the sentinel format.
    const item: ILayoutItem = { i: 'a', h: 1, w: 2, x: 0, y: 0, data: { label: '\uE000Infinity\uE000' } };
    const result = cloneLayoutItem(item);
    expect(result.data).toStrictEqual({ label: '\uE000Infinity\uE000' });
  });

  it('Should deep-clone the nested ariaLabels object and resizeHandles array, not share references with the original', () => {
    const ariaLabels = { closeButton: 'Close this' };
    const resizeHandles: ILayoutItem['resizeHandles'] = ['n', 's'];
    const item: ILayoutItem = { i: 'a', h: 1, w: 2, x: 0, y: 0, ariaLabels, resizeHandles };
    const result = cloneLayoutItem(item);
    expect(result.ariaLabels).toStrictEqual(ariaLabels);
    expect(result.ariaLabels).not.toBe(ariaLabels);
    expect(result.resizeHandles).toStrictEqual(resizeHandles);
    expect(result.resizeHandles).not.toBe(resizeHandles);
  });
});

describe('cloneLayout', () => {
  it('Should return exact copy of layout', () => {
    const result = cloneLayout(testLayoutOne);
    expect(result).toStrictEqual(testLayoutOne);
  });
});

describe('compactItem', () => {
  it('Should move an item up as far as possible when verticalCompact is true and nothing blocks it', () => {
    const item: ILayoutItem = { i: 'a', x: 0, y: 5, w: 2, h: 1 };
    const result = compactItem([], item, true);

    expect(result).toStrictEqual({ i: 'a', x: 0, y: 0, w: 2, h: 1 });
  });

  it('Should stop moving up when it would collide with another item', () => {
    const blocker: ILayoutItem = { i: 'blocker', x: 0, y: 1, w: 2, h: 1 };
    const item: ILayoutItem = { i: 'a', x: 0, y: 5, w: 2, h: 1 };
    const result = compactItem([blocker], item, true);

    expect(result).toStrictEqual({ i: 'a', x: 0, y: 2, w: 2, h: 1 });
  });

  it('Should respect minPositions instead of moving to 0 when verticalCompact is false', () => {
    const item: ILayoutItem = { i: 'a', x: 0, y: 5, w: 2, h: 1 };
    const result = compactItem([], item, false, { a: { y: 3 } });

    expect(result).toStrictEqual({ i: 'a', x: 0, y: 3, w: 2, h: 1 });
  });

  it('Should push an item down until it no longer collides', () => {
    const blocker: ILayoutItem = { i: 'blocker', x: 0, y: 0, w: 2, h: 2 };
    const item: ILayoutItem = { i: 'a', x: 0, y: 0, w: 2, h: 1 };
    const result = compactItem([blocker], item, true);

    expect(result).toStrictEqual({ i: 'a', x: 0, y: 2, w: 2, h: 1 });
  });

  it('Should not infinite-loop on a non-finite starting y (the common "y: Infinity, let compaction settle it" placement convention) — regression test', () => {
    // Bug fix: `Infinity - 1 === Infinity` in JavaScript, so the old
    // decrement loop (`while (layoutItem.y > 0 ...) { layoutItem.y--; }`)
    // never actually reduced `y` at all when nothing collided with it
    // yet — an infinite loop that froze the page entirely, not a slow
    // one. Reported directly via example 43 (the undo/redo example)
    // freezing on its own "Add item" button, which uses exactly this
    // `y: Infinity` convention. This test's own timeout (vitest's
    // default) is the safety net here: if this regresses, the test
    // hangs and times out rather than silently passing.
    const item: ILayoutItem = { i: 'a', x: 0, y: Infinity, w: 2, h: 1 };
    const result = compactItem([], item, true);

    expect(result).toStrictEqual({ i: 'a', x: 0, y: 0, w: 2, h: 1 });
  });

  it('Should clamp a non-finite starting y to just below existing items, not just to 0, when something would otherwise block it', () => {
    const blocker: ILayoutItem = { i: 'blocker', x: 0, y: 0, w: 2, h: 3 };
    const item: ILayoutItem = { i: 'a', x: 0, y: Infinity, w: 2, h: 1 };
    const result = compactItem([blocker], item, true);

    expect(result).toStrictEqual({ i: 'a', x: 0, y: 3, w: 2, h: 1 });
  });
});

describe('compactLayout', () => {
  it('Should compact all non-static items upward, leaving static items in place', () => {
    const layout: TLayout = [
      { i: 'static', x: 0, y: 0, w: 2, h: 1, isStatic: true },
      { i: 'a', x: 2, y: 5, w: 2, h: 1 },
    ];

    const result = compactLayout(layout, true);

    expect(result).toStrictEqual([
      { i: 'static', x: 0, y: 0, w: 2, h: 1, isStatic: true, moved: false },
      { i: 'a', x: 2, y: 0, w: 2, h: 1, moved: false },
    ]);
  });

  it('Should return an empty array (not throw) when the layout is empty', () => {
    // Behavior change (see docs/REFACTORING.md #33): nothing to compact
    // isn't an error — a grid with no items yet is a normal state.
    expect(compactLayout([], true)).toStrictEqual([]);
  });
});

describe('compactItemHorizontal', () => {
  it('Should move an item left as far as possible when horizontalCompact is true and nothing blocks it', () => {
    const item: ILayoutItem = { i: 'a', x: 5, y: 0, w: 1, h: 2 };
    const result = compactItemHorizontal([], item, true);

    expect(result).toStrictEqual({ i: 'a', x: 0, y: 0, w: 1, h: 2 });
  });

  it('Should stop moving left when it would collide with another item', () => {
    const blocker: ILayoutItem = { i: 'blocker', x: 1, y: 0, w: 1, h: 2 };
    const item: ILayoutItem = { i: 'a', x: 5, y: 0, w: 1, h: 2 };
    const result = compactItemHorizontal([blocker], item, true);

    expect(result).toStrictEqual({ i: 'a', x: 2, y: 0, w: 1, h: 2 });
  });

  it('Should respect minPositions (minimum x) instead of moving to 0 when horizontalCompact is false', () => {
    const item: ILayoutItem = { i: 'a', x: 5, y: 0, w: 1, h: 2 };
    const result = compactItemHorizontal([], item, false, { a: { x: 3 } });

    expect(result).toStrictEqual({ i: 'a', x: 3, y: 0, w: 1, h: 2 });
  });

  it('Should not attempt any leftward movement at all when horizontalCompact is false and no minPositions is given', () => {
    // Neither branch of `if(horizontalCompact) {...} else if(minPositions) {...}`
    // fires in this case — the item should be left exactly where it
    // started (before the separate rightward-collision-push step below,
    // which has nothing to push against here since compareWith is empty).
    const item: ILayoutItem = { i: 'a', x: 5, y: 0, w: 1, h: 2 };
    const result = compactItemHorizontal([], item, false);

    expect(result).toStrictEqual({ i: 'a', x: 5, y: 0, w: 1, h: 2 });
  });

  it('Should push an item right until it no longer collides', () => {
    const blocker: ILayoutItem = { i: 'blocker', x: 0, y: 0, w: 2, h: 2 };
    const item: ILayoutItem = { i: 'a', x: 0, y: 0, w: 1, h: 2 };
    const result = compactItemHorizontal([blocker], item, true);

    expect(result).toStrictEqual({ i: 'a', x: 2, y: 0, w: 1, h: 2 });
  });

  it('Should not infinite-loop on a non-finite starting x — regression test, same class of bug as compactItem\'s own fix', () => {
    const item: ILayoutItem = { i: 'a', x: Infinity, y: 0, w: 1, h: 2 };
    const result = compactItemHorizontal([], item, true);

    expect(result).toStrictEqual({ i: 'a', x: 0, y: 0, w: 1, h: 2 });
  });
});

describe('compactLayoutHorizontal', () => {
  it('Should compact all non-static items leftward, leaving static items in place', () => {
    const layout: TLayout = [
      { i: 'static', x: 0, y: 0, w: 1, h: 2, isStatic: true },
      { i: 'a', x: 5, y: 2, w: 1, h: 2 },
    ];

    const result = compactLayoutHorizontal(layout, true);

    expect(result).toStrictEqual([
      { i: 'static', x: 0, y: 0, w: 1, h: 2, isStatic: true, moved: false },
      { i: 'a', x: 0, y: 2, w: 1, h: 2, moved: false },
    ]);
  });

  it('Should process items leftmost-first, so a later item settles against an earlier one already placed to its left', () => {
    const layout: TLayout = [
      { i: 'a', x: 6, y: 0, w: 2, h: 2 },
      { i: 'b', x: 3, y: 0, w: 2, h: 2 },
    ];

    const result = compactLayoutHorizontal(layout, true);

    expect(result).toStrictEqual([
      { i: 'a', x: 2, y: 0, w: 2, h: 2, moved: false },
      { i: 'b', x: 0, y: 0, w: 2, h: 2, moved: false },
    ]);
  });

  it('Should return an empty array (not throw) when the layout is empty', () => {
    expect(compactLayoutHorizontal([], true)).toStrictEqual([]);
  });
});

describe('compactLayoutOverlapVertical', () => {
  it('Should move every non-static item straight to y:0, ignoring collisions entirely', () => {
    const layout: TLayout = [
      { i: 'static', x: 0, y: 0, w: 2, h: 1, isStatic: true },
      { i: 'a', x: 0, y: 5, w: 2, h: 1 },
      { i: 'b', x: 0, y: 8, w: 2, h: 1 },
    ];

    const result = compactLayoutOverlapVertical(layout);

    // "a" and "b" both land at y:0 — genuinely overlapping each other,
    // by design; nothing here resolves that.
    expect(result).toStrictEqual([
      { i: 'static', x: 0, y: 0, w: 2, h: 1, isStatic: true, moved: false },
      { i: 'a', x: 0, y: 0, w: 2, h: 1, moved: false },
      { i: 'b', x: 0, y: 0, w: 2, h: 1, moved: false },
    ]);
  });

  it('Should return an empty array (not throw) when the layout is empty', () => {
    expect(compactLayoutOverlapVertical([])).toStrictEqual([]);
  });
});

describe('compactLayoutOverlapHorizontal', () => {
  it('Should move every non-static item straight to x:0, ignoring collisions entirely', () => {
    const layout: TLayout = [
      { i: 'static', x: 0, y: 0, w: 1, h: 2, isStatic: true },
      { i: 'a', x: 5, y: 0, w: 1, h: 2 },
      { i: 'b', x: 8, y: 0, w: 1, h: 2 },
    ];

    const result = compactLayoutOverlapHorizontal(layout);

    expect(result).toStrictEqual([
      { i: 'static', x: 0, y: 0, w: 1, h: 2, isStatic: true, moved: false },
      { i: 'a', x: 0, y: 0, w: 1, h: 2, moved: false },
      { i: 'b', x: 0, y: 0, w: 1, h: 2, moved: false },
    ]);
  });

  it('Should return an empty array (not throw) when the layout is empty', () => {
    expect(compactLayoutOverlapHorizontal([])).toStrictEqual([]);
  });
});

describe(`getLayoutItem`, () => {
  it(`Should throw an exception when layout is empty`, () => {
    expect(() => getLayoutItem()).toThrowError(EErrorMessage.INVALID_LAYOUT);
  });

  it(`Should throw an exception when id is less than 0`, () => {
    expect(() => getLayoutItem(testLayoutOne, -1)).toThrowError(EErrorMessage.INVALID_LAYOUT_ITEM_ID);
  });

  it(`Should throw an exception when id is undefined`, () => {
    expect(() => getLayoutItem(testLayoutOne, undefined)).toThrowError(EErrorMessage.INVALID_LAYOUT_ITEM_ID);
  });

  it(`Should throw an exception when id is null`, () => {
    expect(() => getLayoutItem(testLayoutOne, null)).toThrowError(EErrorMessage.INVALID_LAYOUT_ITEM_ID);
  });

  it(`Should throw an exception when id is whitespace only`, () => {
    expect(() => getLayoutItem(testLayoutOne, "  ")).toThrowError(EErrorMessage.INVALID_LAYOUT_ITEM_ID);
  });

  it(`Should throw an exception when id is empty string`, () => {
    expect(() => getLayoutItem(testLayoutOne, "")).toThrowError(EErrorMessage.INVALID_LAYOUT_ITEM_ID);
  });

  it(`Should Return correct layout item when it exists by number`, () => {
    const expectedResult: ILayoutItem = {
      i: 2,
      h: 1,
      w: 2,
      x: 1,
      y: 0,
    };
    const result: ILayoutItem = getLayoutItem(testLayoutOne, 2);
    expect(result).toStrictEqual(expectedResult);
  });

  
  it(`Should Return correct layout item when it exists by string`, () => {
    const expectedResult: ILayoutItem = {
      i: "qwerty",
      h: 1,
      w: 1,
      x: 0,
      y: 0,
    };
    const result: ILayoutItem = getLayoutItem(testLayoutTwo, "qwerty");
    expect(result).toStrictEqual(expectedResult);
  });

  
  it(`Should Return correct layout item when it exists by string and case is wrong`, () => {
    const expectedResult: ILayoutItem = {
      i: "qwerty",
      h: 1,
      w: 1,
      x: 0,
      y: 0,
    };
    const result: ILayoutItem = getLayoutItem(testLayoutTwo, "QwerTy");
    expect(result).toStrictEqual(expectedResult);
  });

  it(`Should Return undefined when layout item does not exists by string`, () => {
    const result: ILayoutItem = getLayoutItem(testLayoutOne, 'abc');
    expect(result).toBe(undefined);
  });

  it(`Should Return undefined when layout item does not exists by number`, () => {
    const result: ILayoutItem = getLayoutItem(testLayoutOne, 999);
    expect(result).toBe(undefined);
  });

  it(`Should Return undefined when id is neither a string nor a number (bypasses both typeof branches entirely)`, () => {
    // The initial validation guard above only rejects undefined/null/
    // whitespace/negative-when-parsed — a boolean genuinely passes all
    // of those (`true.toString()` is the non-empty string "true",
    // parseInt("true") is NaN, and NaN < 0 is false), then reaches the
    // loop's own `typeof id === 'string'`/`typeof id === 'number'`
    // checks, matching neither for any real item — the same safe
    // fallback as a genuinely-not-found string/number id.
    const result: ILayoutItem = getLayoutItem(testLayoutOne, true);
    expect(result).toBe(undefined);
  });
});

describe('setTransform', () => {
  it('Should return correct values', () => {
    const result: ITransformStyle = setTransform(1, 1, 1, 1);
    const expectedValue: ITransformStyle = {
      MozTransform: 'translate3d(1px,1px, 0)',
      OTransform: 'translate3d(1px,1px, 0)',
      WebkitTransform: 'translate3d(1px,1px, 0)',
      height: '1px',
      msTransform: 'translate3d(1px,1px, 0)',
      position: 'absolute',
      transform: 'translate3d(1px,1px, 0)',
      width: '1px',
    };
    expect(result).toStrictEqual(expectedValue);
  });
});

describe('setTransformRtl', () => {
  it('Should return correct values', () => {
    const result: ITransformStyle = setTransformRtl(1, 1, 1, 1);
    const expectedValue: ITransformStyle = {
      MozTransform: 'translate3d(-1px,1px, 0)',
      OTransform: 'translate3d(-1px,1px, 0)',
      WebkitTransform: 'translate3d(-1px,1px, 0)',
      height: '1px',
      msTransform: 'translate3d(-1px,1px, 0)',
      position: 'absolute',
      transform: 'translate3d(-1px,1px, 0)',
      width: '1px',
    };
    expect(result).toStrictEqual(expectedValue);
  });
});

describe('setTopLeft', () => {
  it('Should return correct values', () => {
    const result: ITopLeftStyle = setTopLeft(1, 1, 1, 1);
    const expectedValue: ITopLeftStyle = {
      height: '1px',
      position: 'absolute',
      left: '1px',
      top: '1px',
      width: '1px',
    };
    expect(result).toStrictEqual(expectedValue);
  });
});

describe('setTopRight', () => {
  it('Should return correct values', () => {
    const result: ITopRightStyle = setTopRight(1, 1, 1, 1);
    const expectedValue: ITopRightStyle = {
      height: '1px',
      position: 'absolute',
      right: '1px',
      top: '1px',
      width: '1px',
    };
    expect(result).toStrictEqual(expectedValue);
  });
});

describe(`cloneLayoutItem: values JSON cannot carry`, () => {
  // JSON turns Infinity, -Infinity and NaN into null, so a clone swaps them for sentinel strings and back again. That only applies to the
  // layout's own numeric fields, listed by name, so each needs its own check: a field dropped from the list silently clones to null.
  const NUMERIC_KEYS = [`h`, `w`, `x`, `y`, `minH`, `minW`, `maxH`, `maxW`, `zIndex`, `borderRadiusPx`];

  for(const key of NUMERIC_KEYS) {
    it(`Should round-trip Infinity, -Infinity and NaN in "${key}"`, () => {
      const base = { h: 1, i: `a`, w: 1, x: 0, y: 0 };

      expect(cloneLayoutItem({ ...base, [key]: Infinity })[key]).toBe(Infinity);
      expect(cloneLayoutItem({ ...base, [key]: -Infinity })[key]).toBe(-Infinity);
      expect(cloneLayoutItem({ ...base, [key]: NaN })[key]).toBeNaN();
    });
  }

  it(`Should leave an empty string in a numeric field as it is: only the exact sentinels are turned back into numbers`, () => {
    // Encoding and decoding stay consistent with each other even if a sentinel were an empty string, so a round trip cannot show it.
    // An empty string that was never a sentinel can: it must not come back as Infinity, -Infinity or NaN.
    expect(cloneLayoutItem({ h: 1, i: `a`, w: 1, x: 0, y: 0, zIndex: `` }).zIndex).toBe(``);
  });

  it(`Should not touch a number outside the layout's own fields, such as one inside data`, () => {
    // Scoped by key name so a consumer's own data is never rewritten: Infinity there is serialised the way JSON always does, as null.
    const cloned = cloneLayoutItem({ data: { limit: Infinity }, h: 1, i: `a`, w: 1, x: 0, y: 0 });

    expect(cloned.data.limit).toBeNull();
  });
});

describe(`compaction of an item whose position is not finite`, () => {
  // `y: Infinity` is the usual way to say "place this after everything". It is clamped to the lowest bottom edge first, because counting
  // down from Infinity would never end. With compaction off, nothing moves the item afterwards, so the clamp is what is left to see.
  it(`Should clamp a non-finite y to the bottom edge of everything already placed`, () => {
    const compareWith = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 3, i: `b`, w: 2, x: 0, y: 2 },
    ];
    const item = { h: 1, i: `c`, w: 1, x: 5, y: Infinity }; // a free column, so nothing collides with it

    expect(compactItem(compareWith, item, false).y).toBe(5); // 2 + 3, the lowest bottom edge
  });

  it(`Should clamp a non-finite x to the right edge of everything already placed`, () => {
    const compareWith = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 3, x: 2, y: 0 },
    ];
    const item = { h: 1, i: `c`, w: 1, x: Infinity, y: 5 };

    expect(compactItemHorizontal(compareWith, item, false).x).toBe(5); // 2 + 3, the rightmost edge
  });

  it(`Should rise to 0 when minPositions has no entry for this item`, () => {
    // minPositions only lists the items that were being dragged; an item absent from it has no floor and must not throw.
    const item = { h: 1, i: `c`, w: 1, x: 5, y: 4 };

    expect(compactItem([], item, true, { other: { y: 3 } }).y).toBe(0);
  });

  it(`Should move left to 0 when minPositions has no entry for this item`, () => {
    const item = { h: 1, i: `c`, w: 1, x: 4, y: 5 };

    expect(compactItemHorizontal([], item, true, { other: { x: 3 } }).x).toBe(0);
  });
});

describe(`static items are never moved by compaction`, () => {
  // A static item is already in the set the others compact against, and compacting it too would let it rise or slide towards the origin.
  it(`compactLayout leaves a static item where it is`, () => {
    const layout = [{ h: 1, i: `s`, isStatic: true, w: 1, x: 0, y: 5 }];

    expect(compactLayout(layout, true)[0].y).toBe(5);
  });

  it(`compactLayoutHorizontal leaves a static item where it is`, () => {
    const layout = [{ h: 1, i: `s`, isStatic: true, w: 1, x: 5, y: 0 }];

    expect(compactLayoutHorizontal(layout, true)[0].x).toBe(5);
  });

  it(`compactLayoutOverlapVertical sends the other items to y 0 but leaves a static item where it is`, () => {
    const layout = [
      { h: 1, i: `s`, isStatic: true, w: 1, x: 0, y: 5 },
      { h: 1, i: `a`, w: 1, x: 3, y: 3 },
    ];

    const result = compactLayoutOverlapVertical(layout);

    expect(result[0].y).toBe(5);
    expect(result[1].y).toBe(0);
  });

  it(`compactLayoutOverlapHorizontal sends the other items to x 0 but leaves a static item where it is`, () => {
    const layout = [
      { h: 1, i: `s`, isStatic: true, w: 1, x: 5, y: 0 },
      { h: 1, i: `a`, w: 1, x: 3, y: 3 },
    ];

    const result = compactLayoutOverlapHorizontal(layout);

    expect(result[0].x).toBe(5);
    expect(result[1].x).toBe(0);
  });
});

describe(`getLayoutItem ids`, () => {
  it(`Should find an item whose id is 0: zero is a valid id, not a negative one`, () => {
    const layout = [{ h: 1, i: 0, w: 1, x: 0, y: 0 }];

    expect(getLayoutItem(layout, 0)).toBe(layout[0]);
    expect(getLayoutItem(layout, `0`)).toBe(layout[0]);
  });

  it(`Should match a numeric id strictly: the number 5 does not find an item whose id is the string "5"`, () => {
    const layout = [{ h: 1, i: `5`, w: 1, x: 0, y: 0 }];

    expect(getLayoutItem(layout, 5)).toBeUndefined();
  });
});
