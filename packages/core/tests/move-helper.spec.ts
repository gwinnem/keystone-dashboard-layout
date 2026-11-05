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

  it(`Should throw an error if parameter layoutItem is strictly undefined (not null)`, () => {
    // Distinct from the "null" test above — layoutItem === null and
    // layoutItem === undefined are two separate strict-equality checks
    // in the same guard; null !== undefined in JS, so the null test
    // alone never exercises this specific check.
    expect(() => moveToCorrectPlace(undefined, {cols: 3}, [testDataOne[0]]))
      .toThrow(EErrorMessage.INVALID_LAYOUT_ITEM);
  });

  it(`Should throw an error if parameter layoutItem is an empty object`, () => {
    // The guard used to compare against a fresh `{}` literal with `==`, a reference comparison that is never true, so an empty
    // object slipped through and every later x/y/w/h read was undefined.
    expect(() => moveToCorrectPlace({} as never, {cols: 3}, []))
      .toThrow(EErrorMessage.INVALID_LAYOUT_ITEM);
  });

  it(`Should throw an error if parameter bounds is less than 1`, () => {
    expect(() => moveToCorrectPlace(testDataOne[0], { cols: 0 }, [testDataOne[0]]))
      .toThrow(EErrorMessage.INVALID_BOUNDS);
  });

  it(`Should NOT throw when bounds.cols is exactly 1 (the boundary, not just clearly invalid at 0)`, () => {
    expect(() => moveToCorrectPlace({ h: 1, i: `a`, w: 1, x: 0, y: 0 }, { cols: 1 }, [])).not.toThrow();
  });

  it(`Should wrap the item to the next row when it collides all the way across the current one`, () => {
    const item = { i: `a`, x: 2, y: 0, w: 2, h: 1 };
    const statics = [{ i: `s1`, x: 0, y: 0, w: 3, h: 1, isStatic: true }];

    moveToCorrectPlace(item, { cols: 3 }, statics);

    expect(item).toStrictEqual({ i: `a`, x: 0, y: 1, w: 2, h: 1 });
  });

  it(`Should NOT wrap when x+w is exactly equal to bounds.cols (touching the edge, not exceeding it)`, () => {
    const item = { h: 1, i: `a`, w: 2, x: 1, y: 0 }; // x+w = 3

    moveToCorrectPlace(item, { cols: 3 }, []);

    expect(item).toStrictEqual({ h: 1, i: `a`, w: 2, x: 1, y: 0 });
  });

  it(`Should leave the item exactly where it is when nothing collides with it at all (the while loop never runs)`, () => {
    // Every existing "step past collisions" test above/below has the
    // loop body actually execute at least once — this confirms the
    // loop's own condition correctly skips entirely when there's
    // genuinely nothing to collide with.
    const item = { h: 1, i: `a`, w: 1, x: 0, y: 0 };

    moveToCorrectPlace(item, { cols: 3 }, []);

    expect(item).toStrictEqual({ h: 1, i: `a`, w: 1, x: 0, y: 0 });
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

  it(`Should resolve via $default (not a directional shortcut) when moving to the exact same x/y it's already at (all four moving flags false)`, () => {
    // Every existing test above has oldX/oldY genuinely differ from the
    // target x/y, exercising each flag's own true side — none test the
    // exact boundary (oldX===x, oldY===y), where a mutated "<="/">="
    // would incorrectly flip a flag to true. "a" and "b" start already
    // overlapping; moving "a" to its own current position (0,0) keeps
    // all four flags false, so movingDirection resolves to undefined,
    // which movingCordsData's own "in" check treats as absent —
    // confirming $default (y+1) is used, not a directional shortcut.
    const layout: TLayout = [
      { i: `a`, x: 0, y: 0, w: 2, h: 2 },
      { i: `b`, x: 0, y: 0, w: 2, h: 2 },
    ];

    const result = moveElement(layout, layout[0], 0, 0, true, false, false);

    expect(result.find(item => item.i === `b`)).toMatchObject({ x: 0, y: 1 });
  });

  it(`Should reverse the collision-resolution order when moving upward (moving.UP), not process it in normal row/col order`, () => {
    // No existing test in this describe block moves an item upward at
    // all (every one moves down or sideways) — moving.UP's own
    // "sorted = sorted.reverse()" branch was never reached.
    //
    // isUserAction: false here specifically — true would first try
    // moveElementAwayFromCollision's own "move directly above" shortcut
    // (a real mistake in an earlier version of this test, caught by
    // actually running it: that shortcut found b's own target position
    // (0,0) collision-free and moved it there directly, never reaching
    // the $default/UP-direction logic this test means to exercise).
    // false skips that shortcut, landing on $default's own y+1 (3)
    // instead — which then collides with "a" a second time, but that
    // second collision is correctly skipped via the "already moved"
    // short-circuit, confirmed by the assertion below.
    const layout: TLayout = [
      { i: `a`, x: 0, y: 5, w: 2, h: 2 },
      { i: `b`, x: 0, y: 2, w: 2, h: 2 },
    ];

    const result = moveElement(layout, layout[0], 0, 2, false, false, false);

    expect(result.find(item => item.i === `a`)).toMatchObject({ x: 0, y: 2 });
    expect(result.find(item => item.i === `b`)).toMatchObject({ x: 0, y: 3 });
  });

  it(`Should leave a static item exactly where it is, and hand back the very same layout object`, () => {
    // The existing static test builds the static item OUTSIDE its layout, so `expect(testDataOne).toMatchObject(result)` passes whether
    // or not the guard returns early. Here the item is in the layout and its own position is asserted.
    const staticItem = { h: 1, i: `s`, isStatic: true, w: 1, x: 1, y: 1 };
    const layout: TLayout = [staticItem, { h: 1, i: `o`, w: 1, x: 5, y: 5 }];

    const result = moveElement(layout, staticItem, 0, 0, false, false, false);

    expect(result).toBe(layout);
    expect(staticItem).toStrictEqual({ h: 1, i: `s`, isStatic: true, w: 1, x: 1, y: 1 });
  });

  // The direction of a move only decides anything when horizontalShift is on, and only then does the placement of the displaced item
  // differ between $default (one row down) and the directional shortcut. Every test below therefore uses horizontalShift: true and
  // isUserAction: false (true would try the "move directly above" shortcut first and hide the direction).
  describe(`the direction of a move, with horizontalShift`, () => {
    it(`DOWN: the displaced item jumps back up by the mover's height, i.e. the two swap`, () => {
      const layout: TLayout = [
        { i: `a`, x: 0, y: 0, w: 2, h: 2 },
        { i: `b`, x: 0, y: 2, w: 2, h: 2 },
      ];

      const result = moveElement(layout, layout[0], 0, 2, false, true, false);

      // b: [DOWN] = [b.x, b.y - a.h] = [0, 2 - 2]. Without a DOWN flag it would fall to $default (0, 3).
      expect(result.find(item => item.i === `b`)).toMatchObject({ x: 0, y: 0 });
      expect(result.find(item => item.i === `a`)).toMatchObject({ x: 0, y: 2 });
    });

    it(`LEFT: the displaced item moves to the right of the mover, level with it`, () => {
      const layout: TLayout = [
        { i: `a`, x: 4, y: 0, w: 2, h: 2 },
        { i: `b`, x: 2, y: 0, w: 2, h: 2 },
      ];

      const result = moveElement(layout, layout[0], 2, 0, false, true, false);

      // b: [LEFT] = [b.x + a.w, a.y] = [2 + 2, 0]. Without a LEFT flag it would fall to $default (2, 1).
      expect(result.find(item => item.i === `b`)).toMatchObject({ x: 4, y: 0 });
      expect(result.find(item => item.i === `a`)).toMatchObject({ x: 2, y: 0 });
    });

    it(`UP: the displaced item moves below the mover by the mover's height`, () => {
      const layout: TLayout = [
        { i: `a`, x: 0, y: 5, w: 2, h: 2 },
        { i: `b`, x: 0, y: 2, w: 2, h: 2 },
      ];

      const result = moveElement(layout, layout[0], 0, 2, false, true, false);

      // b: [UP] = [b.x, b.y + a.h] = [0, 2 + 2]. Without an UP flag it would fall to $default (0, 3), still overlapping a.
      expect(result.find(item => item.i === `b`)).toMatchObject({ x: 0, y: 4 });
      expect(result.find(item => item.i === `a`)).toMatchObject({ x: 0, y: 2 });
    });

    it(`no movement at all: no direction applies, so $default is used and not a directional shortcut`, () => {
      // The same-position test above runs with horizontalShift false, where direction is ignored, so it could not tell `oldX > x` from
      // `oldX >= x` (or `oldY > y` from `>=`). With horizontalShift on, a wrongly-set LEFT or UP flag sends b to (2, 0) or (0, 2).
      const layout: TLayout = [
        { i: `a`, x: 0, y: 0, w: 2, h: 2 },
        { i: `b`, x: 0, y: 0, w: 2, h: 2 },
      ];

      const result = moveElement(layout, layout[0], 0, 0, false, true, false);

      expect(result.find(item => item.i === `b`)).toMatchObject({ x: 0, y: 1 });
    });
  });

  // With isUserAction on, each displaced item first tries the slot directly above the mover. The first collision processed takes it and
  // the second finds it occupied and is pushed down instead, so which collision is processed first changes the final layout.
  describe(`the order collisions are resolved in`, () => {
    it(`moving DOWN resolves them top-to-bottom: the upper item takes the free slot above, the lower one is pushed down`, () => {
      const layout: TLayout = [
        { i: `a`, x: 0, y: 0, w: 2, h: 4 },
        { i: `b`, x: 0, y: 4, w: 2, h: 1 },
        { i: `c`, x: 0, y: 5, w: 2, h: 1 },
      ];

      // a drops from y 0 to y 3 (covering rows 3-6), landing on both b (row 4) and c (row 5). The slot above a is row 2.
      const result = moveElement(layout, layout[0], 0, 3, true, false, false);

      // Top-to-bottom: b (row 4) is first and takes row 2; c then finds row 2 taken and is pushed to row 6.
      // (Reversed, it would be c at row 2 and b at row 5.)
      expect(result.find(item => item.i === `b`)).toMatchObject({ y: 2 });
      expect(result.find(item => item.i === `c`)).toMatchObject({ y: 6 });
    });

    it(`moving UP resolves them bottom-to-top: the lower item takes the free slot above, the upper one is pushed down`, () => {
      const layout: TLayout = [
        { i: `a`, x: 0, y: 8, w: 2, h: 4 },
        { i: `b`, x: 0, y: 4, w: 2, h: 1 },
        { i: `c`, x: 0, y: 5, w: 2, h: 1 },
      ];

      // a rises from y 8 to y 3 (covering rows 3-6), landing on both b (row 4) and c (row 5). The slot above a is row 2.
      const result = moveElement(layout, layout[0], 0, 3, true, false, false);

      // Bottom-to-top: c (row 5) is first and takes row 2; b then finds row 2 taken and is pushed to row 5.
      // (In plain row order it would be b at row 2 and c at row 6.)
      expect(result.find(item => item.i === `c`)).toMatchObject({ y: 2 });
      expect(result.find(item => item.i === `b`)).toMatchObject({ y: 5 });
    });
  });

  // An item the mover has only slightly overlapped from below is not pushed ("waits to swap"): it must be overlapped by MORE than a
  // quarter of its own height first.
  describe(`the wait-to-swap threshold`, () => {
    it(`does not push an item that is overlapped by more than a quarter of its height`, () => {
      const layout: TLayout = [
        { i: `b`, x: 0, y: 0, w: 2, h: 2 },
        { i: `a`, x: 0, y: 6, w: 2, h: 2 },
      ];

      // a rises to y 1: 1 row of overlap into b (h 2), more than 2 / 4 = 0.5, so b stays put.
      const result = moveElement(layout, layout[1], 0, 1, false, false, false);

      expect(result.find(item => item.i === `b`)).toMatchObject({ x: 0, y: 0 });
      expect(result.find(item => item.i === `a`)).toMatchObject({ x: 0, y: 1 });
    });

    it(`does push an item that is overlapped by exactly a quarter of its height (the boundary is exclusive)`, () => {
      const layout: TLayout = [
        { i: `b`, x: 0, y: 2, w: 2, h: 4 },
        { i: `a`, x: 0, y: 10, w: 2, h: 2 },
      ];

      // a rises to y 3: 3 - 2 = 1 row of overlap into b (h 4), exactly 4 / 4, which is not MORE than a quarter, so b is pushed (to y + 1 = 3).
      // b sits at y 2 (not 0) deliberately: it separates the real difference (3 - 2) from a sum (3 + 2), which would wrongly skip it.
      const result = moveElement(layout, layout[1], 0, 3, false, false, false);

      expect(result.find(item => item.i === `b`)).toMatchObject({ x: 0, y: 3 });
    });
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

    const result = moveElementAwayFromCollision(layout, layout[0], layout[1], false, EMovingDirections.RIGHT, true);

    // Strengthened from a bare not.toThrow(): collidesWith(a, w:2) IS
    // narrower than itemToMove(b, w:4) and genuinely offset (x:5 !==
    // x:0), so the override's own guard is false and $default (x
    // unchanged, y+1) is what should actually apply here.
    expect(result.find(item => item.i === `b`)).toMatchObject({ x: 0, y: 1 });
  });

  it(`Should apply the RIGHT-direction override (not $default) when the colliding item is NOT narrower than the one being moved`, () => {
    // The contrasting case to the test above — collidesWith(a, w:4) is
    // NOT narrower than itemToMove(b, w:2), so "collidesWith.w <
    // itemToMove.w" is false, making the override's own guard true
    // (the negated combination it's part of), and the RIGHT-specific
    // target (itemToMove.x - collidesWith.w) should apply instead of
    // $default.
    const layout: TLayout = [
      { i: `a`, x: 5, y: 0, w: 4, h: 2 },
      { i: `b`, x: 20, y: 0, w: 2, h: 2 },
    ];

    const result = moveElementAwayFromCollision(layout, layout[0], layout[1], false, EMovingDirections.RIGHT, true);

    // target = itemToMove.x(20) - collidesWith.w(4) = 16, at collidesWith.y(0).
    expect(result.find(item => item.i === `b`)).toMatchObject({ x: 16, y: 0 });
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

  // horizontalShift only replaces the default drop position with the directional shortcut when the collided item is not both narrower
  // AND offset from the item being moved, and that rule applies to horizontal directions only.
  describe(`when the directional shortcut applies`, () => {
    it(`LEFT, narrower and offset: falls back to the default drop position, like RIGHT does`, () => {
      const layout: TLayout = [
        { i: `a`, x: 5, y: 0, w: 2, h: 2 },
        { i: `b`, x: 0, y: 0, w: 4, h: 2 },
      ];

      const result = moveElementAwayFromCollision(layout, layout[0], layout[1], false, EMovingDirections.LEFT, true);

      // a (w 2) is narrower than b (w 4) and offset (x 5 vs 0), so the LEFT shortcut (2, 0) is not used: $default is (0, 0 + 1).
      expect(result.find(item => item.i === `b`)).toMatchObject({ x: 0, y: 1 });
    });

    it(`DOWN, narrower and offset: still uses the shortcut, because only horizontal directions are subject to that rule`, () => {
      const layout: TLayout = [
        { i: `a`, x: 5, y: 3, w: 2, h: 2 },
        { i: `b`, x: 0, y: 4, w: 4, h: 2 },
      ];

      const result = moveElementAwayFromCollision(layout, layout[0], layout[1], false, EMovingDirections.DOWN, true);

      // [DOWN] = [b.x, b.y - a.h] = [0, 4 - 2]. Treating DOWN as horizontal would fall back to $default (0, 5).
      expect(result.find(item => item.i === `b`)).toMatchObject({ x: 0, y: 2 });
    });

    it(`RIGHT, narrower but at the same x: uses the shortcut, because the item is not offset`, () => {
      const layout: TLayout = [
        { i: `a`, x: 4, y: 0, w: 2, h: 2 },
        { i: `b`, x: 4, y: 1, w: 4, h: 2 },
      ];

      const result = moveElementAwayFromCollision(layout, layout[0], layout[1], false, EMovingDirections.RIGHT, true);

      // a is narrower than b but at the same x, so the rule's "offset" half is false and the RIGHT shortcut applies: [b.x - a.w, a.y] = [2, 0].
      // Ignoring the x comparison would fall back to $default (4, 2).
      expect(result.find(item => item.i === `b`)).toMatchObject({ x: 2, y: 0 });
    });
  });
});
