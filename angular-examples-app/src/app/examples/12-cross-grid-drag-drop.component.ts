import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { ExampleToggleComponent } from '../harness/example-toggle.component';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

// `allowCrossGridDrag` needs to be set on *both* grids — toggling it
// off on either one confines dragging back to within that grid only,
// silently, with no error or event of any kind (a grid without this
// prop was never part of the cross-grid system in the first place).
// The target starts completely empty — given a min-height via CSS so
// there's still a reasonable drop target to aim for, since an
// actually-empty grid's own height would otherwise collapse to
// almost nothing.
const initialSourceLayout: TLayout = [
  { h: 2, i: 'a', w: 3, x: 0, y: 0 },
  { h: 2, i: 'b', w: 3, x: 0, y: 2 },
  { h: 2, i: 'locked', isStatic: true, w: 3, x: 0, y: 4 },
];

@Component({
  selector: 'app-cross-grid-drag-drop-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleToggleComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <example-toggle [checked]="sourceEnabled" (checkedChange)="sourceEnabled = $event" label="Source grid: allow cross-grid drag"></example-toggle>
      <example-toggle [checked]="targetEnabled" (checkedChange)="targetEnabled = $event" label="Target grid: allow cross-grid drag"></example-toggle>
      <example-toggle [checked]="preventCollision" (checkedChange)="preventCollision = $event" label="preventCollision"></example-toggle>
    </div>

    <div class="grids-row">
      <div class="grid-column">
        <p class="grid-label">Source</p>
        <kdl-grid-layout
          [allowCrossGridDrag]="sourceEnabled"
          [colNum]="4"
          [layout]="sourceLayout"
          layoutId="cross-grid-drag-drop-source"
          (layoutChange)="sourceLayout = $event"
          [preventCollision]="preventCollision"
          [rowHeight]="60"
          [showGridLines]="true"
        >
          @for (item of sourceLayout; track item.i) {
            <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" [isStatic]="item.isStatic ?? false">
              <div class="example-item" [class.example-item--static]="item.isStatic">
                {{ item.i }}
                @if (item.isStatic) {
                  <small>locked</small>
                }
              </div>
            </kdl-grid-item>
          }
        </kdl-grid-layout>
      </div>
      <div class="grid-column">
        <p class="grid-label">Target</p>
        <kdl-grid-layout
          [allowCrossGridDrag]="targetEnabled"
          [colNum]="4"
          [layout]="targetLayout"
          layoutId="cross-grid-drag-drop-target"
          (layoutChange)="targetLayout = $event"
          [preventCollision]="preventCollision"
          [rowHeight]="60"
          [showGridLines]="true"
        >
          @for (item of targetLayout; track item.i) {
            <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
              <div class="example-item">{{ item.i }}</div>
            </kdl-grid-item>
          }
        </kdl-grid-layout>
      </div>
    </div>

    <layout-json-viewer label="Source" [layout]="sourceLayout" />
    <layout-json-viewer label="Target" [layout]="targetLayout" />
  `,
  styles: [`
    .grid-column kdl-grid-layout {
      min-height: 140px;
    }
    .example-item--static {
      background: var(--kg-paper-3);
      border-style: dashed;
      flex-direction: column;
    }
    .example-item small {
      color: var(--kg-text-lo-light);
      font-size: 10px;
    }
  `],
})
export class CrossGridDragDropDemoComponent {
  sourceEnabled = true;
  targetEnabled = true;
  preventCollision = false;
  sourceLayout: TLayout = initialSourceLayout;
  targetLayout: TLayout = [];
}
