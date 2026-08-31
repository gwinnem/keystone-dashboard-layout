import { Component } from '@angular/core';
import { GridItemComponent } from '../../src/lib/grid-item.component';
import { GridLayoutComponent } from '../../src/lib/grid-layout.component';
import { ECompactType } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';

/**
 * Real-browser coverage for `multiSelect` — click/Ctrl+click selection
 * and the resulting group move, exercising the actual native
 * pointer-driven drag engine and real DOM click events, neither of
 * which the unit-test suite's own mocked native-handler backdoor or
 * synthetic `dispatchEvent` calls can stand in for. Mirrors the
 * Vue/React packages' own identical `multi-select` fixture.
 */
@Component({
  imports: [GridLayoutComponent, GridItemComponent],
  selector: `app-multi-select`,
  standalone: true,
  template: `
    <div data-testid="multi-select-wrap">
      <div data-testid="selected-count">{{ selectedCount }}</div>
      <kdl-grid-layout style="display: block; width: 100%" [colNum]="12" [compactType]="ECompactType.NONE" [layout]="layout" [multiSelect]="true" [rowHeight]="80" (layoutChange)="layout = $event" (selectionChanged)="selectedCount = $event.length">
        @for (item of layout; track item.i) {
          <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
            <div class="fixture-item-content">{{ 'Item ' + item.i }}</div>
          </kdl-grid-item>
        }
      </kdl-grid-layout>
    </div>
  `,
})
export class MultiSelectComponent {
  readonly ECompactType = ECompactType;

  layout: TLayout = [
    { h: 2, i: `0`, w: 3, x: 0, y: 0 },
    { h: 2, i: `1`, w: 3, x: 4, y: 0 },
    { h: 2, i: `2`, w: 3, x: 8, y: 0 },
  ];
  selectedCount = 0;
}
