import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: 'a', w: 3, x: 0, y: 0 },
  { h: 2, i: 'b', w: 3, x: 3, y: 0 },
  { h: 2, i: 'c', w: 3, x: 6, y: 0 },
  { h: 2, i: 'd', w: 3, x: 0, y: 2, isStatic: true, maxW: 3 },
];

@Component({
  selector: 'app-multi-select-group-move-resize-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <span class="demo-description">Selected: {{ selectedItems.length ? selectedItems.join(', ') : 'none' }}</span>
      <span class="demo-description">Try it: select two items, then Tab to one and press an arrow key — the other moves too.</span>
    </div>

    <kdl-grid-layout
      [compactType]="ECompactType.NONE"
      [layout]="layout"
      [multiSelect]="true"
      (layoutChange)="layout = $event"
      (selectionChanged)="selectedItems = $event"
      [rowHeight]="80"
      [showGridLines]="true"
      [showResizeHandles]="true"
    >
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" [isStatic]="item.isStatic ?? false" [maxW]="item.maxW ?? Infinity">
          <div class="example-item">{{ item.i }}{{ item.i === 'd' ? ' (static)' : '' }}</div>
          <ng-template #resizeHandle let-edge>
            <span class="resize-dot" [title]="edge">⤡</span>
          </ng-template>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .resize-dot {
      color: var(--kg-amber-deep);
      font-size: 10px;
      user-select: none;
    }
  `],
})
export class MultiSelectGroupMoveResizeDemoComponent {
  readonly ECompactType = ECompactType;
  readonly Infinity = Infinity;
  layout: TLayout = initialLayout;
  selectedItems: (string | number)[] = [];
}
