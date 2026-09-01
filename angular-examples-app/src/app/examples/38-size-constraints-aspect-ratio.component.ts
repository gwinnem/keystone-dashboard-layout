import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0, minW: 2, maxW: 5, minH: 2, maxH: 4 },
  { h: 2, i: '1', w: 2, x: 3, y: 0 },
  { h: 2, i: '2', w: 3, x: 5, y: 0 },
];

const labels: Record<string, string | undefined> = {
  '0': 'w: 2-5, h: 2-4',
  '1': 'aspect locked',
};

@Component({
  selector: 'app-size-constraints-aspect-ratio-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item
          [i]="item.i"
          [x]="item.x"
          [y]="item.y"
          [w]="item.w"
          [h]="item.h"
          [minW]="item.minW ?? 1"
          [maxW]="item.maxW ?? Infinity"
          [minH]="item.minH ?? 1"
          [maxH]="item.maxH ?? Infinity"
          [preserveAspectRatio]="item.i === '1'"
        >
          <div class="size-constraints-item">{{ labels[item.i] ?? item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .size-constraints-item {
      align-items: center;
      background: var(--kg-panel);
      border: 1px solid var(--kg-line-light);
      border-radius: 8px;
      color: var(--kg-text-hi-light);
      display: flex;
      font-family: var(--kg-font-mono);
      font-size: 11px;
      height: 100%;
      justify-content: center;
      padding: 0 8px;
      text-align: center;
      width: 100%;
    }
  `],
})
export class SizeConstraintsAspectRatioDemoComponent {
  readonly labels = labels;
  readonly Infinity = Infinity;
  layout: TLayout = initialLayout;
}
