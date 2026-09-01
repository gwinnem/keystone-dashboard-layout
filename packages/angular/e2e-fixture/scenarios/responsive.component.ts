import { Component } from '@angular/core';
import { GridItemComponent } from '../../src/lib/grid-item.component';
import { GridLayoutComponent } from '../../src/lib/grid-layout.component';
import type { TLayout } from 'keystone-dashboard-layout-core';

/** Real-browser coverage for `responsive` — a viewport resize genuinely resolving a different breakpoint's own column count, not a mocked container-width value. Mirrors the Vue/React packages' own identical `responsive` fixture. */
@Component({
  imports: [GridLayoutComponent, GridItemComponent],
  selector: `app-responsive`,
  standalone: true,
  template: `
    <div data-testid="responsive-wrap">
      <kdl-grid-layout style="display: block; width: 100%" [layout]="layout" [responsive]="true" [rowHeight]="80" (layoutChange)="layout = $event">
        @for (item of layout; track item.i) {
          <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
            <div class="fixture-item-content">{{ 'Item ' + item.i }}</div>
          </kdl-grid-item>
        }
      </kdl-grid-layout>
    </div>
  `,
})
export class ResponsiveComponent {
  layout: TLayout = [
    { h: 2, i: `0`, w: 2, x: 0, y: 0 },
    { h: 2, i: `1`, w: 2, x: 2, y: 0 },
  ];
}
