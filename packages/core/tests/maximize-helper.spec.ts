import { describe, expect, it } from 'vitest';
import { calcMaximizedPosition, resolveMaximizedItem } from '../src/gridlayout/helpers/maximize-helper';

describe(`resolveMaximizedItem`, () => {
  const layout = [
    { h: 2, i: `a`, w: 2, x: 0, y: 0 },
    { h: 2, i: 7, w: 2, x: 2, y: 0 },
  ];

  it(`Should return the id when the layout has that item`, () => {
    expect(resolveMaximizedItem(layout, `a`)).toBe(`a`);
    expect(resolveMaximizedItem(layout, 7)).toBe(7);
  });

  it(`Should return null for an id the layout does not have`, () => {
    expect(resolveMaximizedItem(layout, `missing`)).toBeNull();
  });

  it(`Should not match across string and number ids`, () => {
    expect(resolveMaximizedItem(layout, `7`)).toBeNull();
  });

  it(`Should return null for null, undefined and an empty layout`, () => {
    expect(resolveMaximizedItem(layout, null)).toBeNull();
    expect(resolveMaximizedItem(layout, undefined)).toBeNull();
    expect(resolveMaximizedItem([], `a`)).toBeNull();
  });

  it(`Should treat id 0 as a real id`, () => {
    expect(resolveMaximizedItem([{ h: 1, i: 0, w: 1, x: 0, y: 0 }], 0)).toBe(0);
  });
});

describe(`calcMaximizedPosition`, () => {
  it(`Should fill the container minus one margin on each side, from the left`, () => {
    expect(calcMaximizedPosition({ containerHeight: 600, containerWidth: 1000, margin: [10, 20], rtl: false })).toStrictEqual({
      height: 560,
      left: 10,
      rtl: false,
      top: 20,
      width: 980,
    });
  });

  it(`Should anchor to the right edge when mirrored, and not set left`, () => {
    expect(calcMaximizedPosition({ containerHeight: 600, containerWidth: 1000, margin: [10, 20], rtl: true })).toStrictEqual({
      height: 560,
      right: 10,
      rtl: true,
      top: 20,
      width: 980,
    });
  });

  it(`Should use the horizontal margin for width and the vertical margin for height`, () => {
    const position = calcMaximizedPosition({ containerHeight: 100, containerWidth: 100, margin: [5, 15], rtl: false });

    expect(position.width).toBe(90);
    expect(position.height).toBe(70);
  });

  it(`Should work with no margin`, () => {
    expect(calcMaximizedPosition({ containerHeight: 300, containerWidth: 400, margin: [0, 0], rtl: false })).toStrictEqual({
      height: 300,
      left: 0,
      rtl: false,
      top: 0,
      width: 400,
    });
  });

  it(`Should never shrink below 1px when the container is smaller than its margins`, () => {
    const position = calcMaximizedPosition({ containerHeight: 0, containerWidth: 5, margin: [10, 10], rtl: false });

    expect(position.width).toBe(1);
    expect(position.height).toBe(1);
  });

  it(`Should keep an exact 1px size without clamping`, () => {
    const position = calcMaximizedPosition({ containerHeight: 21, containerWidth: 21, margin: [10, 10], rtl: false });

    expect(position.width).toBe(1);
    expect(position.height).toBe(1);
  });
});
