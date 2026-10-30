import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TCollisionMode, TLayout } from 'keystone-dashboard-layout-core';

@Component({
  selector: 'app-swap-on-drag-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent],
  template: `
    <div class="demo-controls">
      <label>
        Collision mode
        <select [value]="mode" (change)="mode = $any($event.target).value">
          <option value="swap">swap: trade places</option>
          <option value="push">push: shove aside (default)</option>
        </select>
      </label>
    </div>

    <kdl-grid-layout [colNum]="12" [collisionMode]="mode" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="swap-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
  styles: [`
    .demo-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
      margin-bottom: 16px;
    }

    .swap-item {
      align-items: center;
      background: var(--kg-panel);
      border: 1px solid var(--kg-line-light);
      border-radius: 8px;
      color: var(--kg-text-hi-light);
      display: flex;
      font-family: var(--kg-font-mono);
      font-size: 14px;
      height: 100%;
      justify-content: center;
      padding: 8px;
      text-align: center;
      width: 100%;
    }
  `],
})
export class SwapOnDragDemoComponent {
  mode: TCollisionMode = 'swap';

  // Equal-size tiles: dropping one on another always has a clean cell to swap into.
  layout: TLayout = [
    { h: 2, i: 'A', w: 4, x: 0, y: 0 },
    { h: 2, i: 'B', w: 4, x: 4, y: 0 },
    { h: 2, i: 'C', w: 4, x: 8, y: 0 },
    { h: 2, i: 'D', w: 4, x: 0, y: 2 },
    { h: 2, i: 'E', w: 4, x: 4, y: 2 },
    { h: 2, i: 'F', w: 4, x: 8, y: 2 },
  ];
}
