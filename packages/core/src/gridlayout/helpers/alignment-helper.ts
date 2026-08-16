import { ILayoutItem, TLayout } from '../../layout-definition';

/**
 * A single alignment guide line to render: `axis: 'x'` is a vertical
 * line (the dragged item's left or right edge lines up with another
 * item's left or right edge, at grid-unit column `position`); `axis: 'y'`
 * is a horizontal line (top/bottom edges lining up, at grid-unit row
 * `position`).
 */
export interface IAlignmentGuide {
  axis: `x` | `y`;
  position: number;
}

/**
 * Finds edge alignments between `activeItem` (the item currently being
 * dragged or resized — its *live*, not-yet-committed position/size, since
 * this runs during `dragmove`/`resizemove`, not after) and every other
 * item in `layout`. An "alignment" is either item's left/right edge
 * (for a vertical guide) or top/bottom edge (for a horizontal guide)
 * landing on the exact same grid-unit coordinate as one of the other
 * item's edges — not collision/overlap (`collision-helper.ts` already
 * covers that separately), and not restricted to same-side matches
 * (the dragged item's left edge lining up with another item's *right*
 * edge is just as valid an alignment as left-to-left).
 *
 * Deliberately grid-unit-based, not pixel-based: two items whose edges
 * share a grid coordinate are aligned regardless of the current
 * `colWidth`/`rowHeight`/`margin` — those only affect where the guide
 * *renders*, not whether an alignment exists. Pixel conversion is the
 * caller's job (`GridLayout.vue`, which already has `calcColWidth`, etc.
 * available for it).
 *
 * @param layout The entire grid layout, including `activeItem` itself (filtered out by `i`, not assumed absent).
 * @param activeItem The item currently being dragged/resized, with its live (in-progress) `x`/`y`/`w`/`h`.
 * @return Every distinct alignment found, deduplicated by axis+position — if three other items all happen to share the same edge, that's one guide line, not three.
 */
export function findAlignmentGuides(layout: TLayout, activeItem: ILayoutItem): IAlignmentGuide[] {
  const activeLeft = activeItem.x;
  const activeRight = activeItem.x + activeItem.w;
  const activeTop = activeItem.y;
  const activeBottom = activeItem.y + activeItem.h;

  const xPositions = new Set<number>();
  const yPositions = new Set<number>();

  layout
    .filter(item => item.i !== activeItem.i)
    .forEach(item => {
      const otherLeft = item.x;
      const otherRight = item.x + item.w;
      const otherTop = item.y;
      const otherBottom = item.y + item.h;

      if(activeLeft === otherLeft || activeLeft === otherRight) {
        xPositions.add(activeLeft);
      }
      if(activeRight === otherLeft || activeRight === otherRight) {
        xPositions.add(activeRight);
      }
      if(activeTop === otherTop || activeTop === otherBottom) {
        yPositions.add(activeTop);
      }
      if(activeBottom === otherTop || activeBottom === otherBottom) {
        yPositions.add(activeBottom);
      }
    });

  const guides: IAlignmentGuide[] = [];
  xPositions.forEach(position => guides.push({ axis: `x`, position }));
  yPositions.forEach(position => guides.push({ axis: `y`, position }));
  return guides;
}

/**
 * A single distance-labeled spacing indicator between `activeItem` and
 * its nearest neighbor on one side — alongside `findAlignmentGuides`'s
 * edge-alignment lines, but a distinct concept: a gap size (e.g. "2
 * cols"/"1 row"), not an edge lining up with another edge. `gapStart`/
 * `gapEnd` are grid-unit coordinates on the relevant axis; `distance`
 * (`gapEnd - gapStart`) is the number a rendered label actually shows.
 */
export interface ISpacingIndicator {
  axis: `x` | `y`;
  gapStart: number;
  gapEnd: number;
  distance: number;
}

