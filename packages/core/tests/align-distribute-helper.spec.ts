import { describe, expect, it } from 'vitest';
import { computeAlignAdjustments, computeDistributeAdjustments } from '../src/gridlayout/helpers/align-distribute-helper';

describe(`computeAlignAdjustments`, () => {
  it(`Should align non-anchor items' left edge to the anchor's left edge`, () => {
    const layout = [
      { h: 2, i: `anchor`, w: 2, x: 5, y: 0 },
      { h: 2, i: `other`, w: 2, x: 0, y: 4 },
    ];

    const result = computeAlignAdjustments(layout, [`anchor`, `other`], `left`);

    expect(result.get(`other`)).toStrictEqual({ x: 5 });
    expect(result.has(`anchor`)).toBe(false);
  });

  it(`Should align non-anchor items' right edge to the anchor's right edge, adjusting for each item's own width`, () => {
    // anchor's right edge is at x:5+4=9; other (w:2) needs x:7 for its
    // own right edge (7+2=9) to land there.
    const layout = [
      { h: 2, i: `anchor`, w: 4, x: 5, y: 0 },
      { h: 2, i: `other`, w: 2, x: 0, y: 4 },
    ];

    const result = computeAlignAdjustments(layout, [`anchor`, `other`], `right`);

    expect(result.get(`other`)).toStrictEqual({ x: 7 });
  });

  it(`Should align non-anchor items' top edge to the anchor's top edge`, () => {
    const layout = [
      { h: 2, i: `anchor`, w: 2, x: 0, y: 5 },
      { h: 2, i: `other`, w: 2, x: 4, y: 0 },
    ];

    const result = computeAlignAdjustments(layout, [`anchor`, `other`], `top`);

    expect(result.get(`other`)).toStrictEqual({ y: 5 });
  });

  it(`Should align non-anchor items' bottom edge to the anchor's bottom edge, adjusting for each item's own height`, () => {
    const layout = [
      { h: 4, i: `anchor`, w: 2, x: 0, y: 5 },
      { h: 2, i: `other`, w: 2, x: 4, y: 0 },
    ];

    const result = computeAlignAdjustments(layout, [`anchor`, `other`], `bottom`);

    // anchor's bottom edge is at y:5+4=9; other (h:2) needs y:7 for its
    // own bottom edge (7+2=9) to land there.
    expect(result.get(`other`)).toStrictEqual({ y: 7 });
  });

  it(`Should center-align on the x axis, rounding to the nearest whole grid unit`, () => {
    // anchor's horizontal center: 0 + 4/2 = 2. other (w:3) needs its
    // own center (x + 1.5) to land at 2, so x = 0.5, rounded to 1 (or 0,
    // depending on rounding direction — Math.round(0.5) rounds to 1 in
    // JS's own rounding convention, ties-away-from-zero for positives... actually banker's? confirmed: Math.round(0.5) === 1 in JS).
    const layout = [
      { h: 2, i: `anchor`, w: 4, x: 0, y: 0 },
      { h: 2, i: `other`, w: 3, x: 10, y: 4 },
    ];

    const result = computeAlignAdjustments(layout, [`anchor`, `other`], `center-x`);

    expect(result.get(`other`)).toStrictEqual({ x: 1 });
  });

  it(`Should center-align on the y axis`, () => {
    const layout = [
      { h: 4, i: `anchor`, w: 2, x: 0, y: 0 },
      { h: 2, i: `other`, w: 2, x: 4, y: 10 },
    ];

    const result = computeAlignAdjustments(layout, [`anchor`, `other`], `center-y`);

    // anchor's vertical center: 0 + 4/2 = 2. other (h:2) needs y:1 for
    // its own center (1+1=2) to land there.
    expect(result.get(`other`)).toStrictEqual({ y: 1 });
  });

  it(`Should align multiple non-anchor items at once, all to the same anchor`, () => {
    const layout = [
      { h: 2, i: `anchor`, w: 2, x: 5, y: 0 },
      { h: 2, i: `a`, w: 2, x: 0, y: 4 },
      { h: 2, i: `b`, w: 2, x: 10, y: 8 },
    ];

    const result = computeAlignAdjustments(layout, [`anchor`, `a`, `b`], `left`);

    expect(result.get(`a`)).toStrictEqual({ x: 5 });
    expect(result.get(`b`)).toStrictEqual({ x: 5 });
  });

  it(`Should not include an item already exactly aligned`, () => {
    const layout = [
      { h: 2, i: `anchor`, w: 2, x: 5, y: 0 },
      { h: 2, i: `other`, w: 2, x: 5, y: 4 },
    ];

    const result = computeAlignAdjustments(layout, [`anchor`, `other`], `left`);

    expect(result.has(`other`)).toBe(false);
  });

  // Confirmed gap via a fresh coverage report: the "already aligned, no
  // adjustment needed" branch above was only ever exercised for `left`
  // — the other 5 edge/center cases each have their own identical
  // `if(item.x/y !== target) { ... }` check, but none of those false
  // branches were reached by any existing test.
  it(`Should not include an item already exactly aligned to the right edge`, () => {
    // anchor's right edge: 5+4=9; other (w:2) already at its own target
    // x (7, since 7+2=9) needs no adjustment.
    const layout = [
      { h: 2, i: `anchor`, w: 4, x: 5, y: 0 },
      { h: 2, i: `other`, w: 2, x: 7, y: 4 },
    ];

    const result = computeAlignAdjustments(layout, [`anchor`, `other`], `right`);

    expect(result.has(`other`)).toBe(false);
  });

  it(`Should not include an item already exactly aligned to the top edge`, () => {
    const layout = [
      { h: 2, i: `anchor`, w: 2, x: 0, y: 5 },
      { h: 2, i: `other`, w: 2, x: 4, y: 5 },
    ];

    const result = computeAlignAdjustments(layout, [`anchor`, `other`], `top`);

    expect(result.has(`other`)).toBe(false);
  });

  it(`Should not include an item already exactly aligned to the bottom edge`, () => {
    // anchor's bottom edge: 5+4=9; other (h:2) already at its own
    // target y (7, since 7+2=9) needs no adjustment.
    const layout = [
      { h: 4, i: `anchor`, w: 2, x: 0, y: 5 },
      { h: 2, i: `other`, w: 2, x: 4, y: 7 },
    ];

    const result = computeAlignAdjustments(layout, [`anchor`, `other`], `bottom`);

    expect(result.has(`other`)).toBe(false);
  });

  it(`Should not include an item already exactly center-aligned on the x axis`, () => {
    // anchor's horizontal center: 0+4/2=2; other (w:2) already at its
    // own target x (1, since 1+1=2) needs no adjustment.
    const layout = [
      { h: 2, i: `anchor`, w: 4, x: 0, y: 0 },
      { h: 2, i: `other`, w: 2, x: 1, y: 4 },
    ];

    const result = computeAlignAdjustments(layout, [`anchor`, `other`], `center-x`);

    expect(result.has(`other`)).toBe(false);
  });

  it(`Should not include an item already exactly center-aligned on the y axis`, () => {
    const layout = [
      { h: 4, i: `anchor`, w: 2, x: 0, y: 0 },
      { h: 2, i: `other`, w: 2, x: 4, y: 1 },
    ];

    const result = computeAlignAdjustments(layout, [`anchor`, `other`], `center-y`);

    expect(result.has(`other`)).toBe(false);
  });

  it(`Should return an empty map when fewer than 2 ids are given`, () => {
    const layout = [{ h: 2, i: `solo`, w: 2, x: 0, y: 0 }];

    expect(computeAlignAdjustments(layout, [`solo`], `left`)).toStrictEqual(new Map());
    expect(computeAlignAdjustments(layout, [], `left`)).toStrictEqual(new Map());
  });

  it(`Should return an empty map when the anchor id doesn't match any real layout item`, () => {
    const layout = [{ h: 2, i: `real`, w: 2, x: 0, y: 0 }];

    const result = computeAlignAdjustments(layout, [`ghost`, `real`], `left`);

    expect(result).toStrictEqual(new Map());
  });

  it(`Should skip a non-anchor id that doesn't match any real layout item, without throwing`, () => {
    const layout = [
      { h: 2, i: `anchor`, w: 2, x: 5, y: 0 },
      { h: 2, i: `real`, w: 2, x: 0, y: 4 },
    ];

    expect(() => computeAlignAdjustments(layout, [`anchor`, `ghost`, `real`], `left`)).not.toThrow();
    const result = computeAlignAdjustments(layout, [`anchor`, `ghost`, `real`], `left`);
    expect(result.has(`ghost`)).toBe(false);
    expect(result.get(`real`)).toStrictEqual({ x: 5 });
  });

  // In the switch, each case's `break` sits inside its own braces, so a case whose body is lost falls through into the NEXT one (left into
  // right, top into bottom). With equal widths/heights both give the same number, which is why the left/top tests above could not tell.
  // These use unequal sizes so left and right (and top and bottom) land on different cells.
  it(`Should align left to the anchor's x, not right-align, when the item is a different width`, () => {
    // left: x 5. A right-align would give 5 + 4 - 2 = 7.
    const layout = [
      { h: 2, i: `anchor`, w: 4, x: 5, y: 0 },
      { h: 2, i: `other`, w: 2, x: 0, y: 4 },
    ];

    expect(computeAlignAdjustments(layout, [`anchor`, `other`], `left`).get(`other`)).toStrictEqual({ x: 5 });
  });

  it(`Should align top to the anchor's y, not bottom-align, when the item is a different height`, () => {
    // top: y 5. A bottom-align would give 5 + 4 - 2 = 7.
    const layout = [
      { h: 4, i: `anchor`, w: 2, x: 0, y: 5 },
      { h: 2, i: `other`, w: 2, x: 4, y: 0 },
    ];

    expect(computeAlignAdjustments(layout, [`anchor`, `other`], `top`).get(`other`)).toStrictEqual({ y: 5 });
  });

  it(`Should take the anchor from the first id given, not the first item in the layout`, () => {
    // `b` is the anchor even though `a` comes first in the layout, so `a` moves to b's x.
    const layout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 5, y: 4 },
    ];

    const result = computeAlignAdjustments(layout, [`b`, `a`], `left`);

    expect(result.get(`a`)).toStrictEqual({ x: 5 });
    expect(result.has(`b`)).toBe(false);
  });
});

