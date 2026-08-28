import { Component, ViewChild } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { ExampleNumberFieldComponent } from '../harness/example-number-field.component';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 2, x: 0, y: 0 },
  { h: 2, i: '1', w: 2, x: 2, y: 0 },
  { h: 2, i: '2', w: 2, x: 4, y: 0 },
];

@Component({
  selector: 'app-undo-redo-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleNumberFieldComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <button class="demo-btn" type="button" [disabled]="!grid.canUndo" (click)="undo()">Undo</button>
      <button class="demo-btn" type="button" [disabled]="!grid.canRedo" (click)="redo()">Redo</button>
      <button class="demo-btn demo-btn--ghost" type="button" (click)="addItem()">Add item</button>
      <example-number-field [value]="undoHistoryLimit" (valueChange)="undoHistoryLimit = $event" label="undoHistoryLimit" [min]="1" [max]="20"></example-number-field>
    </div>

    <kdl-grid-layout #grid [colNum]="12" [enableUndoRedo]="true" [layout]="layout" (layoutChange)="handleLayoutChange($event)" [rowHeight]="60" [showGridLines]="true" [undoHistoryLimit]="undoHistoryLimit">
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
    .demo-btn:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }
    .demo-btn--ghost {
      background: transparent;
      border: 1px solid var(--kg-line-light);
      color: var(--kg-text-hi-light);
    }
  `],
})
export class UndoRedoDemoComponent {
  @ViewChild('grid') grid!: GridLayoutComponent;
  layout: TLayout = initialLayout;
  // Set well below the library's own default (50) specifically so the
  // cap itself is easy to observe: add more items than the limit, then
  // keep undoing — canUndo becomes false before every addition is
  // undone, since the oldest snapshot was already dropped to stay
  // under it.
  undoHistoryLimit = 3;
  private nextId = 3;
  // canUndo/canRedo are plain fields on the imperative handle, not
  // reactive — Angular's own change detection re-checks the template
  // (and so [disabled]) on every layoutChange/undo/redo call already,
  // so no extra tick-counter workaround is needed the way a snapshot
  // read in a purely event-driven context sometimes requires.

  handleLayoutChange(next: TLayout): void {
    this.layout = next;
  }

  undo(): void {
    this.grid.undo();
  }

  redo(): void {
    this.grid.redo();
  }

  addItem(): void {
    const id = String(this.nextId);
    this.nextId += 1;
    this.layout = [...this.layout, { h: 2, i: id, w: 2, x: 0, y: Infinity }];
  }
}
