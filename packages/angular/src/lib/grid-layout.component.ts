import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { getBottomYCoordinate } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';

/**
 * Phase 1 of the Angular port (see `docs/IMPLEMENTATION_PLAN.md`) — a
 * static, correctly-positioned grid container.
 *
 * **Architecture note, corrected from an earlier draft of this file**:
 * this component does *not* own a `@for` loop rendering
 * `GridItemComponent` internally. Matching how Vue (`<GridLayout>
 * <GridItem v-for="item in layout" ...>` — the consumer's own template
 * owns the loop) and React (`{layout.map(item => <GridItem ...>)}` —
 * same thing) both actually work, the *consumer* renders each
 * `GridItemComponent` themselves, with whatever distinct content each
 * one needs, as a child of `<kdl-grid-layout>`; this component only
 * measures its own container width and projects that content through
 * via `<ng-content>`. An internal loop here would have only been able
 * to project one single block of `<ng-content>` into *every* iteration
 * identically — there's no way for Angular's content projection to
 * repeat distinct projected content once per loop iteration the way a
 * template-owned `@for` naturally can — so it was corrected here before
 * being carried into a real build.
 *
 * `GridItemComponent`'s own `containerWidth`/`colNum`/`rowHeight`/
 * `margin` are still direct `@Input()`s in this phase (Phase 2 replaces
 * this with `GridEventBusService` DI, per `docs/PARITY_GAP_ANGULAR.md`)
 * — until then, a consumer wires them from this component's own public
 * `containerWidth` via a template reference variable, e.g.:
 *
 * ```html
 * <kdl-grid-layout #grid [layout]="layout" [rowHeight]="150">
 *   @for (item of layout; track item.i) {
 *     <kdl-grid-item
 *       [colNum]="grid.colNum"
 *       [containerWidth]="grid.containerWidth"
 *       [h]="item.h" [i]="item.i" [margin]="grid.margin"
 *       [rowHeight]="grid.rowHeight" [w]="item.w" [x]="item.x" [y]="item.y"
 *     >{{ item.i }}</kdl-grid-item>
 *   }
 * </kdl-grid-layout>
 * ```
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: `kdl-grid-layout`,
  },
  imports: [NgStyle],
  selector: `kdl-grid-layout`,
  standalone: true,
  template: `
    <div #container [ngStyle]="containerStyle">
      <ng-content></ng-content>
    </div>
  `,
})
export class GridLayoutComponent implements AfterViewInit, OnChanges, OnDestroy {
  /** The layout array — used here only for `autoSize`'s own container-height calculation; rendering each item is the consumer's own responsibility (see this class's own doc comment). Required. */
  @Input({ required: true }) layout!: TLayout;
  /** Maximum number of columns. Default `12`, matching Vue/React's own default. */
  @Input() colNum = 12;
  /** Height of one grid row, in pixels. Default `150`, matching Vue/React's own default. */
  @Input() rowHeight = 150;
  /** `[horizontal, vertical]` spacing between items, in pixels. Default `[10, 10]`, matching Vue/React's own default. */
  @Input() margin: [number, number] = [10, 10];
  /** Positions via CSS `transform: translate3d(...)` instead of `top`/`left`. Default `true`, matching Vue/React's own default. */
  @Input() useCssTransforms = true;
  /**
   * Grows/shrinks the container to fit the layout's content — Phase
   * 1's own narrower stand-in for the full `heightMode`/`autoSize`
   * precedence rule Vue/React both implement (see
   * `docs/PARITY_GAP_ANGULAR.md`'s own prop inventory); ported in a
   * later phase once the rest of that prop surface lands. Default
   * `true`, matching `autoSize`'s own default.
   */
  @Input() autoSize = true;

  @ViewChild(`container`, { static: true }) private readonly containerRef!: ElementRef<HTMLDivElement>;

  /** The measured container pixel width — public so a consumer can wire it into each `GridItemComponent` via a template reference variable in this phase (see this class's own doc comment); Phase 2 replaces that manual wiring with DI. */
  containerWidth = 0;
  containerStyle: Record<string, string> = { position: `relative` };

  private resizeObserver: ResizeObserver | undefined;

  constructor(private readonly changeDetectorRef: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    const el = this.containerRef.nativeElement;
    const measure = (): void => {
      if(el.offsetWidth > 0 && el.offsetWidth !== this.containerWidth) {
        this.containerWidth = el.offsetWidth;
        this.updateContainerHeight();
        // `OnPush` needs an explicit signal here — this measurement
        // happens outside any `@Input()` change or template event
        // `OnPush` would otherwise pick up on its own, the same
        // discipline React's port needed for a `setState` call outside
        // a synthetic event handler (see
        // `docs/PARITY_GAP_ANGULAR.md`'s own architecture-mapping
        // table).
        this.changeDetectorRef.markForCheck();
      }
    };
    measure();
    this.resizeObserver = new ResizeObserver(measure);
    this.resizeObserver.observe(el);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes[`layout`] || changes[`rowHeight`] || changes[`margin`] || changes[`autoSize`]) {
      this.updateContainerHeight();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private updateContainerHeight(): void {
    if(!this.autoSize) {
      this.containerStyle = { position: `relative` };
      return;
    }
    const [, marginV] = this.margin;
    const height = getBottomYCoordinate(this.layout) * (this.rowHeight + marginV) + marginV;
    this.containerStyle = { height: `${height}px`, position: `relative` };
  }
}
