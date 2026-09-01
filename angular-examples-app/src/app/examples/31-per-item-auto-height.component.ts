import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 4, x: 0, y: 0 },
];

@Component({
  selector: 'app-per-item-auto-height-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <button class="demo-btn" type="button" (click)="addLine()">+ Add a line</button>
      <button class="demo-btn demo-btn--ghost" type="button" (click)="removeLine()">- Remove a line</button>
    </div>

    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="30" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" [autoHeight]="true">
          <div class="auto-height-item">
            @for (line of lines; track $index) {
              <p>{{ line }}</p>
            }
          </div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .demo-btn--ghost {
      background: transparent;
      border: 1px solid var(--kg-line-light);
      color: var(--kg-text-hi-light);
    }
    .auto-height-item {
      background: var(--kg-panel);
      border: 1px solid var(--kg-line-light);
      border-radius: 8px;
      color: var(--kg-text-hi-light);
      font-family: var(--kg-font-mono);
      font-size: 12px;
      padding: 10px 12px;
      width: 100%;
    }
    .auto-height-item p {
      margin: 0 0 4px;
    }
  `],
})
export class PerItemAutoHeightDemoComponent {
  layout: TLayout = initialLayout;
  lines = ['One line of content.'];

  addLine(): void {
    this.lines = [...this.lines, `Line ${this.lines.length + 1} of content.`];
  }

  removeLine(): void {
    if (this.lines.length > 1) {
      this.lines = this.lines.slice(0, -1);
    }
  }
}
