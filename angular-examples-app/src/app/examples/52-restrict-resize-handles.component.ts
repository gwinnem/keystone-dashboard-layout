import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';
import type { TResizeHandle } from 'keystone-dashboard-layout-core';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 4, y: 0 },
];

const resizeHandlesByItem: Record<string, TResizeHandle[]> = {
  '0': ['se'],
  '1': ['e', 'w'],
};

@Component({
  selector: 'app-restrict-resize-handles-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent],
  template: `
    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showGridLines]="true" [showResizeHandles]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" [resizeHandles]="resizeHandlesByItem[item.i]">
          <div class="restrict-handles-item">{{ item.i === '0' ? 'only se' : 'only e/w' }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
  styles: [`
    .restrict-handles-item {
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
      width: 100%;
    }
  `],
})
export class RestrictResizeHandlesDemoComponent {
  readonly resizeHandlesByItem = resizeHandlesByItem;
  layout: TLayout = initialLayout;
}
