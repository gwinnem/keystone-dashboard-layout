import { Component, inject } from '@angular/core';
import { GridLayoutComponent, GridItemComponent, GridLayoutStorageService } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const STORAGE_KEY = 'keystone-dashboard-layout-example-19-layout';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
];

@Component({
  selector: 'app-save-load-layout-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <button class="demo-btn" type="button" (click)="handleSave()">Save</button>
      <button class="demo-btn demo-btn--ghost" type="button" (click)="handleLoad()">Load</button>
      @if (status) {
        <span class="demo-status">{{ status }}</span>
      }
    </div>

    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
})
export class SaveLoadLayoutDemoComponent {
  private readonly storage = inject(GridLayoutStorageService);
  layout: TLayout = initialLayout;
  status = '';

  handleSave(): void {
    this.storage.save(STORAGE_KEY, this.layout);
    this.status = 'Saved.';
  }

  handleLoad(): void {
    const loaded = this.storage.load(STORAGE_KEY);
    if (!loaded) {
      this.status = 'Nothing saved yet.';
      return;
    }
    this.layout = loaded;
    this.status = 'Loaded.';
  }
}
