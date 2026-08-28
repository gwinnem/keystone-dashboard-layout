import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
];

@Component({
  selector: 'app-outside-drag-drop-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent],
  template: `
    <div class="demo-controls">
      <div class="outside-source" draggable="true" (dragstart)="handleDragStart($event)">drag me in</div>
    </div>

    <kdl-grid-layout
      [allowOutsideDrop]="true"
      [colNum]="12"
      [layout]="layout"
      (layoutChange)="layout = $event"
      (itemDroppedFromOutside)="handleOutsideDrop($event)"
      [outsideDropHeight]="2"
      [outsideDropWidth]="3"
      [rowHeight]="60"
      [showGridLines]="true"
    >
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
})
export class OutsideDragDropDemoComponent {
  layout: TLayout = initialLayout;
  private nextId = 1;

  handleDragStart(event: DragEvent): void {
    event.dataTransfer?.setData('text/plain', 'from-outside');
  }

  handleOutsideDrop({ x, y, w, h }: { x: number; y: number; w: number; h: number }): void {
    this.layout = [...this.layout, { h, i: String(this.nextId), w, x, y }];
    this.nextId += 1;
  }
}
