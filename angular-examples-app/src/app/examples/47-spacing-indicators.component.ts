import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { ExampleToggleComponent } from '../harness/example-toggle.component';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 3, i: '1', w: 3, x: 5, y: 2 },
  { h: 2, i: '2', w: 3, x: 8, y: 0 },
];

@Component({
  selector: 'app-spacing-indicators-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleToggleComponent],
  template: `
    <div class="demo-controls">
      <example-toggle [checked]="showSpacingGuides" (checkedChange)="showSpacingGuides = $event" label="showSpacingGuides"></example-toggle>
    </div>

    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showGridLines]="true" [showSpacingGuides]="showSpacingGuides">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
})
export class SpacingIndicatorsDemoComponent {
  showSpacingGuides = true;
  layout: TLayout = initialLayout;
}
