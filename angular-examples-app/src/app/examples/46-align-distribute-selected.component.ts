import { Component, ViewChild } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';

const initialLayout: TLayout = [
  { h: 2, i: 'a', w: 2, x: 0, y: 0 },
  { h: 2, i: 'b', w: 3, x: 3, y: 2 },
  { h: 2, i: 'c', w: 2, x: 7, y: 1 },
  { h: 2, i: 'd', w: 2, x: 5, y: 4 },
];

@Component({
  selector: 'app-align-distribute-selected-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent],
  template: `
    <div class="demo-controls">
      <span class="demo-description">Selected: {{ selectedItems.length ? selectedItems.join(', ') : 'none' }}</span>
      <button class="demo-btn" type="button" (click)="grid.alignSelected('left')">Align left</button>
      <button class="demo-btn" type="button" (click)="grid.alignSelected('center-x')">Align center-x</button>
      <button class="demo-btn" type="button" (click)="grid.alignSelected('right')">Align right</button>
      <button class="demo-btn" type="button" (click)="grid.alignSelected('top')">Align top</button>
      <button class="demo-btn demo-btn--ghost" type="button" (click)="grid.distributeSelected('horizontal')">Distribute horizontal</button>
      <button class="demo-btn demo-btn--ghost" type="button" (click)="grid.distributeSelected('vertical')">Distribute vertical</button>
    </div>

    <kdl-grid-layout #grid [compactType]="ECompactType.NONE" [layout]="layout" [multiSelect]="true" (layoutChange)="layout = $event" (selectionChanged)="selectedItems = $event" [rowHeight]="60" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
})
export class AlignDistributeSelectedDemoComponent {
  @ViewChild('grid') grid!: GridLayoutComponent;
  readonly ECompactType = ECompactType;
  layout: TLayout = initialLayout;
  selectedItems: (string | number)[] = [];
}
