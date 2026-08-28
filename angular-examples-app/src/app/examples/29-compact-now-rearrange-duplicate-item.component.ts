import { Component, ViewChild } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import { ECompactType } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

// compactType: NONE — without this, the default vertical compaction
// would re-run on every external layout change (including scatter's
// own random repositioning below) and immediately re-tidy everything
// right back, leaving no visible gap for compactNow() to demonstrably
// fix at all.
const initialLayout: TLayout = [
  { h: 2, i: 'a', w: 3, x: 0, y: 0 },
  { h: 2, i: 'b', w: 3, x: 3, y: 0 },
  { h: 2, i: 'c', w: 3, x: 6, y: 0 },
  { h: 2, i: 'd', w: 3, x: 9, y: 0 },
];

@Component({
  selector: 'app-compact-now-rearrange-duplicate-item-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <button class="demo-btn" type="button" (click)="scatter()">Scatter (leaves gaps)</button>
      <button class="demo-btn" type="button" (click)="grid.compactNow()">Tidy up (compactNow)</button>
      <button class="demo-btn demo-btn--ghost" type="button" (click)="grid.duplicateItem('a')">Duplicate item "a"</button>
    </div>

    <kdl-grid-layout
      #grid
      [colNum]="12"
      [compactType]="compactType"
      [layout]="layout"
      (layoutChange)="layout = $event"
      [rowHeight]="60"
      [showCloseButton]="true"
      [showGridLines]="true"
    >
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" (removeItem)="removeItem($event)">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
})
export class CompactNowRearrangeDuplicateItemDemoComponent {
  readonly compactType = ECompactType.NONE;
  @ViewChild('grid') grid!: GridLayoutComponent;
  layout: TLayout = initialLayout;

  scatter(): void {
    this.layout = this.layout.map((item) => ({
      ...item,
      x: Math.floor(Math.random() * 9),
      y: Math.floor(Math.random() * 6),
    }));
  }

  removeItem(id: string | number): void {
    this.layout = this.layout.filter((item) => item.i !== id);
  }
}
