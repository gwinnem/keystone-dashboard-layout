import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent, GridItemDragHandleComponent, GridItemCloseButtonComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0, dragAllowFrom: '.kdl-draggable-handle', resizeIgnoreFrom: '.kdl-draggable-handle' },
  { h: 2, i: '1', w: 3, x: 3, y: 0, dragAllowFrom: '.kdl-draggable-handle', resizeIgnoreFrom: '.kdl-draggable-handle' },
];

@Component({
  selector: 'app-custom-drag-handle-close-button-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, GridItemDragHandleComponent, GridItemCloseButtonComponent],
  template: `
    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="70" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" [dragAllowFrom]="item.dragAllowFrom ?? null" [resizeIgnoreFrom]="item.resizeIgnoreFrom ?? null">
          <div class="custom-handle-item">
            <kdl-custom-drag-element text="⠿" />
            <span>{{ item.i }}</span>
            <kdl-custom-close-button [i]="item.i" (removeGridItem)="removeItem($event)" />
          </div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
  styles: [`
    .custom-handle-item {
      align-items: center;
      background: var(--kg-panel);
      border: 1px solid var(--kg-line-light);
      border-radius: 8px;
      color: var(--kg-text-hi-light);
      display: flex;
      font-family: var(--kg-font-mono);
      height: 100%;
      justify-content: space-between;
      padding: 0 12px;
      position: relative;
      width: 100%;
    }
  `],
})
export class CustomDragHandleCloseButtonDemoComponent {
  layout: TLayout = initialLayout;

  removeItem(id: string | number): void {
    this.layout = this.layout.filter((item) => item.i !== id);
  }
}
