import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { ExampleToggleComponent } from '../harness/example-toggle.component';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: 'a', w: 4, x: 0, y: 0 },
  { h: 2, i: 'b', w: 4, x: 4, y: 0 },
  { h: 2, i: 'c', w: 4, x: 8, y: 0 },
];

@Component({
  selector: 'app-resize-hint-appearance-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleToggleComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <example-toggle [checked]="showResizeHandles" (checkedChange)="showResizeHandles = $event" label="showResizeHandles (grid default)"></example-toggle>
      <label class="demo-color-field">
        resizeHandleColor
        <input type="color" [value]="resizeHandleColor" (change)="onColorChange($event)" />
      </label>
    </div>

    <kdl-grid-layout
      [colNum]="12"
      [layout]="layout"
      (layoutChange)="layout = $event"
      [resizeHandleColor]="resizeHandleColor"
      [rowHeight]="100"
      [showGridLines]="true"
      [showResizeHandles]="showResizeHandles"
    >
      <kdl-grid-item i="a" [x]="0" [y]="0" [w]="4" [h]="2">
        <div class="example-item">grid default</div>
      </kdl-grid-item>
      <kdl-grid-item i="b" [x]="4" [y]="0" [w]="4" [h]="2" [resizeHandleColor]="'crimson'" [showResizeHandles]="true">
        <div class="example-item">own override (always visible, crimson)</div>
      </kdl-grid-item>
      <kdl-grid-item i="c" [x]="8" [y]="0" [w]="4" [h]="2" [showResizeHandles]="false">
        <div class="example-item">own override (always hidden)</div>
      </kdl-grid-item>
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .demo-color-field {
      align-items: center;
      color: var(--kg-text-lo-light);
      display: flex;
      font-size: 13px;
      gap: 6px;
    }
    .demo-color-field input {
      border: none;
      border-radius: 4px;
      height: 22px;
      padding: 0;
      width: 28px;
    }
  `],
})
export class ResizeHintAppearanceDemoComponent {
  showResizeHandles = true;
  resizeHandleColor = '#f2a93b';
  layout: TLayout = initialLayout;

  onColorChange(event: Event): void {
    this.resizeHandleColor = (event.target as HTMLInputElement).value;
  }
}
