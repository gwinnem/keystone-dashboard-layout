import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';

@Component({
  selector: 'app-outside-drag-drop-multiple-grids-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent],
  template: `
    <div class="demo-controls">
      <div class="outside-source" draggable="true" (dragstart)="handleDragStart($event)">drag me in</div>
    </div>

    <div class="grids-row">
      <div class="grid-column">
        <p class="grid-label">Grid A</p>
        <kdl-grid-layout [allowOutsideDrop]="true" [colNum]="6" [layout]="layoutA" (layoutChange)="layoutA = $event" (itemDroppedFromOutside)="handleDroppedA($event)" [rowHeight]="60" [showGridLines]="true">
          @for (item of layoutA; track item.i) {
            <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
              <div class="example-item">{{ item.i }}</div>
            </kdl-grid-item>
          }
        </kdl-grid-layout>
      </div>
      <div class="grid-column">
        <p class="grid-label">Grid B</p>
        <kdl-grid-layout [allowOutsideDrop]="true" [colNum]="6" [layout]="layoutB" (layoutChange)="layoutB = $event" (itemDroppedFromOutside)="handleDroppedB($event)" [rowHeight]="60" [showGridLines]="true">
          @for (item of layoutB; track item.i) {
            <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
              <div class="example-item">{{ item.i }}</div>
            </kdl-grid-item>
          }
        </kdl-grid-layout>
      </div>
    </div>
  `,
})
export class OutsideDragDropMultipleGridsDemoComponent {
  layoutA: TLayout = [];
  layoutB: TLayout = [];
  private nextId = 0;

  handleDragStart(event: DragEvent): void {
    event.dataTransfer?.setData('text/plain', 'from-outside');
  }

  handleDroppedA({ x, y, w, h }: { x: number; y: number; w: number; h: number }): void {
    this.layoutA = [...this.layoutA, { h, i: `a${this.nextId}`, w, x, y }];
    this.nextId += 1;
  }

  handleDroppedB({ x, y, w, h }: { x: number; y: number; w: number; h: number }): void {
    this.layoutB = [...this.layoutB, { h, i: `b${this.nextId}`, w, x, y }];
    this.nextId += 1;
  }
}
