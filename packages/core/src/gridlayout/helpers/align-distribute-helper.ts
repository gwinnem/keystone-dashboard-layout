import { ILayoutItem, TLayout } from '../../layout-definition';

/**
 * Which edge/center of the anchor item (the first id in the selection,
 * by convention — see `computeAlignAdjustments`'s own doc comment) every
 * other selected item aligns to.
 */
export type TAlignEdge = 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y';

/** Which axis `computeDistributeAdjustments` spaces items evenly along. */
export type TDistributeAxis = 'horizontal' | 'vertical';

/**
 * Computes the x/y adjustment every selected item *other than the
 * anchor* needs to align with the anchor's own edge/center. The anchor
 * — the first id in `itemIds`, by convention (a `multiSelect` selection
 * is a `Set`, which iterates in insertion order, so "first id" means
 * "first item the user actually selected," not an arbitrary one) —
 * never moves and is never included in the returned map at all: this
 * computes "align everything else to it," not "average everyone
 * together."
 *
 * Only the axis `edge` actually affects is included per item (`x` for
 * `left`/`right`/`center-x`, `y` for `top`/`bottom`/`center-y`) — a
 * left-alignment command has no opinion about anything's `y` at all.
 * Center alignment is rounded to the nearest whole grid unit, since a
 * grid layout has no way to represent a fractional coordinate.
 *
 * @param layout The entire grid layout — only entries matching `itemIds` are read; nothing outside the selection is considered or returned.
 * @param itemIds The selected item ids, anchor first.
 * @param edge Which edge/center to align to.
 * @return A map from item id to its adjustment — only entries that actually need to move are present; an item already exactly aligned isn't included, and neither is the anchor itself or any id in `itemIds` that doesn't match a real layout entry.
 */
export function computeAlignAdjustments(
  layout: TLayout,
  itemIds: (string | number)[],
  edge: TAlignEdge,
): Map<string | number, { x?: number; y?: number }> {
  const result = new Map<string | number, { x?: number; y?: number }>();
  if(itemIds.length < 2) {
    return result;
  }

  const [anchorId, ...restIds] = itemIds;
  const anchor = layout.find(item => item.i === anchorId);
  if(!anchor) {
    return result;
  }

  restIds.forEach(id => {
    const item = layout.find(entry => entry.i === id);
    if(!item) {
      return;
    }

    switch(edge) {
      case `left`: {
        if(item.x !== anchor.x) {
          result.set(id, { x: anchor.x });
        }
        break;
      }
      case `right`: {
        const targetX = anchor.x + anchor.w - item.w;
        if(item.x !== targetX) {
          result.set(id, { x: targetX });
        }
        break;
      }
      case `top`: {
        if(item.y !== anchor.y) {
          result.set(id, { y: anchor.y });
        }
        break;
      }
      case `bottom`: {
        const targetY = anchor.y + anchor.h - item.h;
        if(item.y !== targetY) {
          result.set(id, { y: targetY });
        }
        break;
      }
      case `center-x`: {
        const targetX = Math.round(anchor.x + anchor.w / 2 - item.w / 2);
        if(item.x !== targetX) {
          result.set(id, { x: targetX });
        }
        break;
      }
      case `center-y`: {
        const targetY = Math.round(anchor.y + anchor.h / 2 - item.h / 2);
        if(item.y !== targetY) {
          result.set(id, { y: targetY });
        }
        break;
      }
    }
  });

  return result;
}

/**
 * Computes new x/y for every selected item *except the first and last*
 * (sorted by position along `axis`), spacing the gaps between them
 * evenly across the exact span those first and last items already
 * define — the standard design-tool "distribute" behavior (Figma,
 * Sketch, etc.): the two outermost items are the fixed reference frame,
 * not moved themselves; only what's "in between" gets redistributed.
 * Needs at least 3 selected items to mean anything at all — with only
 * 2, there's nothing in between to redistribute, and this returns an
 * empty map rather than a no-op adjustment for either of them.
 *
 * @param layout The entire grid layout — only entries matching `itemIds` are read.
 * @param itemIds The selected item ids — order doesn't matter here (unlike `computeAlignAdjustments`), since this sorts by actual position itself.
 * @param axis Which axis to distribute along — `horizontal` spaces `x`, `vertical` spaces `y`.
 * @return A map from item id to its adjustment, for every item strictly between the first and last once sorted — never includes the first/last items themselves, or the anchor concept at all (there isn't one here).
 */
export function computeDistributeAdjustments(
  layout: TLayout,
  itemIds: (string | number)[],
  axis: TDistributeAxis,
): Map<string | number, { x?: number; y?: number }> {
  const result = new Map<string | number, { x?: number; y?: number }>();

  const items = itemIds
    .map(id => layout.find(entry => entry.i === id))
    .filter((item): item is ILayoutItem => item !== undefined);

  if(items.length < 3) {
    return result;
  }

  const posKey = axis === `horizontal` ? `x` : `y`;
  const sizeKey = axis === `horizontal` ? `w` : `h`;
  const sorted = [...items].sort((a, b) => a[posKey] - b[posKey]);

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = (last[posKey] + last[sizeKey]) - first[posKey];
  const totalSize = sorted.reduce((sum, item) => sum + item[sizeKey], 0);
  // Can go negative if the selected items are collectively wider/taller
  // than the span between the first and last item's own edges (e.g.
  // three large items with very little room between the outermost
  // two) — applied as-is rather than clamped to 0, matching how design
  // tools handle this same edge case: the middle items end up
  // overlapping, which is an honest reflection of "there wasn't enough
  // room," not silently hidden by pretending there was.
  const gap = (span - totalSize) / (sorted.length - 1);

  let cursor = first[posKey] + first[sizeKey];
  for(let i = 1; i < sorted.length - 1; i++) {
    const item = sorted[i];
    const newPos = Math.round(cursor + gap);
    if(newPos !== item[posKey]) {
      result.set(item.i, axis === `horizontal` ? { x: newPos } : { y: newPos });
    }
    cursor = newPos + item[sizeKey];
  }

  return result;
}
