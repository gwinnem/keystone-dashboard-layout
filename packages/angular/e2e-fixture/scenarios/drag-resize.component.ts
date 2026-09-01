import { Component } from '@angular/core';
import { GridItemComponent } from '../../src/lib/grid-item.component';
import { GridLayoutComponent } from '../../src/lib/grid-layout.component';
import type { TLayout } from 'keystone-dashboard-layout-core';

/**
 * Two draggable/resizable items with default settings — a real
 * pointerdown/move/up sequence exercises the native drag/resize engine
 * end to end (`keystone-dashboard-layout-core`'s own
 * `createNativeDraggable`/`createNativeResizable`), not a test-only
 * backdoor. Item "0" has plenty of room to move/grow into; item "1"
 * exists so a drag/resize that collides has something real to collide
 * with.
 */
@Component({
  imports: [GridLayoutComponent, GridItemComponent],
  selector: `app-drag-resize`,
  standalone: true,
  template: `
    <kdl-grid-layout style="display: block; width: 100%" [layout]="layout" [rowHeight]="80" [colNum]="12" (layoutChange)="layout = $event">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="fixture-item-content">{{ 'Item ' + item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
})
export class DragResizeComponent {
  layout: TLayout = [
    { h: 2, i: `0`, w: 2, x: 0, y: 0 },
    { h: 2, i: `1`, w: 2, x: 8, y: 0 },
  ];
}
