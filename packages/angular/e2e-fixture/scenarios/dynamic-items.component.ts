import { Component } from '@angular/core';
import { GridItemComponent } from '../../src/lib/grid-item.component';
import { GridLayoutComponent } from '../../src/lib/grid-layout.component';
import type { TLayout } from 'keystone-dashboard-layout-core';

/**
 * Adding/removing items via `y: Infinity` (vertical compaction resolves
 * the real row) — mirrors React's own `e2e-fixture/scenarios/
 * DynamicItems.tsx` exactly, including its own fixed `x: 0` placement
 * per new item (not a first-fit search), so the same relative-position
 * assertion pattern React's own `dynamic-items.spec.ts` uses (comparing
 * a new item's own bounding box against item "0"'s, rather than an
 * absolute page coordinate — see that spec file's own comment for why)
 * applies identically here.
 *
 * No manual compaction needed here — `GridLayoutComponent`'s own
 * `ngOnChanges` now auto-compacts any externally-driven `layout`
 * change (a real, confirmed feature-parity gap against Vue this fixed;
 * see that method's own doc comment), so pushing a new item with
 * `y: Infinity` and simply reassigning `layout` is enough, matching
 * Vue/React's own identically simple fixtures exactly.
 */
@Component({
  imports: [GridLayoutComponent, GridItemComponent],
  selector: `app-dynamic-items`,
  standalone: true,
  template: `
    <div data-testid="dynamic-items-wrap">
      <button data-testid="add-item" type="button" (click)="addItem()">Add item</button>
      <button data-testid="remove-item" type="button" (click)="removeLastItem()">Remove item</button>
      <kdl-grid-layout style="display: block; width: 100%" [layout]="layout" [rowHeight]="80" (layoutChange)="layout = $event">
        @for (item of layout; track item.i) {
          <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
            <div class="fixture-item-content">{{ 'Item ' + item.i }}</div>
          </kdl-grid-item>
        }
      </kdl-grid-layout>
    </div>
  `,
})
export class DynamicItemsComponent {
  layout: TLayout = [{ h: 2, i: `0`, w: 3, x: 0, y: 0 }];
  private nextId = 1;

  addItem(): void {
    this.layout = [...this.layout, { h: 2, i: String(this.nextId), w: 3, x: 0, y: Infinity }];
    this.nextId += 1;
  }

  removeLastItem(): void {
    this.layout = this.layout.slice(0, -1);
  }
}
