import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { ExampleToggleComponent } from '../harness/example-toggle.component';
import { ExampleNumberFieldComponent } from '../harness/example-number-field.component';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 2, x: 0, y: 0 },
  { h: 2, i: '1', w: 2, x: 2, y: 0 },
  { h: 2, i: '2', w: 2, x: 4, y: 0 },
];

@Component({
  selector: 'app-border-radius-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleToggleComponent, ExampleNumberFieldComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <example-toggle [checked]="useBorderRadius" (checkedChange)="useBorderRadius = $event" label="useBorderRadius"></example-toggle>
      <example-number-field [value]="borderRadiusPx" (valueChange)="borderRadiusPx = $event" label="borderRadiusPx" [min]="0" [max]="40"></example-number-field>
    </div>

    <kdl-grid-layout
      [borderRadiusPx]="borderRadiusPx"
      [colNum]="12"
      [layout]="layout"
      (layoutChange)="layout = $event"
      [rowHeight]="60"
      [showGridLines]="true"
      [useBorderRadius]="useBorderRadius"
    >
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="border-radius-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .border-radius-item {
      align-items: center;
      background: var(--kg-panel);
      border: 1px solid var(--kg-line-light);
      border-radius: inherit;
      color: var(--kg-text-hi-light);
      display: flex;
      font-family: var(--kg-font-mono);
      height: 100%;
      justify-content: center;
      width: 100%;
    }
  `],
})
export class BorderRadiusDemoComponent {
  useBorderRadius = true;
  borderRadiusPx = 16;
  layout: TLayout = initialLayout;
}