/**
 * Finds the nearest neighbor above/below/left/right of `activeItem` (the
 * item currently being dragged/resized, live position) and returns the
 * grid-unit gap to each one found — a labeled distance alongside the
 * existing edge/center alignment guides `findAlignmentGuides` already
 * provides. Deliberately nearest-neighbor only per side, not every item
 * on that side: `findAlignmentGuides`'s own all-matches approach
 * doesn't apply here — a distance label to every item on a side, not
 * just the closest one, would be visual noise, not useful feedback.
 *
 * Only considers a candidate whose own perpendicular-axis range
 * actually overlaps `activeItem`'s (e.g. for a left/right gap, the
 * candidate's own y-range must overlap `activeItem`'s y-range) —
 * otherwise an item that merely happens to sit further along the same
 * row/column, but isn't actually adjacent to `activeItem`, would get
 * reported as a "gap" when nothing about their relative layout suggests
 * they're related. A gap of exactly `0` (items already touching) is
 * excluded — there's no meaningful distance left to label at that
 * point.
 *
 * @param layout The entire grid layout, including `activeItem` itself (filtered out by `i`, not assumed absent).
 * @param activeItem The item currently being dragged/resized, with its live (in-progress) `x`/`y`/`w`/`h`.
 * @return Up to 4 indicators (one per side that actually has a qualifying neighbor) — empty if nothing qualifies on any side.
 */
export function findSpacingIndicators(layout: TLayout, activeItem: ILayoutItem): ISpacingIndicator[] {
  const activeLeft = activeItem.x;
  const activeRight = activeItem.x + activeItem.w;
  const activeTop = activeItem.y;
  const activeBottom = activeItem.y + activeItem.h;

  const others = layout.filter(item => item.i !== activeItem.i);
  const indicators: ISpacingIndicator[] = [];

  let bestLeft: number | undefined;
  others.forEach(item => {
    const otherRight = item.x + item.w;
    const otherTop = item.y;
    const otherBottom = item.y + item.h;
    const yOverlaps = otherTop < activeBottom && otherBottom > activeTop;
    if(yOverlaps && otherRight <= activeLeft && (bestLeft === undefined || otherRight > bestLeft)) {
      bestLeft = otherRight;
    }
  });
  if(bestLeft !== undefined && bestLeft < activeLeft) {
    indicators.push({ axis: `x`, distance: activeLeft - bestLeft, gapEnd: activeLeft, gapStart: bestLeft });
  }

  let bestRight: number | undefined;
  others.forEach(item => {
    const otherLeft = item.x;
    const otherTop = item.y;
    const otherBottom = item.y + item.h;
    const yOverlaps = otherTop < activeBottom && otherBottom > activeTop;
    if(yOverlaps && otherLeft >= activeRight && (bestRight === undefined || otherLeft < bestRight)) {
      bestRight = otherLeft;
    }
  });
  if(bestRight !== undefined && bestRight > activeRight) {
    indicators.push({ axis: `x`, distance: bestRight - activeRight, gapEnd: bestRight, gapStart: activeRight });
  }

  let bestTop: number | undefined;
  others.forEach(item => {
    const otherBottom = item.y + item.h;
    const otherLeft = item.x;
    const otherRight = item.x + item.w;
    const xOverlaps = otherLeft < activeRight && otherRight > activeLeft;
    if(xOverlaps && otherBottom <= activeTop && (bestTop === undefined || otherBottom > bestTop)) {
      bestTop = otherBottom;
    }
  });
  if(bestTop !== undefined && bestTop < activeTop) {
    indicators.push({ axis: `y`, distance: activeTop - bestTop, gapEnd: activeTop, gapStart: bestTop });
  }

  let bestBottom: number | undefined;
  others.forEach(item => {
    const otherTop = item.y;
    const otherLeft = item.x;
    const otherRight = item.x + item.w;
    const xOverlaps = otherLeft < activeRight && otherRight > activeLeft;
    if(xOverlaps && otherTop >= activeBottom && (bestBottom === undefined || otherTop < bestBottom)) {
      bestBottom = otherTop;
    }
  });
  if(bestBottom !== undefined && bestBottom > activeBottom) {
    indicators.push({ axis: `y`, distance: bestBottom - activeBottom, gapEnd: bestBottom, gapStart: activeBottom });
  }

  return indicators;
}

