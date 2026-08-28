import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
];

@Component({
  selector: 'app-layout-lifecycle-events-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <kdl-grid-layout
      [colNum]="12"
      [layout]="layout"
      (columnsChanged)="logEvent('columnsChanged')"
      (dragStart)="logEvent('dragStart: ' + $event)"
      (dragMove)="logEvent('dragMove: ' + $event)"
      (dragEnd)="logEvent('dragEnd: ' + $event)"
      (layoutChange)="handleLayoutChange($event)"
      (layoutReady)="logEvent('layoutReady')"
      [rowHeight]="60"
      [showGridLines]="true"
    >
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <div class="event-log-panel">
      <p class="event-log__label">LIFECYCLE LOG</p>
      <ul class="event-log">
        @for (entry of events; track $index) {
          <li class="event-log__entry">{{ entry }}</li>
        }
      </ul>
    </div>

    <layout-json-viewer [layout]="layout" />
  `,
})
export class LayoutLifecycleEventsDemoComponent {
  layout: TLayout = initialLayout;
  events: string[] = [];

  logEvent(name: string): void {
    this.events = [name, ...this.events].slice(0, 20);
  }

  handleLayoutChange(next: TLayout): void {
    this.logEvent('layoutChange');
    this.layout = next;
  }
}
