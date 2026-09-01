import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GridItemComponent } from '../../src/lib/grid-item.component';
import { GridLayoutComponent } from '../../src/lib/grid-layout.component';
import { ECompactType, readOutsideDropPayload } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';

interface IWidgetPayload {
  label: string;
}

/**
 * Real-browser coverage for `allowOutsideDrop` — native HTML5
 * drag-and-drop from outside the grid system entirely. Two palette
 * widgets (plain `draggable="true"` elements, not `kdl-grid-item`s) can
 * be dropped onto either of two grids; both grids also set
 * `allowCrossGridDrag` so an *existing* item can move between them too
 * — a separate mechanism from outside-drop. Mirrors the Vue/React
 * packages' own identical `external-drop` fixture.
 */
@Component({
  imports: [FormsModule, GridLayoutComponent, GridItemComponent],
  selector: `app-external-drop`,
  standalone: true,
  template: `
    <div data-testid="drop-widget-a" draggable="true" (dragstart)="onDragStart($event, 'A')" style="background: #fef3c7; border: 1px solid #d97706; display: inline-block; margin: 4px; padding: 8px 16px">Widget A</div>
    <div data-testid="drop-widget-b" draggable="true" (dragstart)="onDragStart($event, 'B')" style="background: #fef3c7; border: 1px solid #d97706; display: inline-block; margin: 4px; padding: 8px 16px">Widget B</div>
    <label>vertical compact <input data-testid="toggle-vertical-compact" type="checkbox" [(ngModel)]="verticalCompact" /></label>
    <button data-testid="reset-grids" type="button" (click)="reset()">Reset</button>

    <div style="display: flex; gap: 16px">
      <div data-testid="drop-grid-left" style="border: 1px solid #ccc; min-height: 200px; width: 50%">
        <kdl-grid-layout style="display: block; width: 100%" [allowCrossGridDrag]="true" [allowOutsideDrop]="true" class="cross-grid-empty-target" [colNum]="6" [compactType]="verticalCompact ? ECompactType.VERTICAL : ECompactType.NONE" [layout]="layoutLeft" layoutId="drop-grid-left" [rowHeight]="80" (layoutChange)="layoutLeft = $event" (itemDroppedFromOutside)="onOutsideDrop($event, 'left')">
          @for (item of layoutLeft; track item.i) {
            <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
              <div class="fixture-item-content demo-item">{{ item.i }}</div>
            </kdl-grid-item>
          }
        </kdl-grid-layout>
      </div>
      <div data-testid="drop-grid-right" style="border: 1px solid #ccc; min-height: 200px; width: 50%">
        <kdl-grid-layout style="display: block; width: 100%" [allowCrossGridDrag]="true" [allowOutsideDrop]="true" class="cross-grid-empty-target" [colNum]="6" [compactType]="verticalCompact ? ECompactType.VERTICAL : ECompactType.NONE" [layout]="layoutRight" layoutId="drop-grid-right" [rowHeight]="80" (layoutChange)="layoutRight = $event" (itemDroppedFromOutside)="onOutsideDrop($event, 'right')">
          @for (item of layoutRight; track item.i) {
            <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
              <div class="fixture-item-content demo-item">{{ item.i }}</div>
            </kdl-grid-item>
          }
        </kdl-grid-layout>
      </div>
    </div>
  `,
})
export class ExternalDropComponent {
  readonly ECompactType = ECompactType;

  layoutLeft: TLayout = [{ h: 2, i: `left-0`, w: 3, x: 0, y: 0 }];
  layoutRight: TLayout = [];
  verticalCompact = true;

  onDragStart(event: DragEvent, label: string): void {
    event.dataTransfer?.setData(`text/plain`, JSON.stringify({ label } satisfies IWidgetPayload));
  }

  onOutsideDrop(payload: { dataTransfer: DataTransfer | null; h: number; w: number; x: number; y: number }, side: `left` | `right`): void {
    const parsed = readOutsideDropPayload<IWidgetPayload>(payload.dataTransfer);
    if(!parsed) {
      return;
    }
    // No manual compaction needed here — `GridLayoutComponent`'s own
    // `ngOnChanges` now auto-compacts any externally-driven `layout`
    // change, using this same grid's own bound `compactType` (a real,
    // confirmed feature-parity gap against Vue this fixed — see that
    // method's own doc comment). Simply pushing the dropped item at its
    // real, already-known drop position is enough; the library settles
    // it against existing items itself, matching this fixture's own
    // `verticalCompact` toggle automatically since it's the same
    // `compactType` input already bound in the template.
    const current = side === `left` ? this.layoutLeft : this.layoutRight;
    const next = [...current, { h: payload.h, i: parsed.label, w: payload.w, x: payload.x, y: payload.y }];
    if(side === `left`) {
      this.layoutLeft = next;
    } else {
      this.layoutRight = next;
    }
  }

  reset(): void {
    this.layoutLeft = [{ h: 2, i: `left-0`, w: 3, x: 0, y: 0 }];
    this.layoutRight = [];
  }
}
