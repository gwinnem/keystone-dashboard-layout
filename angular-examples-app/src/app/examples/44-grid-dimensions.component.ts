import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { ExampleNumberFieldComponent } from '../harness/example-number-field.component';
import { ExampleToggleComponent } from '../harness/example-toggle.component';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
  { h: 2, i: '2', w: 3, x: 6, y: 0 },
];

@Component({
  selector: 'app-grid-dimensions-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleNumberFieldComponent, ExampleToggleComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <example-number-field [value]="rowHeight" (valueChange)="rowHeight = $event" label="rowHeight" [min]="20" [max]="200"></example-number-field>
      <example-number-field [value]="colNum" (valueChange)="colNum = $event" label="colNum" [min]="2" [max]="24"></example-number-field>
      <example-number-field [value]="marginX" (valueChange)="marginX = $event" label="margin[0]" [min]="0" [max]="40"></example-number-field>
      <example-number-field [value]="marginY" (valueChange)="marginY = $event" label="margin[1]" [min]="0" [max]="40"></example-number-field>
      <example-toggle [checked]="showGridLines" (checkedChange)="showGridLines = $event" label="showGridLines"></example-toggle>
    </div>

    <kdl-grid-layout [colNum]="colNum" [layout]="layout" [margin]="[marginX, marginY]" (layoutChange)="layout = $event" [rowHeight]="rowHeight" [showGridLines]="showGridLines">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
})
export class GridDimensionsDemoComponent {
  rowHeight = 60;
  colNum = 12;
  marginX = 10;
  marginY = 10;
  showGridLines = true;
  layout: TLayout = initialLayout;
}
