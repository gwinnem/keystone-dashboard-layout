import { Component, ViewChild } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { ExampleToggleComponent } from '../harness/example-toggle.component';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const layoutA: TLayout = [
  { h: 2, i: 'a0', w: 2, x: 0, y: 0 },
  { h: 2, i: 'a1', w: 2, x: 2, y: 0 },
  { h: 2, i: 'a2', w: 2, x: 4, y: 0 },
];

// Deliberately the same length (3 items) as layoutA — GridLayoutComponent
// commits an undo point whenever the layout's own length changes (see
// its own ngOnChanges), which would otherwise fire on every switch
// regardless of whether anything was actually dragged, confounding
// this example's own demonstration of canUndo staying stale
// specifically from Layout A's own drag.
const layoutB: TLayout = [
  { h: 3, i: 'b0', w: 4, x: 0, y: 0 },
  { h: 3, i: 'b1', w: 4, x: 4, y: 0 },
  { h: 2, i: 'b2', w: 8, x: 0, y: 3 },
];

@Component({
  selector: 'app-switching-layouts-remount-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleToggleComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <example-toggle [checked]="forceRemount" (checkedChange)="forceRemount = $event" label="Force remount on switch"></example-toggle>
      <button class="demo-btn" type="button" (click)="switchTo('a')">Switch to Layout A</button>
      <button class="demo-btn" type="button" (click)="switchTo('b')">Switch to Layout B</button>
    </div>

    @if (mounted) {
      <kdl-grid-layout #grid [colNum]="12" [enableUndoRedo]="true" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="70" [showGridLines]="true">
        @for (item of layout; track item.i) {
          <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
            <div class="example-item">{{ item.i }}</div>
          </kdl-grid-item>
        }
      </kdl-grid-layout>
    }

    <p class="demo-description">Current layout: <strong>{{ currentLayoutName }}</strong></p>
    <p class="demo-description">canUndo: <strong>{{ grid?.canUndo ?? false }}</strong></p>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .demo-description {
      color: var(--kg-text-lo-light);
      font-size: 13px;
    }
  `],
})
export class SwitchingLayoutsRemountDemoComponent {
  @ViewChild('grid') grid?: GridLayoutComponent;
  forceRemount = false;
  layout: TLayout = layoutA.map((item) => ({ ...item }));
  currentLayoutName: 'A' | 'B' = 'A';
  mounted = true;

  switchTo(target: 'a' | 'b'): void {
    this.layout = (target === 'a' ? layoutA : layoutB).map((item) => ({ ...item }));
    this.currentLayoutName = target === 'a' ? 'A' : 'B';
    if (this.forceRemount) {
      // Angular has no literal `key` prop for a single element the way
      // React does — toggling a structural `@if` off then back on is
      // this package's own equivalent, genuinely destroying and
      // recreating the component (running ngOnDestroy/ngOnInit again,
      // resetting canUndo/the undo stack along with it) rather than
      // just updating its inputs in place.
      this.mounted = false;
      setTimeout(() => {
        this.mounted = true;
      });
    }
  }
}
