import { Component, ViewChild } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import { ECompactType } from '@keystone-dashboard-layout/core';
import type { ICompactor, TLayout } from '@keystone-dashboard-layout/core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

type TMode = 'vertical' | 'horizontal' | 'none' | 'vertical-overlap' | 'custom';

// A custom ICompactor — stacks every non-static item into a single
// left-hand column, one after another, ignoring x/width entirely.
// Deliberately dramatic/simple for clarity, not a realistic default.
const singleColumnCompactor: ICompactor = {
  type: 'single-column',
  compact(inputLayout) {
    let nextY = 0;
    return inputLayout.map((item) => {
      if (item.isStatic) return item;
      const positioned = { ...item, x: 0, y: nextY };
      nextY += item.h;
      return positioned;
    });
  },
};

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
  { h: 2, i: '2', w: 3, x: 6, y: 0 },
  { h: 2, i: '3', w: 3, x: 9, y: 0 },
];

@Component({
  selector: 'app-pluggable-compaction-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <select class="demo-select" [value]="mode" (change)="onModeChange($event)">
        <option value="vertical">compactType: vertical</option>
        <option value="horizontal">compactType: horizontal</option>
        <option value="none">compactType: none</option>
        <option value="vertical-overlap">compactType: vertical-overlap</option>
        <option value="custom">custom compactor: single column</option>
      </select>
      <button class="demo-btn" type="button" (click)="scatter()">Scatter</button>
      <button class="demo-btn demo-btn--ghost" type="button" (click)="grid.compactNow()">Tidy up (compactNow)</button>
    </div>

    <kdl-grid-layout #grid [colNum]="12" [compactor]="compactor" [compactType]="compactType" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .demo-select {
      background: var(--kg-paper);
      border: 1px solid var(--kg-line-light);
      border-radius: 6px;
      color: var(--kg-text-hi-light);
      font-size: 13px;
      padding: 4px 8px;
    }
    .demo-btn--ghost {
      background: transparent;
      border: 1px solid var(--kg-line-light);
      color: var(--kg-text-hi-light);
    }
  `],
})
export class PluggableCompactionDemoComponent {
  @ViewChild('grid') grid!: GridLayoutComponent;
  mode: TMode = 'vertical';
  layout: TLayout = initialLayout;
  compactType: ECompactType = ECompactType.VERTICAL;
  compactor: ICompactor | null = null;

  onModeChange(event: Event): void {
    this.mode = (event.target as HTMLSelectElement).value as TMode;
    switch (this.mode) {
      case 'horizontal':
        this.compactType = ECompactType.HORIZONTAL;
        break;
      case 'none':
        this.compactType = ECompactType.NONE;
        break;
      case 'vertical-overlap':
        this.compactType = ECompactType.VERTICAL_OVERLAP;
        break;
      default:
        this.compactType = ECompactType.VERTICAL;
    }
    this.compactor = this.mode === 'custom' ? singleColumnCompactor : null;
  }

  scatter(): void {
    this.layout = this.layout.map((item) => ({
      ...item,
      x: Math.floor(Math.random() * 9),
      y: Math.floor(Math.random() * 6),
    }));
  }
}
