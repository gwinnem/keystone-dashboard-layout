import { TLayout } from '../../layout-definition';

/**
 * Computes every item id in the contiguous range between `anchorId` and
 * `targetId`, inclusive of both — the standard Shift-click
 * range-selection gesture (file explorers, spreadsheets, most desktop
 * multi-select UIs). "Contiguous" here means by `layout`'s own array
 * order, not by screen position — the same proxy for "document order"
 * every framework package's own rendering already uses (`v-for`,
 * `.map()`, an Angular `@for`), so a Shift-click range visually spans
 * exactly the items rendered between the anchor and the target, in
 * every one of this project's three framework ports, without needing
 * three separate (and potentially inconsistent) "what does 'between'
 * mean" definitions.
 *
 * Deliberately order-independent from the caller's own perspective:
 * `anchorId` doesn't need to come before `targetId` in the layout
 * array — Shift-clicking "backwards" (toward an item earlier in the
 * layout than the anchor) is just as valid a range as clicking
 * forward, and produces the same set of ids either way (anchor and
 * target swapped has no effect on the result).
 *
 * @param layout The full layout array, in its own current order.
 * @param anchorId The range's own starting point — typically the last item selected without Shift (see each framework port's own `multiSelect` click-handling for how this is tracked).
 * @param targetId The item the range extends to — typically the one just Shift-clicked.
 * @return Every id from `anchorId` to `targetId` inclusive, in layout order. Falls back to `[targetId]` alone if either id doesn't match a real layout entry — a range with no valid anchor/target to span isn't a real range at all, and selecting just the clicked item is the least surprising fallback (matching what a plain, non-Shift click would have done).
 */
export function computeRangeSelection(
  layout: TLayout,
  anchorId: string | number,
  targetId: string | number,
): (string | number)[] {
  const anchorIndex = layout.findIndex(item => item.i === anchorId);
  const targetIndex = layout.findIndex(item => item.i === targetId);
  if(anchorIndex === -1 || targetIndex === -1) {
    return [targetId];
  }

  const startIndex = Math.min(anchorIndex, targetIndex);
  const endIndex = Math.max(anchorIndex, targetIndex);
  return layout.slice(startIndex, endIndex + 1).map(item => item.i);
}
