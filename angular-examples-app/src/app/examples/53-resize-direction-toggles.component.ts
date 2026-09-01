import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import { ExampleToggleComponent } from '../harness/example-toggle.component';
import type { TLayout } from 'keystone-dashboard-layout-core';
import type { TResizeHandle } from 'keystone-dashboard-layout-core';

const initialLayout: TLayout = [{ h: 3, i: '0', w: 4, x: 4, y: 0 }];

type TDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

@Component({
  selector: 'app-resize-direction-toggles-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleToggleComponent],
  template: `
    <div class="demo-controls">
      <example-toggle [checked]="n" label="N" (checkedChange)="onToggle('n', $event)"></example-toggle>
      <example-toggle [checked]="s" label="S" (checkedChange)="onToggle('s', $event)"></example-toggle>
      <example-toggle [checked]="e" label="E" (checkedChange)="onToggle('e', $event)"></example-toggle>
      <example-toggle [checked]="w" label="W" (checkedChange)="onToggle('w', $event)"></example-toggle>
      <example-toggle [checked]="ne" label="NE" (checkedChange)="onToggle('ne', $event)"></example-toggle>
      <example-toggle [checked]="nw" label="NW" (checkedChange)="onToggle('nw', $event)"></example-toggle>
      <example-toggle [checked]="se" label="SE" (checkedChange)="onToggle('se', $event)"></example-toggle>
      <example-toggle [checked]="sw" label="SW" (checkedChange)="onToggle('sw', $event)"></example-toggle>
    </div>

    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showGridLines]="true" [showResizeHandles]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" [resizeHandles]="resizeHandles">
          <div class="resize-direction-item">{{ resizeHandles.length ? resizeHandles.join(', ') : 'none' }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
  styles: [`
    .demo-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
      margin-bottom: 16px;
    }

    .resize-direction-item {
      align-items: center;
      background: var(--kg-panel);
      border: 1px solid var(--kg-line-light);
      border-radius: 8px;
      color: var(--kg-text-hi-light);
      display: flex;
      font-family: var(--kg-font-mono);
      font-size: 11px;
      height: 100%;
      justify-content: center;
      padding: 8px;
      text-align: center;
      width: 100%;
    }
  `],
})
export class ResizeDirectionTogglesDemoComponent {
  layout: TLayout = initialLayout;
  n = true;
  s = true;
  e = true;
  w = false;
  ne = true;
  nw = false;
  se = true;
  sw = false;

  // A plain field, reassigned only in onToggle() below — not a getter.
  // A getter recomputed on every change-detection run would hand
  // GridItemComponent a brand-new array reference on nearly every
  // tick (Angular getters have no memoization the way Vue's computed()
  // or React's useMemo() do), even when nothing about which handles
  // are enabled actually changed. A real, observed consequence of
  // that: GridItemComponent's own resize-handle DOM elements got torn
  // down and recreated mid-gesture, silently killing an in-progress
  // drag on whichever handle happened to re-render at that moment —
  // not every handle, just whichever one the pointer was on when a
  // reference-only "change" fired. This field only changes when a
  // toggle genuinely does.
  resizeHandles: TResizeHandle[] = ['n', 's', 'e', 'ne', 'se'];

  onToggle(direction: TDirection, checked: boolean): void {
    this[direction] = checked;
    const handles: TResizeHandle[] = [];
    if (this.n) handles.push('n');
    if (this.s) handles.push('s');
    if (this.e) handles.push('e');
    if (this.w) handles.push('w');
    if (this.ne) handles.push('ne');
    if (this.nw) handles.push('nw');
    if (this.se) handles.push('se');
    if (this.sw) handles.push('sw');
    this.resizeHandles = handles;
  }
}
