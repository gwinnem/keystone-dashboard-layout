import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { ExampleNumberFieldComponent } from '../harness/example-number-field.component';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

// Kept as its own constant (not read back out of `layout` itself) so
// "Reset layout" always restores the exact original positions, not
// whatever the layout happened to compact/shuffle into after some
// interaction — otherwise comparing different duration/easing settings
// has no way to get back to a consistent starting point without
// reloading the whole page.
const INITIAL_LAYOUT: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
  { h: 2, i: '2', w: 3, x: 6, y: 0 },
  { h: 2, i: '3', w: 3, x: 9, y: 0 },
];

@Component({
  selector: 'app-transition-duration-easing-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleNumberFieldComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <button class="demo-btn" type="button" (click)="shuffle()">Shuffle</button>
      <button class="demo-btn demo-btn--ghost" type="button" (click)="resetLayout()">Reset layout</button>
      <example-number-field [value]="transitionDurationMs" (valueChange)="transitionDurationMs = $event" label="transitionDurationMs" [min]="0" [max]="2000"></example-number-field>
      <select class="demo-select" [value]="transitionTimingFunction" (change)="onTimingChange($event)">
        <option value="ease">ease</option>
        <option value="linear">linear</option>
        <option value="ease-in-out">ease-in-out</option>
        <option value="cubic-bezier(.68,-0.55,.27,1.55)">bounce-ish</option>
      </select>
    </div>

    <kdl-grid-layout
      [colNum]="12"
      [layout]="layout"
      (layoutChange)="layout = $event"
      [rowHeight]="60"
      [showGridLines]="true"
      [transitionDurationMs]="transitionDurationMs"
      [transitionTimingFunction]="transitionTimingFunction"
    >
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
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
    .demo-select {
      background: var(--kg-paper);
      border: 1px solid var(--kg-line-light);
      border-radius: 6px;
      color: var(--kg-text-hi-light);
      font-size: 13px;
      padding: 4px 8px;
    }
  `],
})
export class TransitionDurationEasingDemoComponent {
  transitionDurationMs = 600;
  transitionTimingFunction = 'ease';
  layout: TLayout = INITIAL_LAYOUT.map((item) => ({ ...item }));

  onTimingChange(event: Event): void {
    this.transitionTimingFunction = (event.target as HTMLSelectElement).value;
  }

  shuffle(): void {
    this.layout = [...this.layout]
      .sort(() => Math.random() - 0.5)
      .map((item, index) => ({ ...item, x: (index % 4) * 3, y: Math.floor(index / 4) * 2 }));
  }

  resetLayout(): void {
    this.layout = INITIAL_LAYOUT.map((item) => ({ ...item }));
  }
}
