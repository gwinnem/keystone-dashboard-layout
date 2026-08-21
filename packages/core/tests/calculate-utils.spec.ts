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
});