/**
 * A magnetic counterpart to `findAlignmentGuides` — `showAlignmentGuides`
 * is deliberately visual-only (shows where edges line up without
 * changing where the item actually lands); this is for `snapToGrid`,
 * which does change the landing position, once the pointer's dragged-to
 * position is within `threshold` grid units of an edge alignment with
 * another item.
 *
 * Reuses the same left/right/top/bottom edge comparisons
 * `findAlignmentGuides` does, generalized from "equal" to "within
 * threshold, and pick the closest" — deliberately a separate function
 * rather than a shared one parameterized by threshold=0 for exact
 * matching, since the two have different return shapes for different
 * purposes (`IAlignmentGuide[]`, every alignment found, for rendering
 * guide lines vs. a single best x/y adjustment here, for actually moving
 * the item) that would otherwise need awkward overloads to express.
 *
 * @param layout The entire grid layout, including `activeItem` itself (filtered out by `i`, not assumed absent).
 * @param activeItem The item's live, dragged-to (not yet committed) position/size.
 * @param threshold How close (in grid units) an edge needs to be to another item's edge to snap to it. `0` disables snapping entirely (nothing is ever "close enough").
 * @return `{ x, y }` — either key present only if that axis actually has a snap target within threshold; the axis's own value is the *item's* adjusted x/y (not the raw edge position), already accounting for which of the item's own edges (left vs right, top vs bottom) triggered the match. `{}` if nothing was within threshold on either axis.
 */
export function findSnapAdjustment(
  layout: TLayout,
  activeItem: ILayoutItem,
  threshold: number,
): { x?: number; y?: number } {
  if(threshold <= 0) {
    return {};
  }

  const activeLeft = activeItem.x;
  const activeRight = activeItem.x + activeItem.w;
  const activeTop = activeItem.y;
  const activeBottom = activeItem.y + activeItem.h;

  let bestXDistance = Infinity;
  let bestX: number | undefined;
  let bestYDistance = Infinity;
  let bestY: number | undefined;

  layout
    .filter(item => item.i !== activeItem.i)
    .forEach(item => {
      const otherLeft = item.x;
      const otherRight = item.x + item.w;
      const otherTop = item.y;
      const otherBottom = item.y + item.h;

      // For each of the active item's own edges, check both of the
      // other item's edges — matching findAlignmentGuides's own
      // left-to-either / right-to-either behavior — and, if within
      // threshold, compute what activeItem.x/y would need to be for
      // that specific edge to land exactly on the target.
      [
        { activeEdge: activeLeft, otherEdge: otherLeft, toX: (target: number): number => target },
        { activeEdge: activeLeft, otherEdge: otherRight, toX: (target: number): number => target },
        { activeEdge: activeRight, otherEdge: otherLeft, toX: (target: number): number => target - activeItem.w },
        { activeEdge: activeRight, otherEdge: otherRight, toX: (target: number): number => target - activeItem.w },
      ].forEach(({ activeEdge, otherEdge, toX }) => {
        const distance = Math.abs(activeEdge - otherEdge);
        if(distance <= threshold && distance < bestXDistance) {
          bestXDistance = distance;
          bestX = toX(otherEdge);
        }
      });

      [
        { activeEdge: activeTop, otherEdge: otherTop, toY: (target: number): number => target },
        { activeEdge: activeTop, otherEdge: otherBottom, toY: (target: number): number => target },
        { activeEdge: activeBottom, otherEdge: otherTop, toY: (target: number): number => target - activeItem.h },
        { activeEdge: activeBottom, otherEdge: otherBottom, toY: (target: number): number => target - activeItem.h },
      ].forEach(({ activeEdge, otherEdge, toY }) => {
        const distance = Math.abs(activeEdge - otherEdge);
        if(distance <= threshold && distance < bestYDistance) {
          bestYDistance = distance;
          bestY = toY(otherEdge);
        }
      });
    });

  const result: { x?: number; y?: number } = {};
  if(bestX !== undefined) {
    result.x = Math.max(bestX, 0);
  }
  if(bestY !== undefined) {
    result.y = Math.max(bestY, 0);
  }
  return result;
}
