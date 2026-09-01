import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent, GridItemHeaderDirective } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';

const initialLayout: TLayout = [
  { h: 3, i: '0', w: 4, x: 0, y: 0 },
  { h: 3, i: '1', w: 4, x: 4, y: 0 },
];

@Component({
  selector: 'app-custom-header-slot-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, GridItemHeaderDirective],
  template: `
    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="item-header" kdlGridItemHeader>{{ item.i }} — header</div>
          <div class="item-body">
            @for (n of [1, 2, 3, 4]; track n) {
              <p>Body content line {{ n }} — scrolls internally if the item is too short to fit everything.</p>
            }
          </div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
  styles: [`
    .item-header {
      background: var(--kg-blueprint);
      color: white;
      font-family: var(--kg-font-mono);
      font-size: 12px;
      font-weight: 600;
      padding: 8px 12px;
    }
    .item-body {
      background: var(--kg-panel);
      color: var(--kg-text-hi-light);
      font-size: 11px;
      padding: 8px 12px;
    }
    .item-body p {
      margin: 0 0 6px;
    }
  `],
})
export class CustomHeaderSlotDemoComponent {
  layout: TLayout = initialLayout;
}
