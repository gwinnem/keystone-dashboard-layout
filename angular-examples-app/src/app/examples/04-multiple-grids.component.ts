import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

@Component({
  selector: 'app-multiple-grids-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <div class="grids-row">
      <div class="grid-column">
        <p class="grid-label">Grid A</p>
        <kdl-grid-layout [colNum]="6" [layout]="layoutA" (layoutChange)="layoutA = $event" [rowHeight]="60" [showGridLines]="true">
          @for (item of layoutA; track item.i) {
            <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
              <div class="example-item">{{ item.i }}</div>
            </kdl-grid-item>
          }
        </kdl-grid-layout>
      </div>
      <div class="grid-column">
        <p class="grid-label">Grid B</p>
        <kdl-grid-layout [colNum]="6" [layout]="layoutB" (layoutChange)="layoutB = $event" [rowHeight]="60" [showGridLines]="true">
          @for (item of layoutB; track item.i) {
            <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
              <div class="example-item">{{ item.i }}</div>
            </kdl-grid-item>
          }
        </kdl-grid-layout>
      </div>
    </div>

    <layout-json-viewer label="Grid A" [layout]="layoutA" />
    <layout-json-viewer label="Grid B" [layout]="layoutB" />
  `,
})
export class MultipleGridsDemoComponent {
  layoutA: TLayout = [
    { h: 2, i: 'a0', w: 3, x: 0, y: 0 },
    { h: 2, i: 'a1', w: 3, x: 3, y: 0 },
  ];
  layoutB: TLayout = [
    { h: 2, i: 'b0', w: 3, x: 0, y: 0 },
    { h: 2, i: 'b1', w: 3, x: 3, y: 0 },
  ];
}
