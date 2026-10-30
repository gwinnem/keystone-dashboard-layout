import { ILayoutItem, TLayout } from '../../layout-definition';
import { compactLayout } from '@/core/helpers/utils';

/**
 * Upper bound on `x + w` the fast path will size its per-column
 * structures for. A layout reaching further than this is not a real
 * grid (real ones have 12-24 columns), so it takes the reference path
 * instead of allocating thousands of empty columns.
 */
const MAX_FAST_COLUMNS = 4096;

/**
 * The occupied rows of one grid column as a sorted list of disjoint,
 * non-touching `[top, bottom)` intervals, stored as two parallel
 * arrays so a binary search touches only plain numbers.
 */
interface IColumn {
  tops: number[];
  bottoms: number[];
}

/** Index of the first element `>= value` in an ascending array. */
function lowerBound(values: number[], value: number): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if(values[mid] < value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/** Index of the first element `> value` in an ascending array. */
function upperBound(values: number[], value: number): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if(values[mid] <= value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Marks rows `[top, bottom)` of a column as occupied, merging with any
 * interval it overlaps or touches so the list stays disjoint. The
 * common case — an item placed below everything already in the column
 * — appends without shifting anything.
 */
function occupy(column: IColumn, top: number, bottom: number): void {
  const lo = lowerBound(column.bottoms, top);
  const hi = upperBound(column.tops, bottom);
  if(lo >= hi) {
    column.tops.splice(lo, 0, top);
    column.bottoms.splice(lo, 0, bottom);
    return;
  }
  const mergedTop = Math.min(top, column.tops[lo]);
  const mergedBottom = Math.max(bottom, column.bottoms[hi - 1]);
  column.tops.splice(lo, hi - lo, mergedTop);
  column.bottoms.splice(lo, hi - lo, mergedBottom);
}

const isGridInteger = (value: number): boolean => Number.isInteger(value);

/**
 * The fast path only reproduces the reference algorithm for ordinary
 * grid data: integer coordinates, `w`/`h` of at least 1, `x >= 0`, and
 * (for non-static items) a `y` that is an integer or `Infinity` — the
 * documented "place this past everything" convention. Anything else
 * (fractional or `NaN` values, zero-size items, ...) is rare but legal
 * input to the reference compactor, so it is handed to that rather
 * than approximated.
 */
function isFastCompactible(layout: TLayout, minYs: number[]): boolean {
  for(let i = 0, len = layout.length; i < len; i++) {
    const item = layout[i];
    if(!isGridInteger(item.x) || !isGridInteger(item.w) || !isGridInteger(item.h) ||
      item.x < 0 || item.w < 1 || item.h < 1 || item.x + item.w > MAX_FAST_COLUMNS) {
      return false;
    }
    if(!isGridInteger(item.y) && (item.isStatic || item.y !== Infinity)) {
      return false;
    }
    if(!item.isStatic && !isGridInteger(minYs[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Vertical compaction with the same result as `compactLayout(layout, true,
 * minPositions)`, in roughly `O(n log n)` instead of `O(n²)`.
 *
 * The reference walks every item upward one row at a time, testing
 * each step against every item already placed. This version keeps, per
 * grid column, the sorted rows that are occupied (statics up front,
 * placed items as they land) and answers the same two questions with
 * binary searches:
 *
 * 1. How far does the item rise? Up to the first row where it would
 *    touch something, or to its `minPositions` floor, whichever is
 *    lower on the page.
 * 2. Where does it settle if it overlaps something there? At the first
 *    free row at or below that point.
 *
 * Like the reference, it processes items in row-then-column order,
 * works on the items it is given (mutating `y` and clearing `moved`),
 * and returns them in their original order.
 *
 * Input outside the ordinary integer-grid contract (see
 * {@link isFastCompactible}) is delegated to the reference
 * implementation, so the result never differs — only the speed does.
 */
export function compactLayoutFast(
  layout: TLayout,
  minPositions?: Record<string | number, { y?: number }>,
): TLayout {
  const minYs = layout.map(item => minPositions?.[item.i]?.y ?? 0);
  if(!isFastCompactible(layout, minYs)) {
    return compactLayout(layout, true, minPositions as Record<string | number, { y: number }> | undefined);
  }

  const columns: IColumn[] = [];
  const column = (index: number): IColumn => (columns[index] ??= { bottoms: [], tops: [] });

  // Statics are obstacles from the start, and also count towards the
  // row a non-finite `y` is clamped to.
  let maxBottom = 0;
  for(const item of layout) {
    if(item.isStatic) {
      maxBottom = Math.max(maxBottom, item.y + item.h);
      for(let c = item.x; c < item.x + item.w; c++) {
        occupy(column(c), item.y, item.y + item.h);
      }
    }
  }

  // Same visiting order as `sortLayoutItemsByRowCol` (stable), but over
  // indices so the output order needs no `indexOf` search.
  const order = layout.map((_, index) => index).sort((a, b) => {
    const itemA = layout[a];
    const itemB = layout[b];
    if(itemA.y === itemB.y && itemA.x === itemB.x) {
      return 0;
    }
    return itemA.y > itemB.y || (itemA.y === itemB.y && itemA.x > itemB.x) ? 1 : -1;
  });

  const out: TLayout = Array(layout.length);
  for(const index of order) {
    const item: ILayoutItem = layout[index];
    out[index] = item;
    item.moved = false;
    if(item.isStatic) {
      continue;
    }

    const { x, w, h } = item;
    const lastColumn = x + w - 1;
    const minY = minYs[index];
    // A non-finite `y` starts one row past everything placed so far.
    const startY = Number.isFinite(item.y) ? item.y : maxBottom;

    // Rise: the reference steps up while nothing collides and the item
    // is below its floor, so it stops at the nearest colliding row at or
    // above `startY`, or at the floor.
    let y = startY;
    if(startY > minY) {
      let nearestBlocked = -Infinity;
      for(let c = x; c <= lastColumn; c++) {
        const { tops, bottoms } = column(c);
        const last = lowerBound(tops, startY + h) - 1;
        if(last >= 0) {
          nearestBlocked = Math.max(nearestBlocked, Math.min(startY, bottoms[last] - 1));
        }
      }
      y = Math.max(minY, nearestBlocked);
    }

    // Settle: jump below whatever overlaps, until nothing does.
    for(;;) {
      let next = y;
      for(let c = x; c <= lastColumn; c++) {
        const { tops, bottoms } = column(c);
        const first = upperBound(bottoms, y);
        if(first < tops.length && tops[first] < y + h) {
          next = Math.max(next, bottoms[first]);
        }
      }
      if(next === y) {
        break;
      }
      y = next;
    }

    item.y = y;
    maxBottom = Math.max(maxBottom, y + h);
    for(let c = x; c <= lastColumn; c++) {
      occupy(column(c), y, y + h);
    }
  }
  return out;
}
