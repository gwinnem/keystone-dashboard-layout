import { Component } from '@angular/core';
import { GridItemComponent } from '../../src/lib/grid-item.component';
import { GridLayoutComponent } from '../../src/lib/grid-layout.component';
import type { TLayout } from '@keystone-dashboard-layout/core';

/**
 * Real-browser coverage for `allowCrossGridDrag` — dragging an
 * existing item from one live `kdl-grid-layout` into another. The
 * unit suite already covers the underlying accept/reject logic
 * directly, but never through an actual pointer-driven gesture
 * crossing real DOM boundaries between two independently-measured
 * containers. Mirrors the Vue/React packages' own identical
 * `cross-grid` fixture, including the same static "locked" item (a
 * real gap above it once "a0" leaves — needed for the bin-pack-not-
 * push-and-compact regression test) and grid B's own
 * `cross-grid-empty-target` class (its own real, confirmed necessity
 * explained in `style.css`).
 */
@Component({
  imports: [GridLayoutComponent, GridItemComponent],
  selector: `app-cross-grid`,
  standalone: true,
  template: `
    <div style="display: flex; gap: 16px">
      <div data-testid="cross-grid-a" style="border: 1px solid #ccc; min-height: 200px; width: 50%">
        <kdl-grid-layout style="display: block; width: 100%" [allowCrossGridDrag]="true" [colNum]="6" [layout]="layoutA" layoutId="grid-a" [rowHeight]="80" (layoutChange)="layoutA = $event">
          @for (item of layoutA; track item.i) {
            <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" [isStatic]="!!item.isStatic">
              <div class="fixture-item-content">{{ 'Item ' + item.i }}</div>
            </kdl-grid-item>
          }
        </kdl-grid-layout>
      </div>
      <div data-testid="cross-grid-b" style="border: 1px solid #ccc; min-height: 200px; width: 50%">
        <kdl-grid-layout style="display: block; width: 100%" [allowCrossGridDrag]="true" class="cross-grid-empty-target" [colNum]="6" [layout]="layoutB" layoutId="grid-b" [rowHeight]="80" (layoutChange)="layoutB = $event">
          @for (item of layoutB; track item.i) {
            <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
              <div class="fixture-item-content">{{ 'Item ' + item.i }}</div>
            </kdl-grid-item>
          }
        </kdl-grid-layout>
      </div>
    </div>
  `,
})
export class CrossGridComponent {
  layoutA: TLayout = [
    { h: 2, i: `a0`, w: 3, x: 0, y: 0 },
    // A static item in the same column, with a real gap between it
    // and "a0" once "a0" leaves — static items never move during
    // compaction (core's own compact functions all skip isStatic
    // items), so this gap persists regardless of compactType once
    // "a0" is dragged out.
    { h: 2, i: `locked`, isStatic: true, w: 3, x: 0, y: 2 },
  ];
  layoutB: TLayout = [];
}
