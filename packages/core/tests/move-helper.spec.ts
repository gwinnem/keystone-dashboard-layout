import { describe, expect, it } from 'vitest';
import { moveElement, moveElementAwayFromCollision, moveToCorrectPlace } from "../src/gridlayout/helpers/move-helper";
import { EErrorMessage } from "../src/common/enums/ErrorMessages";
import { EMovingDirections } from "../src/common/enums/EMovingDirections";
import { TLayout } from "../src/layout-definition";
import { TMovingDirection } from "../src/common/types/TMovingDirections";

const testDataOne: TLayout = [
  {
    i: 1,
    h: 2,
    w: 1,
    x: 0,
    y: 0,
  },
  {
    i: 2,
    h: 2,
    w: 1,
    x: 1,
    y: 0,
  },
  {
    i: 3,
    h: 2,
    w: 1,
    x: 2,
    y: 0,
    isStatic: true,
  },
  {
    i: 4,
    h: 2,
    w: 1,
    x: 3,
    y: 0,
  },
  {
    i: 5,
    h: 2,
    w: 1,
    x: 4,
    y: 0,
  },
  {
    i: 6,
    h: 2,
    w: 1,
    x: 5,
    y: 0,
  }
];

describe(`moveToCorrectPlace`, () => {
  it(`Should throw an error if parameter layoutItem is undefined`, () => {
    expect(() => moveToCorrectPlace(null, {cols: 3}, [testDataOne[0]]))
      .toThrow(EErrorMessage.INVALID_LAYOUT_ITEM);
  });

  it(`Should throw an error if parameter bounds is less than 1`, () => {
    expect(() => moveToCorrectPlace(testDataOne[0], { cols: 0 }, [testDataOne[0]]))
      .toThrow(EErrorMessage.INVALID_BOUNDS);
  });

  it(`Should wrap the item to the next row when it collides all the way across the current one`, () => {
    const item = { i: `a`, x: 2, y: 0, w: 2, h: 1 };
    const statics = [{ i: `s1`, x: 0, y: 0, w: 3, h: 1, isStatic: true }];

    moveToCorrectPlace(item, { cols: 3 }, statics);

    expect(item).toStrictEqual({ i: `a`, x: 0, y: 1, w: 2, h: 1 });
  });

  it(`Should step past multiple colliding static items before settling in a free column`, () => {
    const item = { i: `a`, x: 0, y: 0, w: 1, h: 1 };
    const statics = [
      { i: `s1`, x: 0, y: 0, w: 1, h: 1, isStatic: true },
      { i: `s2`, x: 1, y: 0, w: 1, h: 1, isStatic: true },
    ];

    moveToCorrectPlace(item, { cols: 3 }, statics);

    expect(item).toStrictEqual({ i: `a`, x: 2, y: 0, w: 1, h: 1 });
  });

  it(`Should wrap to the next row mid-loop when stepping past collisions runs out of columns`, () => {
    // Distinct from the "collides all the way across" case above, which
    // wraps via the pre-loop check before the while loop ever runs. This
    // starts within bounds, then only overflows *after* stepping past two
    // colliding static items inside the loop itself.
    const item = { i: `a`, x: 0, y: 0, w: 1, h: 1 };
    const statics = [
      { i: `s1`, x: 0, y: 0, w: 1, h: 1, isStatic: true },
      { i: `s2`, x: 1, y: 0, w: 1, h: 1, isStatic: true },
    ];

    moveToCorrectPlace(item, { cols: 2 }, statics);

    expect(item).toStrictEqual({ i: `a`, x: 0, y: 1, w: 1, h: 1 });
  });
});


