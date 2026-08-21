import { TLayout } from '../layout-definition';
import { getAllStaticGridItems } from '@/core/common/helpers/grid-item-type-helpers';
import { getFirstCollision } from '@/core/gridlayout/helpers/collision-helper';
import { moveToCorrectPlace } from '@/core/gridlayout/helpers/move-helper';

/**
 * Given a layout, make sure all elements fit within its bounds.
 *
 * @param     {TLayout}  layout             Layout array.
 * @param     {Number}  bounds              Number of columns.
 * @param     {Boolean} distributeEvenly    Enforces that a grid item is moved all the way to left/right when there is available space for it
 * @returns   {TLayout}                     The new adjusted layout.
 */
export function correctBounds(layout: TLayout, bounds: { cols: number }, distributeEvenly: boolean): TLayout {
  const collidesWith = getAllStaticGridItems(layout);
  const staticItem = getAllStaticGridItems(layout);
  for(let i = 0, len = staticItem.length; i < len; i++) {
    // move static item first
    // try not move their y
    while (staticItem[i].x + staticItem[i].w > bounds.cols || getFirstCollision(staticItem, staticItem[i])) {
      // Moving to the left
      staticItem[i].x -= 1;
    }
  }

  for(let i = 0, len = layout.length; i < len; i++) {
    const l = layout[i];

    if(distributeEvenly) {
      // Fix for issue: https://github.com/gwinnem/vue-responsive-grid-layout/issues/2
      // it's not static, and it's out of layout
      if(!collidesWith.includes(l) && l.x + l.w > bounds.cols) {
        moveToCorrectPlace(l, bounds, collidesWith);
      }
    } else if(!distributeEvenly) {
      // Overflows right, move item to the left
      if(l.x + l.w > bounds.cols) {
        l.x = bounds.cols - l.w;
      }
    }
    // Overflows left — reachable both from directly-negative input and as
    // a side effect of the overflow-right correction above, when an
    // item's own `w` exceeds the *new* breakpoint's column count (see
    // tests/responsive-utils.spec.ts and docs/REFACTORING.md #54 — a
    // stale `// TODO ... this is not being triggered` comment sat here
    // since 2023 until this was actually confirmed one way or the other).
    if(l.x < 0) {
      l.x = 0;
      /**
       * Bug fix: this used to be commented out ("this will cause
       * incorrect width when drag item from outside"), leaving `l.w`
       * completely unadjusted whenever an item's own `w` exceeded the
       * *new* breakpoint's column count — confirmed, deliberate
       * behavior at the time (see the test this replaces, in
       * `tests/responsive-utils.spec.ts`), not an overlooked edge case.
       * In practice this meant an item could render far wider than its
       * own grid's measured container at a narrow breakpoint (e.g. an
       * item at `w: 6` staying at `w: 6` when the breakpoint shrinks to
       * `cols: 2`), with nothing correcting it — confirmed directly via
       * a real, reproduced case, not a hypothetical: a 6-wide item
       * rendering hugely oversized inside a simulated 2-column, ~370px
       * container.
       *
       * Clamped down to `bounds.cols` now, same as the position
       * correction above already does — but never below the item's own
       * `minW` (if set): squeezing an item narrower than its own stated
       * floor would silently violate a constraint the item's own author
       * set for a reason (e.g. a minimum width its content actually
       * needs to render sensibly). When `minW` itself exceeds
       * `bounds.cols`, `l.w` intentionally stays at `minW` — wider than
       * the breakpoint's own column count — which is exactly the
       * signal `GridLayout`'s own root needs to grow past its
       * measured container and let a scrollbar handle the rest, rather
       * than the item silently breaking layout with no visual escape
       * hatch at all.
       */
      l.w = Math.max(l.w > bounds.cols ? bounds.cols : l.w, l.minW ?? 1);
    }

    if(!l.isStatic) {
      collidesWith.push(l);
    }
    // this will cause the item which is real static be moved
    // else {
    //   // If this is static and collides with other statics, we must move it down.
    //   // We have to do something nicer than just letting them overlap.
    //   while (getFirstCollision(collidesWith, l)) {
    //     l.y++;
    //   }
    // }
  }
  return layout;
}
