import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';

const initialLayout: TLayout = [
  { h: 3, i: 'pinned', w: 4, x: 4, y: 0, zIndex: 10 },
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 8, y: 0 },
];

@Component({
  selector: 'app-per-item-z-index-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent],
  template: `
    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" [zIndex]="item.zIndex ?? null">
          <div class="example-item" [class.example-item--pinned]="item.i === 'pinned'">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
  styles: [`
    .example-item--pinned {
      background: var(--kg-amber);
      border-color: var(--kg-amber-deep);
      color: #2b1b02;
      font-weight: 600;
    }
  `],
})
export class PerItemZIndexDemoComponent {
  layout: TLayout = initialLayout;
}
