import { Component } from '@angular/core';
import { GridItemComponent } from '../../src/lib/grid-item.component';
import { GridLayoutComponent } from '../../src/lib/grid-layout.component';
import type { TLayout } from 'keystone-dashboard-layout-core';

/** Three items, each with the built-in maximize button — what the focus and Escape tests click. */
@Component({
  imports: [GridLayoutComponent, GridItemComponent],
  selector: `app-maximize`,
  standalone: true,
  template: `
    <kdl-grid-layout style="display: block; width: 100%" [colNum]="12" [layout]="layout" [rowHeight]="80" [showMaximizeButton]="true" (layoutChange)="layout = $event">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="fixture-item-content">{{ 'Item ' + item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
})
export class MaximizeComponent {
  layout: TLayout = [
    { h: 2, i: `0`, w: 4, x: 0, y: 0 },
    { h: 2, i: `1`, w: 4, x: 4, y: 0 },
    { h: 2, i: `2`, w: 4, x: 8, y: 0 },
  ];
}
