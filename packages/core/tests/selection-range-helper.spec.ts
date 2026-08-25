import { describe, expect, it } from 'vitest';
import { computeRangeSelection } from '../src/gridlayout/helpers/selection-range-helper';

describe(`computeRangeSelection`, () => {
  const layout = [
    { h: 2, i: `a`, w: 2, x: 0, y: 0 },
    { h: 2, i: `b`, w: 2, x: 2, y: 0 },
    { h: 2, i: `c`, w: 2, x: 4, y: 0 },
    { h: 2, i: `d`, w: 2, x: 6, y: 0 },
    { h: 2, i: `e`, w: 2, x: 8, y: 0 },
  ];

  it(`Should return every id between the anchor and target, inclusive, when the anchor comes first`, () => {
    expect(computeRangeSelection(layout, `a`, `d`)).toEqual([`a`, `b`, `c`, `d`]);
  });

  it(`Should return the same set of ids when Shift-clicking "backwards" (target comes before anchor in layout order)`, () => {
    expect(computeRangeSelection(layout, `d`, `a`)).toEqual([`a`, `b`, `c`, `d`]);
  });

  it(`Should return just the one id when anchor and target are the same item`, () => {
    expect(computeRangeSelection(layout, `c`, `c`)).toEqual([`c`]);
  });

  it(`Should return exactly the two ids when anchor and target are adjacent`, () => {
    expect(computeRangeSelection(layout, `b`, `c`)).toEqual([`b`, `c`]);
  });

  it(`Should return the entire layout when anchor and target are the first and last items`, () => {
    expect(computeRangeSelection(layout, `a`, `e`)).toEqual([`a`, `b`, `c`, `d`, `e`]);
  });

  it(`Should fall back to just the target id when the anchor id doesn't match any real layout item`, () => {
    expect(computeRangeSelection(layout, `does-not-exist`, `c`)).toEqual([`c`]);
  });

  it(`Should fall back to just the target id when the target id doesn't match any real layout item`, () => {
    expect(computeRangeSelection(layout, `a`, `does-not-exist`)).toEqual([`does-not-exist`]);
  });

  it(`Should not throw and should fall back sensibly when the layout is empty`, () => {
    expect(() => computeRangeSelection([], `a`, `b`)).not.toThrow();
    expect(computeRangeSelection([], `a`, `b`)).toEqual([`b`]);
  });
});
