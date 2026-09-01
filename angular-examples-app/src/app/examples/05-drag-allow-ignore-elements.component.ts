import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0, dragAllowFrom: '.drag-handle' },
  { h: 2, i: '1', w: 3, x: 3, y: 0, dragIgnoreFrom: '.no-drag' },
];

@Component({
  selector: 'app-drag-allow-ignore-elements-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="70" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="example-item">
            @if (item.i === '0') {
              <div class="drag-handle">drag here</div>
            }
            <div class="item-body">
              {{ item.i }}
              @if (item.i === '1') {
                <button class="no-drag no-drag-btn" type="button" (click)="$event.stopPropagation()">not draggable</button>
              }
            </div>
          </div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
})
export class DragAllowIgnoreElementsDemoComponent {
  layout: TLayout = initialLayout;
}