describe(`moveElement`, () => {

  it(`Should throw an error if parameter x is less than 0`, () => {
    expect(() => moveElement(testDataOne, testDataOne[0], -1, 0, true, true, true))
      .toThrowError(EErrorMessage.INVALID_PARAMS);
  });

  it(`Should throw an error if parameter y is less than 0`, () => {
    expect(() => moveElement(testDataOne, testDataOne[0], 1, -1, true, true, true))
      .toThrowError(EErrorMessage.INVALID_PARAMS);
  });

  it('Should return the passed in layout when item isStatic', () => {
    const result = moveElement(testDataOne, {
      isStatic: true,
      i: 1,
      x: 1,
      y: 1,
      w: 1,
      h: 1
    }, 0, 0, false, false, false);

    expect(testDataOne).toMatchObject(result);
  });

  it('Should return', () => {
    const result = moveElement(testDataOne, {
      isStatic: false,
      i: 1,
      x: 0,
      y: 1,
      w: 1,
      h: 1
    }, 0, 0, false, true, false);

    expect(testDataOne).toMatchObject(result);
  });

  it(`Should push a colliding non-static item downward (cascading move)`, () => {
    const layout: TLayout = [
      { i: `a`, x: 0, y: 0, w: 2, h: 2 },
      { i: `b`, x: 0, y: 2, w: 2, h: 2 },
    ];

    const result = moveElement(layout, layout[0], 0, 2, true, false, false);

    expect(result).toStrictEqual([
      { i: `a`, x: 0, y: 2, w: 2, h: 2, moved: true },
      { i: `b`, x: 0, y: 0, w: 2, h: 2, moved: true },
    ]);
  });

  it(`Should shift a colliding item horizontally when horizontalShift is enabled`, () => {
    const layout: TLayout = [
      { i: `a`, x: 0, y: 0, w: 2, h: 2 },
      { i: `b`, x: 2, y: 0, w: 2, h: 2 },
    ];

    const result = moveElement(layout, layout[0], 1, 0, true, true, false);

    expect(result).toStrictEqual([
      { i: `a`, x: 1, y: 0, w: 2, h: 2, moved: true },
      { i: `b`, x: 0, y: 0, w: 2, h: 2, moved: true },
    ]);
  });

  it(`Should revert the move entirely when preventCollision is set and a collision occurs`, () => {
    const layout: TLayout = [
      { i: `a`, x: 0, y: 0, w: 2, h: 2 },
      { i: `b`, x: 2, y: 0, w: 2, h: 2 },
    ];

    const result = moveElement(layout, layout[0], 1, 0, true, false, true);

    expect(result[0]).toStrictEqual({ i: `a`, x: 0, y: 0, w: 2, h: 2, moved: false });
  });

  it(`Should leave an already-moved colliding item untouched, not push it away a second time — confirmed gap via a fresh coverage report`, () => {
    // "b" already carries moved:true (set externally, before this call
    // — moveElement itself only ever sets it on "l", never on anything
    // it collides with) -- the "Short circuit so we can't loop infinite"
    // check inside the collision loop skips it entirely, so it stays
    // exactly where it was, even though it now genuinely overlaps "a".
    const layout: TLayout = [
      { i: `a`, x: 0, y: 0, w: 2, h: 2 },
      { i: `b`, x: 0, y: 2, w: 2, h: 2, moved: true },
    ];

    const result = moveElement(layout, layout[0], 0, 2, true, false, false);

    expect(result.find(item => item.i === `b`)).toStrictEqual({ i: `b`, x: 0, y: 2, w: 2, h: 2, moved: true });
  });

  it(`Should push the moved item itself away when it collides with a static item, not the other way around — confirmed gap via a fresh coverage report`, () => {
    // Distinct from "Should return the passed in layout when item
    // isStatic" above (the *moved* item being static, a no-op) -- here
    // the *moved* item is not static, but collides with a genuinely
    // static one, taking the "if(collision.isStatic)" branch inside
    // moveElement's own collision loop (never reached by any other
    // test in this describe block, which only ever collides with
    // non-static items).
    //
    // Corrected expectation, confirmed by actually running this rather
    // than assumed: "a" settles at y:1, not y:2. The first collision
    // (a at y:0 vs. static at y:0-2) recurses via $default (y:0+1=1).
    // At y:1, "a" still technically overlaps the static item (y:1-3 vs
    // y:0-2) -- but moveElement's own "waiting to swap" heuristic
    // ("if(l.y > collision.y && l.y - collision.y > collision.h / 4)
    // continue") skips pushing it any further once it's moved past the
    // static by more than a quarter of the static's own height (1 >
    // 2/4), a deliberate jitter-prevention threshold, not a bug.
    const layout: TLayout = [
      { i: `static`, x: 0, y: 0, w: 2, h: 2, isStatic: true },
      { i: `a`, x: 5, y: 5, w: 2, h: 2 },
    ];

    const result = moveElement(layout, layout[1], 0, 0, false, false, false);

    expect(result.find(item => item.i === `a`)).toMatchObject({ x: 0, y: 1 });
    expect(result.find(item => item.i === `static`)).toMatchObject({ x: 0, y: 0 });
  });
});

