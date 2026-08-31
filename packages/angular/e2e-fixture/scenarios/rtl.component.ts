import { Component } from '@angular/core';
import { GridItemComponent } from '../../src/lib/grid-item.component';
import { GridLayoutComponent } from '../../src/lib/grid-layout.component';
import type { TLayout } from '@keystone-dashboard-layout/core';

/**
 * Real-browser coverage for `isMirrored` (RTL) — dragging and resizing
 * a mirrored item, exercising the actual native pointer-driven engine
 * against real, mirrored CSS layout (`right`-anchored positioning via
 * `setTransformRtl`/`setTopRight`). The unit suite already covers the
 * underlying math directly; this exists because the Vue port's own
 * history found the RTL resize edge-anchor swap specifically was a
 * real bug only ever caught by driving an actual browser drag/resize
 * in both directions and checking the real screen-space bounding box
 * (see `packages/angular/e2e/rtl.spec.ts`, ported from the identical
 * Vue/React tests).
 */
@Component({
  imports: [GridLayoutComponent, GridItemComponent],
  selector: `app-rtl`,
  standalone: true,
  template: `
    <div data-testid="rtl-wrap">
      <kdl-grid-layout style="display: block; width: 100%" [colNum]="12" [isMirrored]="true" [layout]="layout" [rowHeight]="80" (layoutChange)="layout = $event">
        @for (item of layout; track item.i) {
          <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
            <div class="fixture-item-content">{{ 'Item ' + item.i }}</div>
          </kdl-grid-item>
        }
      </kdl-grid-layout>
    </div>
  `,
})
export class RtlComponent {
  layout: TLayout = [{ h: 2, i: `0`, w: 3, x: 4, y: 0 }];
}
