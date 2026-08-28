import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
];

@Component({
  selector: 'app-custom-drag-placeholder-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
      <ng-template #placeholder let-placeholder>
        <div class="custom-placeholder">
          drop at x:{{ placeholder.x }} y:{{ placeholder.y }}
        </div>
      </ng-template>
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .custom-placeholder {
      align-items: center;
      color: var(--kg-amber-deep);
      display: flex;
      font-family: var(--kg-font-mono);
      font-size: 11px;
      height: 100%;
      justify-content: center;
      width: 100%;
    }
  `],
})
export class CustomDragPlaceholderDemoComponent {
  layout: TLayout = initialLayout;
}