describe(`moveElementAwayFromCollision`, () => {
  it(`Should move the non-static item away when it collides with a static item`, () => {
    const layout: TLayout = [
      { i: `a`, x: 0, y: 0, w: 2, h: 2, isStatic: true },
      { i: `b`, x: 0, y: 0, w: 2, h: 2 },
    ];

    const result = moveElementAwayFromCollision(layout, layout[0], layout[1], true, undefined as unknown as TMovingDirection, false);

    expect(result).toStrictEqual([
      { i: `a`, x: 0, y: 0, w: 2, h: 2, isStatic: true },
      { i: `b`, x: 0, y: 1, w: 2, h: 2, moved: true },
    ]);
  });

  it(`Should fall back to the default drop position when the colliding item is narrower and offset (horizontalShift)`, () => {
    const layout: TLayout = [
      { i: `a`, x: 5, y: 0, w: 2, h: 2 },
      { i: `b`, x: 0, y: 0, w: 4, h: 2 },
    ];

    expect(() =>
      moveElementAwayFromCollision(layout, layout[0], layout[1], false, EMovingDirections.RIGHT, true),
    ).not.toThrow();
  });

  /**
   * Phase 21 (`docs/PARITY_GAP_IMPLEMENTATION_PLAN.md`) regression
   * suite — `moveElementAwayFromCollision`'s own recursive `$default`
   * call used to pass its arguments one slot short of `moveElement`'s
   * real signature, silently corrupting `isUserAction`/`horizontalShift`
   * for any *cascading* (second-level+) collision. This geometry is
   * built so the outer (first-level) resolution is forced into the
   * `$default` branch specifically (its own "move directly above"
   * shortcut is deliberately blocked by `blocker`), and lands exactly
   * on top of a third item (`z`) — triggering the inner, previously-
   * buggy recursive call.
   *
   * Layout, all in one column (x:0) except `x` itself (parked off to
   * the side at x:10, since only its `y`/`h` matter for the outer
   * call's own math):
   * - `blocker` (0,1)-(2,2): blocks `y`'s own "move directly above `x`"
   *   shortcut target (`max(x.y - y.h, 0)` = `max(2-1,0)` = `1`).
   * - `x` (10,2)-(12,3): the `collidesWith` item for the outer call —
   *   only `y`/`h` (2/1) matter; parked off-column so its own presence
   *   never collides with anything in the y/z column.
   * - `y` (0,2)-(2,3): the outer call's own `itemToMove` — its `$default`
   *   push (`y.y + 1` = `3`) lands exactly on `z`'s own starting spot.
   * - `z` (0,3)-(2,4): sits exactly where `y`'s own `$default` push
   *   lands, forcing the inner (previously buggy) recursive collision.
   *
   * With the fix, `z`'s own inner resolution correctly receives
   * `isUserAction: true` and tries its own "move directly above `y`'s
   * new spot" shortcut first (`max(3-1,0)` = `2`) — free (only
   * `blocker`, at y:[1,2), sits nearby, not overlapping y:[2,3)) — so
   * `z` lands at `(0,2)`, not the `$default` `(0,4)` a suppressed
   * `isUserAction` would have produced.
   */
  describe(`Phase 21 regression — recursive argument-order fix`, () => {
    const buildCascadeLayout = (): TLayout => [
      { i: `blocker`, x: 0, y: 1, w: 2, h: 1 },
      { i: `x`, x: 10, y: 2, w: 2, h: 1 },
      { i: `y`, x: 0, y: 2, w: 2, h: 1 },
      { i: `z`, x: 0, y: 3, w: 2, h: 1 },
    ];

    it(`Should correctly propagate isUserAction into a cascading (second-level) collision, not silently suppress it`, () => {
      const layout = buildCascadeLayout();
      const x = layout.find(item => item.i === `x`)!;
      const y = layout.find(item => item.i === `y`)!;

      const result = moveElementAwayFromCollision(layout, x, y, true, undefined as unknown as TMovingDirection, false);

      const z = result.find(item => item.i === `z`)!;
      // The fixed behavior: z's own inner "move directly above" shortcut
      // succeeds (isUserAction correctly reaches it), landing at (0,2)
      // — not the (0,4) a suppressed isUserAction (the pre-fix bug)
      // would have produced via a plain $default push instead.
      expect(z).toMatchObject({ x: 0, y: 2 });
    });

    it(`Should also correctly propagate horizontalShift into a cascading collision, without regressing the already-coincidentally-correct case`, () => {
      const layout = buildCascadeLayout();
      const x = layout.find(item => item.i === `x`)!;
      const y = layout.find(item => item.i === `y`)!;

      // movingDirection: undefined (matching this file's own established
      // convention above) keeps the *outer* call's own $default target
      // unchanged by horizontalShift, isolating this test to whether the
      // *inner*, cascading call correctly receives horizontalShift too.
      const result = moveElementAwayFromCollision(layout, x, y, true, undefined as unknown as TMovingDirection, true);

      const z = result.find(item => item.i === `z`)!;
      expect(z).toMatchObject({ x: 0, y: 2 });
    });

    it(`Should have no observable effect on a single-level (non-cascading) collision`, () => {
      // No third item for the pushed item to collide into — the fixed
      // recursive call is never even reached, confirming this fix is
      // scoped to the cascading branch specifically.
      const layout: TLayout = [
        { i: `a`, x: 0, y: 0, w: 2, h: 2, isStatic: true },
        { i: `b`, x: 0, y: 0, w: 2, h: 2 },
      ];

      const result = moveElementAwayFromCollision(layout, layout[0], layout[1], true, undefined as unknown as TMovingDirection, false);

      const b = result.find(item => item.i === `b`)!;
      expect(b).toMatchObject({ x: 0, y: 1 });
    });
  });
});
