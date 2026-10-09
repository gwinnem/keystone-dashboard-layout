// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {describe, expect, it} from 'vitest';
import {calcXY} from "../src/helpers/calculate-utils";
import {EErrorMessage} from "../src/common/enums/ErrorMessages";

describe(`calcXY`, () => {
  it(`Should throw error when invalid rowHeight is passed`, () => {
    expect(() => calcXY(10, 589, [10, 10], 0, 6, 10, 10, 1, 1))
      .toThrowError(EErrorMessage.INVALID_PARAM_ROW_HEIGHT);
  });

  it(`Should throw error when invalid margin[0] is passed`, () => {
    expect(() => calcXY(10, 589, [0, 10], 60, 6, 10, 10, 1, 1))
      .toThrowError(EErrorMessage.INVALID_PARAM_MARGIN);
  });

  it(`Should throw error when invalid margin[1] is passed`, () => {
    expect(() => calcXY(10, 589, [10, 0], 60, 6, 10, 10, 1, 1))
      .toThrowError(EErrorMessage.INVALID_PARAM_MARGIN);
  });

  it(`Should throw error when invalid margin is passed`, () => {
    expect(() => calcXY(10, 589, [0, 0], 60, 6, 10, 10, 1, 1))
      .toThrowError(EErrorMessage.INVALID_PARAM_MARGIN);
  });

  it(`Should throw error when invalid innerH is passed`, () => {
    expect(() => calcXY(10, 589, [10, 10], 10, 10, 0, 10, 1, 1))
      .toThrowError(EErrorMessage.INVALID_PARAM_INNER_H);
  });

  it(`Should throw error when invalid innerW is passed`, () => {
    expect(() => calcXY(10, 589, [10, 10], 10, 10, 10, 0, 1, 1))
      .toThrowError(EErrorMessage.INVALID_PARAM_INNER_W);
  });

  it(`Should throw error when invalid cols is passed`, () => {
    expect(() => calcXY(10, 589, [10, 10], 10, 0, 10, 10, 1, 1))
      .toThrowError(EErrorMessage.INVALID_PARAM_COLS);
  });

  it(`Should throw error when invalid maxRows is passed`, () => {
    expect(() => calcXY(10, 589, [10, 10], 10, 10, 10, 10, 0, 1))
      .toThrowError(EErrorMessage.INVALID_PARAM_MAX_ROWS);
  });

  it(`Should throw error when invalid containerWidth is passed`, () => {
    expect(() => calcXY(10, 589, [10, 10], 10, 10, 10, 10, 1, 0))
      .toThrowError(EErrorMessage.INVALID_PARAM_CONTAINER_WIDTH);
  });

  it(`Should compute x/y correctly with all-valid params, without throwing — confirmed gap via a fresh coverage report`, () => {
    // Every existing test above only exercises a *throwing* validation
    // path. Since validateXYParams's own checks run sequentially and an
    // earlier one throwing means later checks (containerWidth's own
    // included) are never reached at all, this file had no test
    // reaching the containerWidth check's own false branch (continuing
    // past it to the real calculation) -- every other test throws
    // before getting there.
    // colWidth = calcColWidth(600, 10, 6) = (600-7*10)/6 = 530/6 ≈ 88.33
    // x = round((100-10)/(88.33+10)) = round(90/98.33) = round(0.915) = 1
    // y = round((50-10)/(60+10)) = round(40/70) = round(0.571) = 1
    const result = calcXY(50, 100, [10, 10], 60, 6, 2, 2, 10, 600);

    expect(result).toStrictEqual({ x: 1, y: 1 });
  });

  // Every test above uses a clearly-invalid value (0) to trigger each
  // throw — none use the exact boundary (1), so "< 1" and a mutated
  // "<= 1" were never distinguished for any of the 7 checks. Each test
  // below sets exactly one param to 1 (its own valid boundary) against
  // the same otherwise-valid baseline as the "all-valid" test above,
  // confirming validateXYParams correctly does NOT throw at that
  // boundary.
  it(`Should NOT throw when rowHeight is exactly 1 (the boundary, not just clearly invalid at 0)`, () => {
    expect(() => calcXY(50, 100, [10, 10], 1, 6, 2, 2, 10, 600)).not.toThrow();
  });

  it(`Should NOT throw when margin[0] is exactly 1`, () => {
    expect(() => calcXY(50, 100, [1, 10], 60, 6, 2, 2, 10, 600)).not.toThrow();
  });

  it(`Should NOT throw when margin[1] is exactly 1`, () => {
    expect(() => calcXY(50, 100, [10, 1], 60, 6, 2, 2, 10, 600)).not.toThrow();
  });

  it(`Should NOT throw when cols is exactly 1`, () => {
    expect(() => calcXY(50, 100, [10, 10], 60, 1, 2, 2, 10, 600)).not.toThrow();
  });

  it(`Should NOT throw when innerH is exactly 1`, () => {
    expect(() => calcXY(50, 100, [10, 10], 60, 6, 1, 2, 10, 600)).not.toThrow();
  });

  it(`Should NOT throw when innerW is exactly 1`, () => {
    expect(() => calcXY(50, 100, [10, 10], 60, 6, 2, 1, 10, 600)).not.toThrow();
  });

  it(`Should NOT throw when maxRows is exactly 1`, () => {
    expect(() => calcXY(50, 100, [10, 10], 60, 6, 2, 2, 1, 600)).not.toThrow();
  });

  it(`Should NOT throw when containerWidth is exactly 1`, () => {
    expect(() => calcXY(50, 100, [10, 10], 60, 6, 2, 2, 10, 1)).not.toThrow();
  });

  // The "all-valid" test above lands on cell (1, 1) however the margin is applied: (100 + 10) / 98.33 and (100 - 10) / 98.33 both
  // round to 1, so a flipped sign or a wrong divisor never changed the result. These use pixel positions about 2.4 cells in, where
  // each of those mistakes rounds to 3 instead of 2.
  //   margin [10, 10], rowHeight 60, cols 6, containerWidth 600 -> colWidth 88.33, column step 98.33, row step 70
  it(`Should subtract the margin from the pixel position and add it to the cell size, for x`, () => {
    // (246 - 10) / (88.33 + 10) = 2.40 -> 2.   (246 + 10) / 98.33 = 2.60 -> 3.   236 / (88.33 - 10) = 3.01 -> 3.
    expect(calcXY(10, 246, [10, 10], 60, 6, 2, 2, 10, 600).x).toBe(2);
  });

  it(`Should subtract the margin from the pixel position and add it to the cell size, for y`, () => {
    // (178 - 10) / (60 + 10) = 2.40 -> 2.   (178 + 10) / 70 = 2.69 -> 3.   168 / (60 - 10) = 3.36 -> 3.
    expect(calcXY(178, 10, [10, 10], 60, 6, 2, 2, 10, 600).y).toBe(2);
  });

  it(`Should use the vertical margin for y, not the horizontal one`, () => {
    // margin [10, 30]: (206 - 30) / (60 + 30) = 1.96 -> 2.   Using margin[0] = 10 instead: (206 - 10) / 70 = 2.80 -> 3.
    expect(calcXY(206, 10, [10, 30], 60, 6, 2, 2, 10, 600).y).toBe(2);
  });

  it(`Should cap x so the item, at its own width, cannot pass the last column`, () => {
    // The pixel position is about 100 cells across; with innerW 2 in 6 columns the furthest start is column 4 (not 6 + 2 = 8).
    expect(calcXY(10, 10000, [10, 10], 60, 6, 3, 2, 10, 600).x).toBe(4);
  });

  it(`Should cap y so the item, at its own height, cannot pass the last row`, () => {
    // With innerH 3 in 10 rows the furthest start is row 7 (not 10 + 3 = 13).
    expect(calcXY(10000, 10, [10, 10], 60, 6, 3, 2, 10, 600).y).toBe(7);
  });

  it(`Should clamp a position before the grid's own origin to 0, in both directions`, () => {
    expect(calcXY(-500, -500, [10, 10], 60, 6, 2, 2, 10, 600)).toStrictEqual({ x: 0, y: 0 });
  });
});
