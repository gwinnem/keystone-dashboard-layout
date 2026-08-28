import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { ExampleToggleComponent } from '../harness/example-toggle.component';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 2, x: 0, y: 0 },
  { h: 2, i: '1', w: 2, x: 2, y: 8 },
  { h: 2, i: '2', w: 2, x: 0, y: 16 },
];

@Component({
  selector: 'app-auto-scroll-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleToggleComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <example-toggle [checked]="autoScroll" (checkedChange)="autoScroll = $event" label="autoScroll"></example-toggle>
    </div>

    <div class="scroll-frame">
      <kdl-grid-layout [colNum]="6" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showGridLines]="true">
        @for (item of layout; track item.i) {
          <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" [autoScroll]="autoScroll">
            <div class="example-item">{{ item.i }}</div>
          </kdl-grid-item>
        }
      </kdl-grid-layout>
    </div>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .scroll-frame {
      height: 300px;
      overflow-y: auto;
    }
  `],
})
export class AutoScrollDemoComponent {
  autoScroll = true;
  layout: TLayout = initialLayout;
}
