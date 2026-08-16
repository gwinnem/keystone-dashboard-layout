/**
 * The width (in pixels) at or above which each named breakpoint applies.
 * A `GridLayout` (in any framework implementation) picks the largest
 * breakpoint whose value is `<=` the measured container width. Defaults:
 * `{ xxl: 1600, xl: 1400, lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }`.
 */
export interface IBreakpoints {
  xxl: number;
  xl: number;
  lg: number;
  md: number;
  sm: number;
  xs: number;
  xxs: number;
}

/**
 * The number of grid columns to use at each breakpoint, when responsive
 * mode is enabled. Defaults:
 * `{ xxl: 12, xl: 12, lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }`.
 */
export interface IColumns {
  xxl: number;
  xl: number;
  lg: number;
  md: number;
  sm: number;
  xs: number;
  xxs: number;
}
