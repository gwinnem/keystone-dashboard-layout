// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {describe, expect, it} from 'vitest';
import {IBreakpoints, IColumns} from "../src/breakpoints.interfaces";
import {
  getBreakpointFromWidth,
  getColsFromBreakpoint,
  sortBreakpoints
} from "../src/common/helpers/breakpoints-helper";
import {EErrorMessage} from "../src/common/enums/ErrorMessages";

const breakpoints: IBreakpoints = {
  xl: 1400,
  xxl: 1600,
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0,
};

describe(`sortBreakpoints`, () => {
  it(`Breakpoints are sorted correctly`, () => {
    const sortedBreakPoints = sortBreakpoints(breakpoints);
    const resultBreakPoints = [
      `xxs`,
      `xs`,
      `sm`,
      `md`,
      `lg`,
      `xl`,
      `xxl`
    ];

    expect(sortedBreakPoints).toMatchObject(resultBreakPoints);
  });

  it(`Breakpoints are sorted correctly 1`, () => {
    const localBreakpoints: IBreakpoints = {
      xxs: 0,
      md: 996,
      xs: 480,
      sm: 768,
    };
    const sortedBreakPoints = sortBreakpoints(localBreakpoints);
    const resultBreakPoints = [
      `xxs`,
      `xs`,
      `sm`,
      `md`
    ];

    expect(sortedBreakPoints).toMatchObject(resultBreakPoints);
  });

  it(`Empty Breakpoint array throws error`, () => {
    expect(() => sortBreakpoints([])).toThrowError(EErrorMessage.INVALID_BREAKPOINT);
  });

  it(`Returned Breakpoint array has correct length`, () => {
    const localBreakpoints: IBreakpoints = {
      xxs: 0,
      md: 996,
      xs: 480,
      sm: 768,
    };
    expect(() => sortBreakpoints(localBreakpoints).length === 4).toBeTruthy();
  });
});

describe(`getBreakpointFromWidth`, () => {
  it('Should throw error when no breakpoint is passed', () => {
    expect(() => getBreakpointFromWidth({}, 1200)).toThrowError(EErrorMessage.INVALID_BREAKPOINT);
  });

  it(`Correct Breakpoint is returned 1500 = xl`, () => {
    expect(getBreakpointFromWidth(breakpoints, 1500) === `xl`).toBeTruthy();
  });

  it(`Correct Breakpoint is returned 1201 = lg`, () => {
    expect(getBreakpointFromWidth(breakpoints, 1201) === `lg`).toBeTruthy();
  });

  it(`Correct Breakpoint is returned 2000`, () => {
    expect(getBreakpointFromWidth(breakpoints, 2000) === `xxl`).toBeTruthy();
  });

  it(`Invalid width should throw error`, () => {
    expect(() => getBreakpointFromWidth(breakpoints, -99)).toThrowError(EErrorMessage.INVALID_WIDTH);
  });
  it(`Empty breakpoints should throw error`, () => {
    expect(() => getBreakpointFromWidth([], 99)).toThrowError(EErrorMessage.INVALID_BREAKPOINT);
  });

  it(`A width exactly equal to a breakpoint's own threshold should resolve to the NEXT LOWER breakpoint, not that one — the comparison is strictly "greater than", not "greater than or equal"`, () => {
    // sm's own threshold is 768 — width=768 exactly should NOT match sm
    // (768 > 768 is false); the highest breakpoint whose threshold is
    // strictly below 768 (xs, at 480) is what should match instead.
    // None of the other tests in this file use a width that exactly
    // equals any real breakpoint threshold, so a ">" -> ">=" mutant
    // here was never actually distinguished from correct behavior.
    expect(getBreakpointFromWidth(breakpoints, 768)).toBe(`xs`);
  });

  describe(`isBreakPointDefined (via getBreakpointFromWidth's own guard)`, () => {
    // Each of isBreakPointDefined's own 7 Object.hasOwn(...) checks is
    // chained with && — the existing "empty breakpoints"/"empty array"
    // tests above are missing ALL 7 keys at once, which can't
    // distinguish any ONE check's own removal from the others (removing
    // any single check still leaves 6 more that an empty object fails
    // regardless). Testing each key missing in isolation (all 6 OTHERS
    // present) is what actually confirms each check individually matters.
    const allSevenKeys = { lg: 1200, md: 996, sm: 768, xl: 1400, xs: 480, xxl: 1600, xxs: 0 };

    for(const missingKey of Object.keys(allSevenKeys)) {
      it(`Should throw when only "${missingKey}" is missing (all other 6 keys present)`, () => {
        const partial = { ...allSevenKeys };
        delete (partial as Record<string, number>)[missingKey];
        expect(() => getBreakpointFromWidth(partial, 500)).toThrowError(EErrorMessage.INVALID_BREAKPOINT);
      });
    }
  });
});

const columns: IColumns = {
  xxl: 16,
  xl: 12,
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4,
  xxs: 2,
};

describe(`getColsFromBreakpoint tests`, () => {
  it(`Should throw error when breakpoint is not found`, () => {
    expect(() => getColsFromBreakpoint('invalid', columns)).toThrowError(EErrorMessage.INVALID_BREAKPOINT_NOT_FOUND);
  });

  it(`Should throw error when breakpoint is empty`, () => {
    expect(() => getColsFromBreakpoint(``, columns)).toThrowError(EErrorMessage.INVALID_BREAKPOINT);
  });

  it(`Should return 'columns.sm' for breakpoint sm`, () => {
    const colNum = getColsFromBreakpoint('sm', columns);
    expect(colNum).toBe(columns.sm);
  });
});
