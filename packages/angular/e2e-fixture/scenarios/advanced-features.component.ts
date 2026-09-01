import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GridItemComponent } from '../../src/lib/grid-item.component';
import { GridLayoutComponent } from '../../src/lib/grid-layout.component';
import { GridLayoutStorageService } from '../../src/lib/grid-layout-storage.service';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { ICompactor, TLayout } from 'keystone-dashboard-layout-core';

/**
 * A custom compactor that settles every non-static item *downward*
 * toward the grid's own lower bound instead of the built-in vertical
 * compactor's upward direction — deliberately the opposite of the
 * default, so a real, only-explicable-by-the-custom-compactor-
 * actually-running outcome is observable. Mirrors the Vue/React
 * packages' own identical `advanced-features` fixture.
 */
const downwardCompactor: ICompactor = {
  compact: (layout: TLayout): TLayout => layout.map(item => (item.isStatic ? item : { ...item, y: item.y + 3 })),
  type: `downward`,
};

/**
 * Real-browser coverage for `preventCollision` + `moveBlockedByCollision`
 * feedback, a custom `compactor`, `undo()`/`redo()`, `compactNow()`,
 * `duplicateItem()`, `snapToGrid`, saving/loading a layout via
 * `GridLayoutStorageService`, `autoHeight`, and `showGridLines` — all
 * exposed as plain public methods/fields directly on `GridLayoutComponent`,
 * reached here via a `@ViewChild` reference (Angular's own equivalent of
 * React's ref-based imperative handle, but simpler: no stale-closure
 * workaround needed — `canUndo`/`canRedo` are set synchronously on
 * `GridLayoutComponent` *before* it emits `layoutChange`, and that
 * emission is what drives this fixture's own change detection, so this
 * template's own `gridRef.canUndo` read is always current by the time it's
 * evaluated).
 */
@Component({
  imports: [FormsModule, GridLayoutComponent, GridItemComponent],
  selector: `app-advanced-features`,
  standalone: true,
  template: `
    <label>preventCollision <input data-testid="toggle-prevent-collision" type="checkbox" [(ngModel)]="preventCollision" /></label>
    <label>custom compactor <input data-testid="toggle-custom-compactor" type="checkbox" [(ngModel)]="useCustomCompactor" /></label>
    <label>snapToGrid <input data-testid="toggle-snap-to-grid" type="checkbox" [(ngModel)]="snapToGrid" /></label>
    <label>showGridLines <input data-testid="toggle-show-grid-lines" type="checkbox" [(ngModel)]="showGridLines" /></label>
    <label>
      compactType
      <select data-testid="select-compact-type" [(ngModel)]="compactType">
        <option [value]="ECompactType.VERTICAL">vertical</option>
        <option [value]="ECompactType.NONE">none</option>
      </select>
    </label>
    <div data-testid="blocked-feedback">{{ 'Blocked moves: ' + blockedCount + (lastBlockedId ? ', last: "' + lastBlockedId + '"' : '') }}</div>
    <button data-testid="undo-button" type="button" [disabled]="!gridRef.canUndo" (click)="gridRef.undo()">Undo</button>
    <button data-testid="redo-button" type="button" [disabled]="!gridRef.canRedo" (click)="gridRef.redo()">Redo</button>
    <button data-testid="compact-now" type="button" (click)="gridRef.compactNow()">Compact now</button>
    <button data-testid="duplicate-item" type="button" (click)="gridRef.duplicateItem('0')">Duplicate item 0</button>
    <button data-testid="grow-content" type="button" (click)="growTicks = growTicks + 1">Grow content</button>
    <button data-testid="save-preset-compact" type="button" (click)="savePreset()">Save preset</button>
    @if (presetSaved) {
      <button data-testid="load-preset-compact" type="button" (click)="loadPreset()">Load preset</button>
    }

    <kdl-grid-layout
      #gridRef
      style="display: block; width: 100%"
      [layout]="layout"
      [rowHeight]="80"
      [preventCollision]="preventCollision"
      [compactor]="useCustomCompactor ? downwardCompactor : null"
      [compactType]="compactType"
      [snapToGrid]="snapToGrid"
      [snapThreshold]="1"
      [showGridLines]="showGridLines"
      [enableUndoRedo]="true"
      (layoutChange)="layout = $event"
      (moveBlockedByCollision)="onBlocked($event)"
    >
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" [autoHeight]="item.i === 'growable'">
          <div class="fixture-item-content">
            @if (item.i === 'growable') {
              <div [style.height.px]="20 + growTicks * 10">{{ 'Item ' + item.i }}</div>
            } @else {
              {{ 'Item ' + item.i }}
            }
          </div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
})
export class AdvancedFeaturesComponent {
  readonly ECompactType = ECompactType;
  readonly downwardCompactor = downwardCompactor;

  layout: TLayout = [
    { h: 2, i: `0`, w: 2, x: 0, y: 0 },
    { h: 2, i: `wall`, isStatic: true, w: 2, x: 4, y: 0 },
    { h: 2, i: `growable`, w: 3, x: 8, y: 0 },
  ];
  preventCollision = false;
  useCustomCompactor = false;
  snapToGrid = false;
  showGridLines = false;
  compactType: ECompactType = ECompactType.VERTICAL;
  blockedCount = 0;
  lastBlockedId: string | null = null;
  growTicks = 0;
  presetSaved = false;

  private static readonly STORAGE_KEY = `e2e-advanced-features-preset`;

  constructor(private readonly storage: GridLayoutStorageService) {}

  onBlocked(id: string | number): void {
    this.blockedCount += 1;
    this.lastBlockedId = String(id);
  }

  savePreset(): void {
    this.storage.save(AdvancedFeaturesComponent.STORAGE_KEY, this.layout);
    this.presetSaved = true;
  }

  loadPreset(): void {
    const loaded = this.storage.load(AdvancedFeaturesComponent.STORAGE_KEY);
    if(loaded) {
      this.layout = loaded;
    }
  }
}
