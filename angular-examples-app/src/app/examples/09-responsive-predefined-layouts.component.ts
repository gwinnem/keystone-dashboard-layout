import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

// The default (large-screen) layout — three items side by side. A more
// realistic "header/sidebar/content" dashboard shape than a flat row
// of interchangeable items, and the `xs` breakpoint (480px) rather
// than `sm` (768px) — the lower, more readily-crossable threshold
// that a narrow docs-example panel can actually reach.
const initialLayout: TLayout = [
  { h: 2, i: 'header', w: 6, x: 0, y: 0 },
  { h: 3, i: 'sidebar', w: 2, x: 0, y: 2 },
  { h: 3, i: 'content', w: 4, x: 2, y: 2 },
];

// Hand-authored layout for narrow screens: stack everything, sidebar last.
const responsiveLayouts: Record<string, TLayout> = {
  xs: [
    { h: 2, i: 'header', w: 4, x: 0, y: 0 },
    { h: 4, i: 'content', w: 4, x: 0, y: 2 },
    { h: 3, i: 'sidebar', w: 4, x: 0, y: 6 },
  ],
};

@Component({
  selector: 'app-responsive-predefined-layouts-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <span class="demo-description">
        Instead of letting the library auto-generate a layout for each breakpoint, you can
        hand it exact layouts to switch between via <code>responsiveLayouts</code>. Shrink
        the panel (or your window) to see the hand-authored mobile layout kick in below
        <code>md</code>. Current breakpoint: <strong>{{ lastBreakpoint }}</strong>
      </span>
    </div>

    <kdl-grid-layout
      [layout]="layout"
      (breakpointChanged)="lastBreakpoint = $event"
      (layoutChange)="layout = $event"
      [responsive]="true"
      [responsiveLayouts]="responsiveLayouts"
      [rowHeight]="50"
      [showGridLines]="true"
    >
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
})
export class ResponsivePredefinedLayoutsDemoComponent {
  readonly responsiveLayouts = responsiveLayouts;
  lastBreakpoint = '—';
  layout: TLayout = initialLayout;
}
