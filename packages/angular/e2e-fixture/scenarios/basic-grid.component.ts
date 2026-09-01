import { Component } from '@angular/core';
import { GridItemComponent } from '../../src/lib/grid-item.component';
import { GridLayoutComponent } from '../../src/lib/grid-layout.component';
import type { TLayout } from 'keystone-dashboard-layout-core';

/** A minimal, static 3-item layout — the simplest possible render/mount smoke test. */
@Component({
  imports: [GridLayoutComponent, GridItemComponent],
  selector: `app-basic-grid`,
  standalone: true,
  template: `
    <kdl-grid-layout style="display: block; width: 100%" [layout]="layout" [rowHeight]="80" (layoutChange)="layout = $event">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="fixture-item-content">{{ 'Item ' + item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
})
export class BasicGridComponent {
  layout: TLayout = [
    { h: 2, i: `0`, w: 3, x: 0, y: 0 },
    { h: 2, i: `1`, w: 3, x: 3, y: 0 },
    { h: 2, i: `2`, w: 3, x: 6, y: 0 },
  ];
}
