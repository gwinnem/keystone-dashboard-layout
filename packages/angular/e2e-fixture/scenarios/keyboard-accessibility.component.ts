import { Component } from '@angular/core';
import { GridItemComponent } from '../../src/lib/grid-item.component';
import { GridLayoutComponent } from '../../src/lib/grid-layout.component';
import type { TLayout } from '@keystone-dashboard-layout/core';

/**
 * A single, plain draggable/resizable item with room to move/grow in
 * every direction — real keyboard focus + arrow-key/Shift+arrow-key
 * events exercise `GridItemComponent`'s own `handleKeydown`
 * (`moveByKeyboard`/`resizeByKeyboard`) end to end, not a synthetic
 * event dispatched directly at the component.
 */
@Component({
  imports: [GridLayoutComponent, GridItemComponent],
  selector: `app-keyboard-accessibility`,
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
export class KeyboardAccessibilityComponent {
  layout: TLayout = [{ h: 2, i: `0`, w: 3, x: 3, y: 3 }];
}
