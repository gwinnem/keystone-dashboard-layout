import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import { findFirstFitSlot } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { ExampleToggleComponent } from '../harness/example-toggle.component';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const colNum = 12;

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
];

@Component({
  selector: 'app-add-remove-items-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleToggleComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <example-toggle
        [checked]="appendToFirstRow"
        label="Add to end of first row (instead of a new row)"
        (checkedChange)="appendToFirstRow = $event"
      />
      <button class="demo-btn" type="button" (click)="addItem()">+ Add item</button>
      <button class="demo-btn demo-btn--ghost" type="button" (click)="layout = []">Clear all</button>
    </div>

    <kdl-grid-layout
      [colNum]="colNum"
      [layout]="layout"
      (layoutChange)="layout = $event"
      [rowHeight]="60"
      [showCloseButton]="true"
      [showGridLines]="true"
    >
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" (removeItem)="removeItem($event)">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .demo-controls {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
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

    .demo-btn--ghost {
      background: transparent;
      border: 1px solid var(--kg-line-light);
      color: var(--kg-text-hi-light);
    }

    .example-item {
      align-items: center;
      background: var(--kg-panel);
      border: 1px solid var(--kg-line-light);
      border-radius: 8px;
      color: var(--kg-text-hi-light);
      display: flex;
      font-family: var(--kg-font-mono);
      height: 100%;
      justify-content: center;
      width: 100%;
    }
  `],
})
export class AddRemoveItemsDemoComponent {
  colNum = colNum;
  layout: TLayout = initialLayout;
  appendToFirstRow = false;
  private nextId = 2;

  /**
   * A real first-fit bin-pack, ported directly from the previous
   * VitePress-based docs site's own identical example (confirmed via a
   * direct source read, including that file's own two documented bug
   * fixes below — not re-derived from scratch): appending with `x:0,
   * y:0` (or `y: Infinity`, the simpler convention this package's other
   * examples use) and letting compaction settle it is the normal
   * pattern, but it never *reuses a gap* left by a removed item — a new
   * item always lands in a fresh row at the bottom even when there's
   * clearly room higher up. `findFirstFitSlot` (this package's own
   * exported helper — the same one `allowCrossGridDrag`'s own accept
   * side uses) scans row by row from the top, column by column from the
   * left, for the first open gap instead.
   */
  addItem(): void {
    const newItem = { h: 2, i: String(this.nextId), w: 3, x: 0, y: 0 };
    this.nextId += 1;

    if (this.appendToFirstRow) {
      const firstRowItems = this.layout.filter((item) => item.y === 0);
      // Bug fix (ported from the same source): the rightmost occupied
      // edge (max of x+w across first-row items), not the sum of every
      // first-row item's own width — summing only equals "the first
      // free column" when the row is packed with no gaps at all;
      // removing an item from the middle of a full first row (not the
      // end) leaves the sum unchanged, landing the new item on top of
      // whatever's still sitting at the old rightmost edge instead of
      // in the actual gap this toggle exists to fill.
      const rightmostEdge = firstRowItems.reduce((max, item) => Math.max(max, item.x + item.w), 0);
      if (rightmostEdge + newItem.w <= colNum) {
        newItem.x = rightmostEdge;
        this.layout = [...this.layout, newItem];
        return;
      }
      // First row is full — fall through to the general bin-pack below.
    }

    const slot = findFirstFitSlot(this.layout, colNum, newItem.w, newItem.h);
    newItem.x = slot.x;
    newItem.y = slot.y;
    this.layout = [...this.layout, newItem];
  }

  removeItem(id: string | number): void {
    this.layout = this.layout.filter((item) => item.i !== id);
  }
}
