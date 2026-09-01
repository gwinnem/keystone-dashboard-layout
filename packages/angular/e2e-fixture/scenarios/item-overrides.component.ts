import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GridItemComponent } from '../../src/lib/grid-item.component';
import { GridLayoutComponent } from '../../src/lib/grid-layout.component';
import { GridItemHeaderDirective } from '../../src/lib/grid-item-header.directive';
import type { TLayout, TResizeHandle } from 'keystone-dashboard-layout-core';

const ALL_HANDLES: TResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

/**
 * Real-browser coverage for per-item overrides — every field here
 * lives directly on `GridItemComponent` as its own `@Input()`
 * (Angular's architecture is direct-prop-driven on the item itself,
 * unlike React's layout-item-field approach — confirmed by reading
 * `grid-item.component.ts` directly): `preserveAspectRatio`,
 * `isResizable`/`isDraggable` tri-state, `dragAllowFrom`/
 * `resizeIgnoreFrom`, per-item `resizeHandles`, `autoScroll`, the
 * `kdlGridItemHeader` projection directive (Angular's equivalent of
 * Vue's `#header` slot / React's `header` render prop), and per-item
 * `zIndex`. Mirrors the Vue/React packages' own identical
 * `item-overrides` fixture.
 */
@Component({
  imports: [FormsModule, GridLayoutComponent, GridItemComponent, GridItemHeaderDirective],
  selector: `app-item-overrides`,
  standalone: true,
  template: `
    <label>preserveAspectRatio <input data-testid="toggle-preserve-aspect-ratio" type="checkbox" [(ngModel)]="preserveAspectRatio" /></label>
    <label>
      isResizable
      <select data-testid="select-is-resizable" [(ngModel)]="isResizable">
        <option value="">(default)</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    </label>
    <label>
      isDraggable
      <select data-testid="select-is-draggable" [(ngModel)]="isDraggable">
        <option value="">(default)</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    </label>
    <label>dragAllowFrom <input data-testid="input-drag-allow-from" [(ngModel)]="dragAllowFrom" /></label>
    <label>resizeIgnoreFrom <input data-testid="input-resize-ignore-from" [(ngModel)]="resizeIgnoreFrom" /></label>
    <label>autoScroll <input data-testid="toggle-auto-scroll" type="checkbox" [(ngModel)]="autoScroll" /></label>
    <label>header <input data-testid="toggle-item-header" type="checkbox" [(ngModel)]="showHeader" /></label>
    <label>zIndex <input data-testid="input-item-z-index" [(ngModel)]="zIndex" /></label>
    @for (handle of allHandles; track handle) {
      <label>
        {{ handle }}
        <input [attr.data-testid]="'toggle-resize-handle-' + handle" type="checkbox" [checked]="!disabledHandles.has(handle)" (change)="toggleHandle(handle, $event)" />
      </label>
    }

    <div data-testid="item-overrides-scroll-area" style="height: 250px; overflow: auto; position: relative">
      <div style="height: 800px">
        <kdl-grid-layout style="display: block; width: 100%" [colNum]="12" [layout]="layout" [rowHeight]="80" [showGridLines]="true" (layoutChange)="layout = $event">
          @for (item of layout; track item.i) {
            <kdl-grid-item
              [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h"
              [preserveAspectRatio]="item.i === '0' ? preserveAspectRatio : false"
              [isResizable]="item.i === '0' ? resolvedIsResizable : null"
              [isDraggable]="item.i === '0' ? resolvedIsDraggable : null"
              [dragAllowFrom]="item.i === '0' ? (dragAllowFrom || null) : null"
              [resizeIgnoreFrom]="item.i === '0' ? (resizeIgnoreFrom || null) : null"
              [autoScroll]="item.i === '0' ? autoScroll : false"
              [zIndex]="item.i === '0' ? resolvedZIndex : null"
              [resizeHandles]="item.i === '0' ? resolvedResizeHandles : null"
            >
              @if (item.i === '0' && showHeader) {
                <div kdlGridItemHeader style="background: #c7d2fe; border-bottom: 1px solid #818cf8; padding: 4px 8px">header slot</div>
              }
              <div class="fixture-item-content">
                {{ 'Item ' + item.i }}
                @if (item.i === '0') {
                  <button class="item-inner-button" type="button">inner</button>
                }
              </div>
            </kdl-grid-item>
          }
        </kdl-grid-layout>
      </div>
    </div>
  `,
})
export class ItemOverridesComponent {
  readonly allHandles = ALL_HANDLES;

  layout: TLayout = [
    { h: 3, i: `0`, w: 3, x: 0, y: 0 },
    { h: 2, i: `1`, w: 3, x: 4, y: 0 },
  ];
  preserveAspectRatio = false;
  isResizable = ``;
  isDraggable = ``;
  dragAllowFrom = ``;
  resizeIgnoreFrom = ``;
  autoScroll = false;
  showHeader = false;
  zIndex = ``;
  disabledHandles = new Set<TResizeHandle>();

  get resolvedIsResizable(): boolean | null {
    return this.isResizable === `` ? null : this.isResizable === `true`;
  }

  get resolvedIsDraggable(): boolean | null {
    return this.isDraggable === `` ? null : this.isDraggable === `true`;
  }

  get resolvedZIndex(): number | null {
    return this.zIndex === `` ? null : Number(this.zIndex);
  }

  get resolvedResizeHandles(): TResizeHandle[] {
    return ALL_HANDLES.filter(handle => !this.disabledHandles.has(handle));
  }

  toggleHandle(handle: TResizeHandle, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.disabledHandles);
    if(checked) {
      next.delete(handle);
    } else {
      next.add(handle);
    }
    this.disabledHandles = next;
  }
}