describe(`computeDistributeAdjustments`, () => {
  it(`Should evenly space the one middle item's x between the first and last, on the horizontal axis`, () => {
    // first at x:0-2 (right edge 2), last at x:20-22 (left edge 20) —
    // span between them is 18, minus the middle item's own width (2)
    // leaves 16 to split into 2 gaps of 8 each.
    const layout = [
      { h: 2, i: `first`, w: 2, x: 0, y: 0 },
      { h: 2, i: `middle`, w: 2, x: 5, y: 0 },
      { h: 2, i: `last`, w: 2, x: 20, y: 0 },
    ];

    const result = computeDistributeAdjustments(layout, [`first`, `middle`, `last`], `horizontal`);

    expect(result.get(`middle`)).toStrictEqual({ x: 10 });
    expect(result.has(`first`)).toBe(false);
    expect(result.has(`last`)).toBe(false);
  });

  it(`Should evenly space multiple middle items, not just one`, () => {
    const layout = [
      { h: 2, i: `first`, w: 2, x: 0, y: 0 },
      { h: 2, i: `a`, w: 2, x: 3, y: 0 },
      { h: 2, i: `b`, w: 2, x: 6, y: 0 },
      { h: 2, i: `last`, w: 2, x: 30, y: 0 },
    ];

    const result = computeDistributeAdjustments(layout, [`first`, `a`, `b`, `last`], `horizontal`);

    // span: 30+2-0 = 32; total size of all 4 items = 8; gap = (32-8)/3 = 8.
    // a: cursor starts at first.x+first.w = 2, +gap(8) = 10.
    // b: cursor = 10+a.w(2) = 12, +gap(8) = 20.
    expect(result.get(`a`)).toStrictEqual({ x: 10 });
    expect(result.get(`b`)).toStrictEqual({ x: 20 });
  });

  it(`Should distribute on the vertical axis independently of x`, () => {
    const layout = [
      { h: 2, i: `first`, w: 2, x: 0, y: 0 },
      { h: 2, i: `middle`, w: 2, x: 0, y: 5 },
      { h: 2, i: `last`, w: 2, x: 0, y: 20 },
    ];

    const result = computeDistributeAdjustments(layout, [`first`, `middle`, `last`], `vertical`);

    expect(result.get(`middle`)).toStrictEqual({ y: 10 });
  });

  it(`Should sort by actual position, regardless of the order ids are passed in`, () => {
    const layout = [
      { h: 2, i: `first`, w: 2, x: 0, y: 0 },
      { h: 2, i: `middle`, w: 2, x: 5, y: 0 },
      { h: 2, i: `last`, w: 2, x: 20, y: 0 },
    ];

    // Passed in a scrambled order — `last` first, `first` last.
    const result = computeDistributeAdjustments(layout, [`last`, `middle`, `first`], `horizontal`);

    expect(result.get(`middle`)).toStrictEqual({ x: 10 });
  });

  it(`Should return an empty map with fewer than 3 items`, () => {
    const layout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 10, y: 0 },
    ];

    expect(computeDistributeAdjustments(layout, [`a`, `b`], `horizontal`)).toStrictEqual(new Map());
    expect(computeDistributeAdjustments(layout, [`a`], `horizontal`)).toStrictEqual(new Map());
    expect(computeDistributeAdjustments(layout, [], `horizontal`)).toStrictEqual(new Map());
  });

  it(`Should skip an id that doesn't match any real layout item, without throwing`, () => {
    const layout = [
      { h: 2, i: `first`, w: 2, x: 0, y: 0 },
      { h: 2, i: `middle`, w: 2, x: 5, y: 0 },
      { h: 2, i: `last`, w: 2, x: 20, y: 0 },
    ];

    expect(() => computeDistributeAdjustments(layout, [`first`, `ghost`, `middle`, `last`], `horizontal`)).not.toThrow();
  });

  it(`Should not include a middle item that's already exactly at its target position`, () => {
    const layout = [
      { h: 2, i: `first`, w: 2, x: 0, y: 0 },
      { h: 2, i: `middle`, w: 2, x: 10, y: 0 },
      { h: 2, i: `last`, w: 2, x: 20, y: 0 },
    ];

    const result = computeDistributeAdjustments(layout, [`first`, `middle`, `last`], `horizontal`);

    expect(result.has(`middle`)).toBe(false);
  });

  it(`Should still compute a (negative) gap rather than clamping when items collectively don't fit in the span, applying it as-is`, () => {
    // first at x:0-5, last at x:6-11 — span is only 11, but total item
    // size (5 items x 5 wide = 25) is far larger than that, so the
    // computed gap is deeply negative, and middle items overlap.
    const layout = [
      { h: 2, i: `first`, w: 5, x: 0, y: 0 },
      { h: 2, i: `middle`, w: 5, x: 3, y: 0 },
      { h: 2, i: `last`, w: 5, x: 6, y: 0 },
    ];

    expect(() => computeDistributeAdjustments(layout, [`first`, `middle`, `last`], `horizontal`)).not.toThrow();
  });

  // Every test above keeps w equal to h, puts the first item at 0 and passes ids already in order, so a swapped size key, a dropped sort or
  // a wrong span formula all produce the same numbers. These use unequal sizes, a first item away from 0, and ids out of order.
  it(`Should space along x using widths (not heights), measuring the span from the first item's own x`, () => {
    // sorted by x: a (1..3), b (4..6), c (11..15). span = (11 + 4) - 1 = 14; widths total 2 + 2 + 4 = 8; gap = (14 - 8) / 2 = 3.
    // b = round(3 + 3) = 6. Using heights (1 + 9 + 1), or adding first.x into the span instead of subtracting it, gives other values.
    const layout = [
      { h: 1, i: `a`, w: 2, x: 1, y: 0 },
      { h: 9, i: `b`, w: 2, x: 4, y: 0 },
      { h: 1, i: `c`, w: 4, x: 11, y: 0 },
    ];

    // Ids deliberately out of order: the order has to come from the positions.
    const result = computeDistributeAdjustments(layout, [`c`, `a`, `b`], `horizontal`);

    expect(result.get(`b`)).toStrictEqual({ x: 6 });
    expect(result.size).toBe(1);
  });

  it(`Should space along y using heights (not widths), measuring the span from the first item's own y`, () => {
    const layout = [
      { h: 2, i: `a`, w: 1, x: 0, y: 1 },
      { h: 2, i: `b`, w: 9, x: 0, y: 4 },
      { h: 4, i: `c`, w: 1, x: 0, y: 11 },
    ];

    const result = computeDistributeAdjustments(layout, [`c`, `a`, `b`], `vertical`);

    expect(result.get(`b`)).toStrictEqual({ y: 6 });
    expect(result.size).toBe(1);
  });

  it(`Should only ever move the items strictly between the first and last, even when rounding would shift the last one`, () => {
    // span = (9 + 2) - 0 = 11; widths total 6; gap = 2.5. b = round(2 + 2.5) = 5. Carrying on to the last item would compute
    // round((5 + 2) + 2.5) = round(9.5) = 10, a move of c from 9 to 10: the outer two items are the fixed frame.
    const layout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 3, y: 0 },
      { h: 2, i: `c`, w: 2, x: 9, y: 0 },
    ];

    const result = computeDistributeAdjustments(layout, [`a`, `b`, `c`], `horizontal`);

    expect(result.get(`b`)).toStrictEqual({ x: 5 });
    expect(result.has(`c`)).toBe(false);
  });
});
