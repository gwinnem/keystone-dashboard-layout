import { setTopLeft, setTopRight, setTransform, setTransformRtl } from '@/core/helpers/utils';

/**
 * Where an item sits inside the grid container, in pixels. `left` is
 * set for left-to-right rendering and `right` for right-to-left
 * (`isMirrored`), never both.
 */
export interface IPositionStyleInput {
  /** Distance from the container's top edge. */
  top: number;
  /** Distance from the left edge. Set when `rtl` is `false`. */
  left?: number;
  /** Distance from the right edge. Set when `rtl` is `true`. */
  right?: number;
  width: number;
  height: number;
  /** Whether the item is rendered right-to-left. */
  rtl: boolean;
}

/**
 * Decides how an item is placed inside the grid: which inline style
 * puts it at its pixel position, and which CSS class (if any) goes on
 * the item alongside it. Pass one to `GridLayout`'s `positionStrategy`
 * prop to replace the built-in choice between CSS transforms and
 * `top`/`left`.
 *
 * @example
 * ```ts
 * // Position with CSS `inset` instead of `top`/`left`.
 * const insetStrategy: IPositionStrategy = {
 *   type: 'inset',
 *   getStyle: ({ top, left, right, width, height, rtl }) => ({
 *     position: 'absolute',
 *     inset: rtl ? `${top}px ${right}px auto auto` : `${top}px auto auto ${left}px`,
 *     width: `${width}px`,
 *     height: `${height}px`,
 *   }),
 * };
 * ```
 */
export interface IPositionStrategy {
  /** A short, descriptive name — informational only (e.g. for logging). */
  readonly type: string;
  /**
   * A CSS class added to every item while this strategy is active.
   * The built-in transform strategy uses `css-transforms`, which the
   * stylesheet relies on to animate position changes.
   */
  readonly className?: string;
  /**
   * Returns the inline style for an item at the given position. Keep
   * `width` and `height` as plain `NNpx` strings: the grid reads them
   * back from the style to report container resizes.
   */
  getStyle(position: IPositionStyleInput): Record<string, string | number>;
}

/**
 * The default: positions items with `transform: translate3d(...)`,
 * which the browser can animate without re-laying-out the page.
 * Behind `useCssTransforms: true`.
 */
export const transformStrategy: IPositionStrategy = {
  className: `css-transforms`,
  getStyle: ({ top, left, right, width, height, rtl }) =>
    (rtl ? setTransformRtl(top, right as number, width, height) : setTransform(top, left as number, width, height)) as unknown as Record<string, string | number>,
  type: `transform`,
};

/**
 * Positions items with absolute `top`/`left` (`top`/`right` when
 * mirrored). Slower to animate than {@link transformStrategy}, but it
 * does not create a containing block for fixed-position descendants.
 * Behind `useCssTransforms: false`.
 */
export const topLeftStrategy: IPositionStrategy = {
  getStyle: ({ top, left, right, width, height, rtl }) =>
    (rtl ? setTopRight(top, right as number, width, height) : setTopLeft(top, left as number, width, height)) as unknown as Record<string, string | number>,
  type: `top-left`,
};

/**
 * The strategy a grid uses when no `positionStrategy` is given: the
 * one matching the `useCssTransforms` flag, exactly as before this
 * option existed.
 */
export function getPositionStrategy(useCssTransforms: boolean): IPositionStrategy {
  return useCssTransforms ? transformStrategy : topLeftStrategy;
}
