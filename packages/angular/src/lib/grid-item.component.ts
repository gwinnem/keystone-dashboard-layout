import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NgStyle } from '@angular/common';
import { calcColWidth, calcGridItemWH, setTopLeft, setTransform } from '@keystone-dashboard-layout/core';
import type { ITopLeftStyle, ITransformStyle } from '@keystone-dashboard-layout/core';

/**
 * Phase 1 of the Angular port (see `docs/IMPLEMENTATION_PLAN.md`) —
 * position/size rendering only. No drag, no resize, no compaction, no
 * parent/child DI wiring yet (`containerWidth`/`colNum`/`rowHeight`/
 * `margin` are direct `@Input()`s here so this component is
 * independently testable before Phase 2 wires them up automatically
 * from a parent `GridLayoutComponent` via `GridEventBusService` — see
 * `docs/PARITY_GAP_ANGULAR.md`'s own architecture-mapping table).
 *
 * Deliberately reuses `@keystone-dashboard-layout/core`'s own
 * `calcColWidth`/`calcGridItemWH`/`setTransform`/`setTopLeft` rather
 * than re-deriving the grid-unit-to-pixel math — the same shared,
 * framework-agnostic functions Vue's `useGridItemResize.ts` and React's
 * `GridItem.tsx` both already call. Those two functions compute
 * width/height and the final CSS style object respectively, but neither
 * computes the *top/left* pixel position from grid units on its own —
 * that one-line formula (`colOrRowSize * gridUnits + (gridUnits + 1) *
 * marginPx`, the position counterpart to `calcGridItemWH`'s own size
 * formula) is inlined the same way it already is in both Vue's and
 * React's own position-calculation code, since `core` doesn't currently
 * export a dedicated standalone function for just that half of the
 * calculation.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-grid-item-id]': 'i',
    class: `kdl-grid-item`,
  },
  imports: [NgStyle],
  selector: `kdl-grid-item`,
  standalone: true,
  template: `
    <div [ngStyle]="style">
      <ng-content></ng-content>
    </div>
  `,
})
export class GridItemComponent implements OnChanges {
  /** Unique identifier matching this item's entry in the parent `GridLayout`'s `layout` array. Required. */
  @Input({ required: true }) i!: string | number;
  /** Horizontal position, in grid column units. Required. */
  @Input({ required: true }) x!: number;
  /** Vertical position, in grid row units. Required. */
  @Input({ required: true }) y!: number;
  /** Width, in grid column units. Required. */
  @Input({ required: true }) w!: number;
  /** Height, in grid row units. Required. */
  @Input({ required: true }) h!: number;

  /**
   * The container's measured pixel width — a direct `@Input()` for
   * Phase 1's own standalone-testable scope; Phase 2 replaces this
   * with the `GridEventBusService`-driven cascade every other port
   * already uses (see `docs/IMPLEMENTATION_PLAN.md`).
   */
  @Input({ required: true }) containerWidth!: number;
  /** Number of columns in the grid. Default `12`, matching Vue/React's own default. */
  @Input() colNum = 12;
  /** Height of one grid row, in pixels. Default `150`, matching Vue/React's own default. */
  @Input() rowHeight = 150;
  /** `[horizontal, vertical]` spacing between items, in pixels. Default `[10, 10]`, matching Vue/React's own default. */
  @Input() margin: [number, number] = [10, 10];
  /** Positions via CSS `transform: translate3d(...)` instead of `top`/`left`. Default `true`, matching Vue/React's own default. */
  @Input() useCssTransforms = true;

  style: ITransformStyle | ITopLeftStyle | Record<string, string> = {};

  ngOnChanges(_changes: SimpleChanges): void {
    this.style = this.computeStyle();
  }

  private computeStyle(): ITransformStyle | ITopLeftStyle | Record<string, string> {
    // Guarded the same way Vue's/React's own equivalent calculation is
    // — `calcColWidth` throws on an unmeasured/zero container width,
    // which every instance of this component starts out as before its
    // own first real measurement arrives (in Phase 1's own standalone
    // scope, before that measurement ever happens automatically).
    if(!Number.isFinite(this.containerWidth) || this.containerWidth < 1) {
      return {};
    }

    const [marginH, marginV] = this.margin;
    const colWidth = calcColWidth(this.containerWidth, marginH, this.colNum);

    const width = calcGridItemWH(this.w, colWidth, marginH);
    const height = calcGridItemWH(this.h, this.rowHeight, marginV);
    const left = Math.round(colWidth * this.x + (this.x + 1) * marginH);
    const top = Math.round(this.rowHeight * this.y + (this.y + 1) * marginV);

    return this.useCssTransforms ? setTransform(top, left, width, height) : setTopLeft(top, left, width, height);
  }
}
