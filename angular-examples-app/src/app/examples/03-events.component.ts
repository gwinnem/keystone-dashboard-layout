import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 2, x: 0, y: 0 },
  { h: 2, i: '1', w: 2, x: 2, y: 0 },
  { h: 2, i: '2', w: 2, x: 4, y: 0 },
];

@Component({
  selector: 'app-events-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <kdl-grid-layout
      [colNum]="12"
      [layout]="layout"
      (layoutChange)="onLayoutChange($event)"
      [rowHeight]="60"
      [showGridLines]="true"
      (dragStart)="log('dragstart: ' + $event)"
      (dragMove)="log('dragmove')"
      (dragEnd)="log('dragend: ' + $event)"
      (columnsChanged)="log('columnsChanged: ' + $event)"
    >
      @for (item of layout; track item.i) {
        <kdl-grid-item
          [i]="item.i"
          [x]="item.x"
          [y]="item.y"
          [w]="item.w"
          [h]="item.h"
          (itemMoved)="onItemMoved($event)"
          (itemResized)="onItemResized($event)"
        >
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <div class="event-log-panel">
      <p class="event-log__label">EVENT LOG</p>
      <ul class="event-log">
        @if (events.length === 0) {
          <li class="event-log__empty">Drag or resize an item to see events appear here.</li>
        } @else {
          @for (entry of events; track $index) {
            <li class="event-log__entry">{{ entry }}</li>
          }
        }
      </ul>
    </div>

    <layout-json-viewer [layout]="layout" />
  `,
})
export class EventsDemoComponent {
  layout: TLayout = initialLayout;
  events: string[] = [];

  log(message: string): void {
    this.events = [`${new Date().toLocaleTimeString()} — ${message}`, ...this.events].slice(0, 8);
  }

  onLayoutChange(next: TLayout): void {
    this.log('layoutChange');
    this.layout = next;
  }

  onItemMoved({ i, x, y }: { i: string | number; x: number; y: number }): void {
    this.log(`moved: ${i} -> (${x},${y})`);
  }

  onItemResized({ i, h, w }: { i: string | number; h: number; w: number }): void {
    this.log(`resized: ${i} -> ${w}x${h}`);
  }
}
