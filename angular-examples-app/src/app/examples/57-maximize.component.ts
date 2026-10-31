import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';

const defaultLayout = (): TLayout => [
  { h: 2, i: 'Revenue', w: 4, x: 0, y: 0 },
  { h: 2, i: 'Orders', w: 4, x: 4, y: 0 },
  { h: 2, i: 'Visitors', w: 4, x: 8, y: 0 },
  { h: 3, i: 'Latency', w: 6, x: 0, y: 2 },
  { h: 3, i: 'Errors', w: 6, x: 6, y: 2 },
];

@Component({
  selector: 'app-maximize-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent],
  template: `
    <div class="demo-controls">
      <button class="demo-btn" type="button" [disabled]="maximized === null" (click)="grid.restore()">Restore</button>
      <button class="demo-btn demo-btn--ghost" type="button" (click)="addItem()">Add item</button>
    </div>

    <kdl-grid-layout
      #grid
      [colNum]="12"
      [layout]="layout"
      [(maximizedItem)]="maximized"
      [rowHeight]="60"
      [showGridLines]="true"
      [showMaximizeButton]="true"
      (layoutChange)="layout = $event">
      @for (item of layout; track item.i) {
        <kdl-grid-item [h]="item.h" [i]="item.i" [w]="item.w" [x]="item.x" [y]="item.y">
          <div class="example-item">
            <strong>{{ item.i }}</strong>
            <span>{{ maximized === item.i ? 'Maximized — Escape or the button restores' : 'Use the button in the corner' }}</span>
          </div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <p class="demo-status">{{ statusText() }}</p>
  `,
  styles: [`
    .demo-controls {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px 20px;
      margin-bottom: 16px;
    }

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

    .demo-btn:disabled {
      cursor: default;
      opacity: 0.5;
    }

    .demo-btn--ghost {
      background: transparent;
      border: 1px solid var(--kg-line-light);
      color: var(--kg-text-hi-light);
    }

    .demo-status {
      color: var(--kg-text-lo-light);
      font-size: 12px;
      font-style: italic;
    }

    .example-item {
      align-items: center;
      background: var(--kg-panel);
      border: 1px solid var(--kg-line-light);
      border-radius: 8px;
      color: var(--kg-text-hi-light);
      display: flex;
      flex-direction: column;
      font-family: var(--kg-font-mono);
      gap: 4px;
      height: 100%;
      justify-content: center;
      width: 100%;
    }

    .example-item span {
      color: var(--kg-text-lo-light);
      font-size: 11px;
    }
  `],
})
export class MaximizeDemoComponent {
  layout: TLayout = defaultLayout();
  maximized: string | number | null = null;
  private nextId = 1;

  addItem(): void {
    // y: Infinity — "put it at the bottom, let compaction find the spot". Nothing is laid out while an item is
    // maximized, so the new card only lands once the grid is restored.
    this.layout = [...this.layout, { h: 2, i: `Extra ${this.nextId++}`, w: 4, x: 0, y: Infinity }];
  }

  statusText(): string {
    return this.maximized === null
      ? 'Nothing is maximized. Add an item to see where it lands.'
      : `maximizedItem = "${this.maximized}". Add an item now — it appears once you restore.`;
  }
}
