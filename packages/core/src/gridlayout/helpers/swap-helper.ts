import { getAllCollisions, getFirstCollision } from '@/core/gridlayout/helpers/collision-helper';
import { ILayoutItem, TLayout } from '../../layout-definition';

/**
 * How a dragged item resolves a collision with another item: `'push'` (the
 * default) moves the item it lands on out of the way; `'swap'` puts the two
 * items in each other's places.
 */
export type TCollisionMode = 'push' | 'swap';

/** Where the item being dragged started, and the item it has swapped out of the way for the moment (if any). */
export interface ISwapDragState {
  /**
   * The item last swapped into the dragged item's starting cell, with where it came from — put back on the next tick. Held
   * by id, not by reference, since a framework that clones the layout on every drag tick hands each tick fresh objects.
   */
  displaced: { i: ILayoutItem['i']; moved: boolean | undefined; x: number; y: number } | null;
  originX: number;
  originY: number;
}

/** Captures the dragged item's starting position — call once, at `dragstart`. */
export const createSwapDragState = (item: ILayoutItem): ISwapDragState => ({
  displaced: null,
  originX: item.x,
  originY: item.y,
});

/**
 * Tries to resolve one drag tick as a swap. Call it instead of `moveElement` while `collisionMode` is `'swap'`.
 *
 * It first puts back whatever the previous tick swapped away, so dragging across several items never leaves a trail of
 * displaced ones. Then it places `l` at `(x, y)`; if that lands on exactly one non-static item, and that item fits in `l`'s
 * starting cell without touching anything else, the two trade places and this returns `true` (the layout is already
 * updated — nothing more to do).
 *
 * Otherwise it returns `false` with `l` left where it was, and the caller falls back to the normal push via
 * `moveElement`. That covers: no collision at all (a plain move), several collisions, a static item, an item too wide for
 * the starting cell, and a swap that would leave the two overlapping (a drag that has not yet cleared the other item).
 *
 * @param layout  Full layout (mutated in place, like `moveElement`).
 * @param l       The item being dragged.
 * @param x       Target X in grid units.
 * @param y       Target Y in grid units.
 * @param cols    Column count — a swapped-in item must still fit within it.
 * @param state   From `createSwapDragState`, kept for the whole drag.
 */
export function swapElement(layout: TLayout, l: ILayoutItem, x: number, y: number, cols: number, state: ISwapDragState): boolean {
  if(state.displaced !== null) {
    const { i, moved, x: fromX, y: fromY } = state.displaced;
    const displaced = layout.find(entry => entry.i === i);
    if(displaced !== undefined) {
      displaced.x = fromX;
      displaced.y = fromY;
      displaced.moved = moved;
    }
    state.displaced = null;
  }

  if(l.isStatic || x < 0 || y < 0) {
    return false;
  }

  const oldX = l.x;
  const oldY = l.y;
  l.x = x;
  l.y = y;

  const collisions = getAllCollisions(layout, l);
  const target = collisions.length === 1 ? collisions[0] : undefined;

  if(target !== undefined && !target.isStatic) {
    const fromX = target.x;
    const fromY = target.y;
    const fromMoved = target.moved;
    target.x = state.originX;
    target.y = state.originY;

    if(target.x + target.w <= cols && getFirstCollision(layout, target) === undefined) {
      target.moved = true;
      l.moved = true;
      state.displaced = { i: target.i, moved: fromMoved, x: fromX, y: fromY };
      return true;
    }

    target.x = fromX;
    target.y = fromY;
  }

  l.x = oldX;
  l.y = oldY;
  return false;
}
