// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { correctBounds } from '../src/helpers/responsive-utils';

describe(`correctBounds`, () => {
  it(`Should move a static item that overflows the right edge back within bounds`, () => {
    const layout = [{ i: `s`, x: 4, y: 0, w: 2, h: 1, isStatic: true }];

    const result = correctBounds(layout, { cols: 4 }, false);

    expect(result).toStrictEqual([{ i: `s`, x: 2, y: 0, w: 2, h: 1, isStatic: true }]);
  });

  it(`Should pull a non-static item that overflows the right edge back to the boundary when distributeEvenly is false`, () => {
    const layout = [{ i: `a`, x: 3, y: 0, w: 2, h: 1 }];

    const result = correctBounds(layout, { cols: 4 }, false);

    expect(result).toStrictEqual([{ i: `a`, x: 2, y: 0, w: 2, h: 1 }]);
  });

  it(`Should move a non-static item to the next available row when distributeEvenly is true and it collides`, () => {
    const layout = [
      { i: `stat`, x: 0, y: 0, w: 2, h: 1, isStatic: true },
      { i: `a`, x: 3, y: 0, w: 2, h: 1 },
    ];

    const result = correctBounds(layout, { cols: 4 }, true);

    expect(result).toStrictEqual([
      { i: `stat`, x: 0, y: 0, w: 2, h: 1, isStatic: true },
      { i: `a`, x: 0, y: 1, w: 2, h: 1 },
    ]);
  });

  it(`Should leave a non-static item unchanged when distributeEvenly is true but it already fits within bounds — confirmed gap via a fresh coverage report`, () => {
    // The only existing distributeEvenly:true test above always has the
    // item overflow (l.x+l.w>bounds.cols); this exercises that same
    // check's own false branch, which skips moveToCorrectPlace entirely.
    const layout = [{ i: `a`, x: 0, y: 0, w: 2, h: 1 }];

    const result = correctBounds(layout, { cols: 4 }, true);

    expect(result).toStrictEqual([{ i: `a`, x: 0, y: 0, w: 2, h: 1 }]);
  });

  it(`Should not move a static item via moveToCorrectPlace when distributeEvenly is true, even if it overflows — confirmed gap via a fresh coverage report`, () => {
    // Statics are already handled by their own dedicated loop earlier in
    // correctBounds -- "!collidesWith.includes(l)" (l itself already
    // being in that array, since every static item is pushed there
    // up front) is what excludes them from this second pass entirely,
    // regardless of whether they'd otherwise overflow. Distinct from
    // the very first test in this file (a static item overflowing with
    // distributeEvenly:false, corrected by the earlier static-only
    // loop) -- this confirms the *second* loop's own guard specifically.
    const layout = [{ i: `s`, x: 3, y: 0, w: 2, h: 1, isStatic: true }];

    const result = correctBounds(layout, { cols: 4 }, true);

    // Corrected by the static-only loop (x-=1 until it fits), not
    // moveToCorrectPlace (which would also have adjusted y).
    expect(result).toStrictEqual([{ i: `s`, x: 2, y: 0, w: 2, h: 1, isStatic: true }]);
  });

  it(`Should correct a negative x position back to 0`, () => {
    const layout = [{ i: `a`, x: -3, y: 0, w: 1, h: 1 }];

    const result = correctBounds(layout, { cols: 4 }, false);

    expect(result).toStrictEqual([{ i: `a`, x: 0, y: 0, w: 1, h: 1 }]);
  });

  it(`Should clamp an item's own width down to the target breakpoint's column count when it's wider and has no minW floor keeping it there`, () => {
    // Behavior change: this test used to assert the *opposite* (w
    // staying at 6, unclamped) as deliberate, documented behavior — see
    // responsive-utils.ts's own updated comment on the bug this fixes.
    // Distinct from the "negative x" test above: that one feeds an
    // already-negative x straight in. This one starts from a positive x
    // and lets correctBounds's own right-overflow correction (`l.x =
    // bounds.cols - l.w`) produce the negative value as a side effect —
    // exactly the scenario a `// TODO experiment to get a layout where
    // this is the case ... this is not being triggered` comment had been
    // sitting on the very next line since 2023 (removed once a test
    // confirmed it's reachable — see docs/REFACTORING.md #54). An item
    // wider than the *new* breakpoint's column count (e.g. shrinking
    // from a 12-col desktop breakpoint down to a 2-col mobile one, with
    // the item's own `w` never adjusted for the new breakpoint) is a
    // completely ordinary way to end up here, not a contrived edge case.
    const layout = [{ i: `a`, x: 3, y: 0, w: 6, h: 1 }];

    const result = correctBounds(layout, { cols: 2 }, false);

    expect(result).toStrictEqual([{ i: `a`, x: 0, y: 0, w: 2, h: 1 }]);
  });

  it(`Should not clamp an item's own width below its own minW, even when that leaves it wider than the target breakpoint's column count`, () => {
    // Same starting shape as the test above, but with an explicit minW
    // greater than the new cols — squeezing the item down to 2 columns
    // regardless would silently violate a floor the item's own author
    // set for a reason. Staying at minW (4), wider than cols (2), is
    // the intended signal for GridLayout's own root to need a
    // horizontal scrollbar, not a leftover bug.
    const layout = [{ i: `a`, x: 3, y: 0, w: 6, h: 1, minW: 4 }];

    const result = correctBounds(layout, { cols: 2 }, false);

    expect(result).toStrictEqual([{ i: `a`, x: 0, y: 0, w: 4, h: 1, minW: 4 }]);
  });

  it(`Should leave an item's own width unchanged when it already fits within the target breakpoint's column count, even with a minW set`, () => {
    const layout = [{ i: `a`, x: 0, y: 0, w: 2, h: 1, minW: 1 }];

    const result = correctBounds(layout, { cols: 4 }, false);

    expect(result).toStrictEqual([{ i: `a`, x: 0, y: 0, w: 2, h: 1, minW: 1 }]);
  });

  it(`Should leave an item that already fits within bounds unchanged`, () => {
    const layout = [{ i: `a`, x: 0, y: 0, w: 2, h: 1 }];

    const result = correctBounds(layout, { cols: 4 }, false);

    expect(result).toStrictEqual([{ i: `a`, x: 0, y: 0, w: 2, h: 1 }]);
  });
});
