import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import { ECompactType } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { ExampleToggleComponent } from '../harness/example-toggle.component';
import { ExampleNumberFieldComponent } from '../harness/example-number-field.component';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

// compactType: NONE — without this, automatic vertical compaction
// would fight against the snapped position itself, potentially
// undoing/shifting the item right after snapToGrid places it.
const initialLayout: TLayout = [
  { h: 2, i: '0', w: 2, x: 0, y: 6 },
  { h: 2, i: '1', w: 8, x: 0, y: 0 },
];

@Component({
  selector: 'app-snap-to-grid-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleToggleComponent, ExampleNumberFieldComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <example-toggle [checked]="snapToGrid" (checkedChange)="snapToGrid = $event" label="snapToGrid"></example-toggle>
      <example-toggle [checked]="showGridLines" (checkedChange)="showGridLines = $event" label="showGridLines"></example-toggle>
      <example-number-field [value]="snapThreshold" (valueChange)="snapThreshold = $event" label="snapThreshold" [min]="0" [max]="4"></example-number-field>
    </div>

    <kdl-grid-layout
      [colNum]="12"
      [compactType]="compactType"
      [layout]="layout"
      (layoutChange)="layout = $event"
      [rowHeight]="60"
      [showGridLines]="showGridLines"
      [snapThreshold]="snapThreshold"
      [snapToGrid]="snapToGrid"
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
export class SnapToGridDemoComponent {
  readonly compactType = ECompactType.NONE;
  snapToGrid = true;
  snapThreshold = 2;
  showGridLines = true;
  layout: TLayout = initialLayout;
}
