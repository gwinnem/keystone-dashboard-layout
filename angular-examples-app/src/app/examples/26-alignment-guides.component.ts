import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import { ECompactType } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { ExampleToggleComponent } from '../harness/example-toggle.component';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

// compactType: NONE — without this, the default vertical compaction
// actively fights against positioning items to test alignment: items
// would snap/settle after each drag rather than staying exactly where
// placed, making it hard to actually see two edges line up.
const initialLayout: TLayout = [
  { h: 2, i: '0', w: 2, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 4, y: 0 },
  { h: 2, i: '2', w: 2, x: 6, y: 4 },
];

@Component({
  selector: 'app-alignment-guides-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleToggleComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <example-toggle [checked]="showAlignmentGuides" (checkedChange)="showAlignmentGuides = $event" label="showAlignmentGuides"></example-toggle>
    </div>

    <kdl-grid-layout
      [colNum]="12"
      [compactType]="compactType"
      [layout]="layout"
      (layoutChange)="layout = $event"
      [rowHeight]="60"
      [showAlignmentGuides]="showAlignmentGuides"
      [showGridLines]="true"
    >
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
})
export class AlignmentGuidesDemoComponent {
  readonly compactType = ECompactType.NONE;
  showAlignmentGuides = true;
  layout: TLayout = initialLayout;
}
