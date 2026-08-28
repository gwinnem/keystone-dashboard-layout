import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { ExampleToggleComponent } from '../harness/example-toggle.component';
import { ExampleNumberFieldComponent } from '../harness/example-number-field.component';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const LETTERS = ['a', 'b', 'c', 'd', 'e'];

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 2, x: 0, y: 0 },
  { h: 2, i: '1', w: 2, x: 2, y: 0 },
  { h: 2, i: '2', w: 2, x: 4, y: 0 },
  { h: 4, i: '3', w: 2, x: 6, y: 0 },
  { h: 2, i: '4', w: 2, x: 8, y: 0 },
];

/**
 * Real, standalone-app version of the "01 — Basic drag & resize"
 * demo itself — same shape as the Vue/React packages' own first
 * example (and the abandoned astro-docs Angular-island attempt), but
 * running through Angular's own native CLI/esbuild build, not embedded
 * inside Astro via @analogjs/astro-angular. Same `.panel`/`.demo-controls`
 * class names and styling as the React package's own example, for a
 * matching look — see `01-basic-drag-resize.page.component.ts` for the
 * routed page this is projected into (title/description prose + the
 * ExampleTryIt shell).
 */
@Component({
  selector: 'app-basic-drag-resize-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleToggleComponent, ExampleNumberFieldComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <example-toggle [checked]="isDraggable" (checkedChange)="isDraggable = $event" label="isDraggable"></example-toggle>
      <example-toggle [checked]="isResizable" (checkedChange)="isResizable = $event" label="isResizable"></example-toggle>
      <example-number-field [value]="colNum" (valueChange)="colNum = $event" label="colNum" [min]="1" [max]="12"></example-number-field>
    </div>

    <kdl-grid-layout
      [layout]="layout"
      (layoutChange)="layout = $event"
      [colNum]="colNum"
      [isDraggable]="isDraggable"
      [isResizable]="isResizable"
      [rowHeight]="60"
      [showGridLines]="true"
      (dragStart)="activeId = $event"
      (dragEnd)="activeId = null"
    >
      @for (item of layout; track item.i; let index = $index) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="panel" [class.panel--active]="activeId === item.i">
            <span class="panel__title">panel {{ LETTERS[index] }}</span>
            <span class="panel__bar"></span>
          </div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .panel {
      background: var(--kg-panel);
      border: 1px solid var(--kg-line-light);
      border-radius: 10px;
      box-shadow: 0 1px 2px rgba(20, 23, 26, 0.06);
      height: 100%;
      padding: 12px 14px;
      position: relative;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      width: 100%;
    }
    .panel--active {
      border-color: var(--kg-amber-deep);
      box-shadow: 0 0 0 1px var(--kg-amber-deep), 0 6px 16px rgba(156, 98, 8, 0.18);
    }
    .panel--active::after {
      background: var(--kg-amber);
      border-radius: 50%;
      content: '';
      height: 6px;
      position: absolute;
      right: 8px;
      top: 8px;
      width: 6px;
    }
    .panel__title {
      color: var(--kg-blueprint-deep);
      display: block;
      font-family: var(--kg-font-mono);
      font-size: 12px;
      font-weight: 500;
    }
    .panel--active .panel__title {
      color: var(--kg-amber-deep);
    }
    .panel__bar {
      background: var(--kg-line-light);
      border-radius: 2px;
      display: block;
      height: 4px;
      margin-top: 10px;
      width: 60%;
    }
  `],
})
export class BasicDragResizeDemoComponent {
  readonly LETTERS = LETTERS;
  isDraggable = true;
  isResizable = true;
  colNum = 12;
  activeId: string | number | null = null;
  layout: TLayout = initialLayout;
}
