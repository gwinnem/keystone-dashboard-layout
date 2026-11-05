import type { TLayout } from '../../layout-definition';
import type { IPositionStyleInput } from './position-strategy';

/** What the maximized item is measured against: the grid's content box, and the gap kept around the item. */
export interface IMaximizedPositionInput {
  /** Width of the grid container in pixels. */
  containerWidth: number;
  /** Height of the grid container in pixels — the grid's own height, not the viewport's. */
  containerHeight: number;
  /** `[horizontal, vertical]` margin in pixels, kept free on every side like the gap between ordinary items. */
  margin: readonly number[];
  /** Whether the grid renders right-to-left (`isMirrored`). */
  rtl: boolean;
}

/**
 * The id that may be maximized: `id` when the layout has an item with that id, otherwise `null`. A grid uses this so a
 * maximized id that no longer exists (the item was removed, a different layout was loaded) cannot hide every other item.
 *
 * @param layout The grid's layout.
 * @param id     The id asked to be maximized, or `null`/`undefined` for "none".
 * @return `id` if it matches a layout entry, else `null`.
 */
export function resolveMaximizedItem(layout: TLayout, id: string | number | null | undefined): string | number | null {
  // `null` and `undefined` match no entry, so "none" needs no check of its own.
  const match = layout.find(item => item.i === id);
  return match === undefined ? null : match.i;
}

/**
 * Where the maximized item sits: the whole container minus one margin on each side, so it lines up with where ordinary
 * items start. Never smaller than 1×1 px, so a not-yet-measured container cannot produce a zero or negative size.
 * Returns the same shape a position strategy takes, so it goes straight into `IPositionStrategy.getStyle`.
 *
 * @param input Container size, margin and direction.
 * @return Pixel position and size of the maximized item.
 */
export function calcMaximizedPosition(input: IMaximizedPositionInput): IPositionStyleInput {
  const [marginX, marginY] = input.margin;
  const position: IPositionStyleInput = {
    height: Math.max(1, input.containerHeight - marginY * 2),
    rtl: input.rtl,
    top: marginY,
    width: Math.max(1, input.containerWidth - marginX * 2),
  };
  if(input.rtl) {
    position.right = marginX;
  } else {
    position.left = marginX;
  }
  return position;
}
