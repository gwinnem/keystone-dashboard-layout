import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: 'anchor', w: 4, x: 0, y: 0, isStatic: true },
  { h: 2, i: '1', w: 2, x: 4, y: 0 },
  { h: 2, i: '2', w: 2, x: 6, y: 0 },
];

@Component({
  selector: 'app-static-items-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showCloseButton]="true" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" [isStatic]="item.isStatic ?? false">
          <div class="example-item" [class.example-item--static]="item.i === 'anchor'">
            {{ item.i === 'anchor' ? 'locked in place' : item.i }}
          </div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
})
export class StaticItemsDemoComponent {
  layout: TLayout = initialLayout;
}
