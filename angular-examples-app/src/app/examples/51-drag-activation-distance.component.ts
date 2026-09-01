import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
];

@Component({
  selector: 'app-drag-activation-distance-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent],
  template: `
    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" [dragActivationDistance]="item.i === '1' ? 40 : null">
          <div class="drag-activation-item">{{ item.i === '1' ? '40px threshold' : 'default (3px)' }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
  styles: [`
    .drag-activation-item {
      align-items: center;
      background: var(--kg-panel);
      border: 1px solid var(--kg-line-light);
      border-radius: 8px;
      color: var(--kg-text-hi-light);
      display: flex;
      font-family: var(--kg-font-mono);
      font-size: 11px;
      height: 100%;
      justify-content: center;
      text-align: center;
      width: 100%;
    }
  `],
})
export class DragActivationDistanceDemoComponent {
  layout: TLayout = initialLayout;
}
