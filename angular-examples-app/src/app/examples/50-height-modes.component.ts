import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';

type THeightMode = 'auto' | 'fixed' | 'scroll' | 'fit';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 3, i: '1', w: 3, x: 3, y: 0 },
  { h: 2, i: '2', w: 3, x: 0, y: 6 },
  { h: 2, i: '3', w: 3, x: 3, y: 8 },
];

@Component({
  selector: 'app-height-modes-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent],
  template: `
    <div class="demo-controls">
      <select class="demo-select" [value]="heightMode" (change)="onHeightModeChange($event)">
        <option value="auto">auto (grows to fit, default)</option>
        <option value="fixed">fixed (no explicit height)</option>
        <option value="scroll">scroll (fixed frame height, scrolls)</option>
        <option value="fit">fit (100% of parent, scrolls)</option>
      </select>
    </div>

    <div class="fixed-frame">
      <kdl-grid-layout [colNum]="6" [heightMode]="heightMode" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showGridLines]="true">
        @for (item of layout; track item.i) {
          <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
            <div class="example-item">{{ item.i }}</div>
          </kdl-grid-item>
        }
      </kdl-grid-layout>
    </div>
  `,
  styles: [`
    .demo-select {
      background: var(--kg-paper);
      border: 1px solid var(--kg-line-light);
      border-radius: 6px;
      color: var(--kg-text-hi-light);
      font-size: 13px;
      padding: 4px 8px;
    }
    .fixed-frame {
      border: 1px dashed var(--kg-line-light);
      height: 260px;
    }
  `],
})
export class HeightModesDemoComponent {
  heightMode: THeightMode = 'auto';
  layout: TLayout = initialLayout;

  onHeightModeChange(event: Event): void {
    this.heightMode = (event.target as HTMLSelectElement).value as THeightMode;
  }
}
