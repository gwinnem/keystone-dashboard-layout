import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: 'anchor', w: 3, x: 3, y: 0, isStatic: true },
];

@Component({
  selector: 'app-blocked-move-feedback-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <span class="demo-status" [class.demo-status--active]="flashing">
        {{ flashing ? 'Blocked!' : 'Try dragging item 0 onto the static item' }}
      </span>
    </div>

    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" (moveBlockedByCollision)="handleBlocked()" [preventCollision]="true" [rowHeight]="60" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" [isStatic]="item.isStatic ?? false">
          <div class="example-item" [class.example-item--static]="item.i === 'anchor'">
            {{ item.i === 'anchor' ? 'static' : item.i }}
          </div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .demo-status {
      color: var(--kg-text-lo-light);
      font-size: 13px;
      transition: color 0.15s ease;
    }
    .demo-status--active {
      color: var(--kg-amber-deep);
      font-weight: 600;
    }
    .example-item--static {
      background: var(--kg-paper-3);
      border-color: var(--kg-blueprint-deep);
      color: var(--kg-blueprint-deep);
    }
  `],
})
export class BlockedMoveFeedbackDemoComponent {
  layout: TLayout = initialLayout;
  flashing = false;
  private timeoutId: ReturnType<typeof setTimeout> | undefined;

  handleBlocked(): void {
    this.flashing = true;
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.flashing = false;
    }, 900);
  }
}
