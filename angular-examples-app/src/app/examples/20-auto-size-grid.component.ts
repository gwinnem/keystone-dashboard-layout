import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 6, x: 0, y: 0 },
  { h: 2, i: '1', w: 6, x: 6, y: 0 },
];

@Component({
  selector: 'app-auto-size-grid-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <button class="demo-btn" type="button" (click)="addRow()">+ Add row</button>
      <button class="demo-btn demo-btn--ghost" type="button" (click)="removeRow()">- Remove row</button>
    </div>

    <kdl-grid-layout [autoSize]="true" [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="50" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .demo-btn {
      background: var(--kg-blueprint);
      border: none;
      border-radius: 6px;
      color: white;
      cursor: pointer;
      font-family: var(--kg-font-mono);
      font-size: 12px;
      padding: 6px 12px;
    }
    .demo-btn--ghost {
      background: transparent;
      border: 1px solid var(--kg-line-light);
      color: var(--kg-text-hi-light);
    }
  `],
})
export class AutoSizeGridDemoComponent {
  layout: TLayout = initialLayout;
  private nextRow = 1;

  addRow(): void {
    const y = this.layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
    this.layout = [...this.layout, { h: 2, i: `row-${this.nextRow}`, w: 12, x: 0, y }];
    this.nextRow += 1;
  }

  removeRow(): void {
    if (this.layout.length > 1) {
      this.layout = this.layout.slice(0, -1);
    }
  }
}
