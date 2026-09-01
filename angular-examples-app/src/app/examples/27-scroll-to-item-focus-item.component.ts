import { Component, ViewChild } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = Array.from({ length: 6 }, (_, index) => ({ h: 2, i: String(index), w: 4, x: 0, y: index * 2 }));

@Component({
  selector: 'app-scroll-to-item-focus-item-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <button class="demo-btn" type="button" (click)="addAndJumpToItem()">+ Add item (scrolls &amp; focuses it)</button>
      <button class="demo-btn demo-btn--ghost" type="button" (click)="jumpToFirst()">Scroll to item 0</button>
    </div>

    <div class="scroll-frame">
      <kdl-grid-layout #grid [colNum]="4" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showGridLines]="true">
        @for (item of layout; track item.i) {
          <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
            <div class="example-item">{{ item.i }}</div>
          </kdl-grid-item>
        }
      </kdl-grid-layout>
    </div>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .scroll-frame {
      border: 1px solid var(--kg-line-light);
      border-radius: 8px;
      max-height: 220px;
      overflow-y: auto;
      padding: 8px;
    }
  `],
})
export class ScrollToItemFocusItemDemoComponent {
  @ViewChild('grid') grid!: GridLayoutComponent;
  layout: TLayout = initialLayout;

  addAndJumpToItem(): void {
    const id = `new-${Date.now()}`;
    this.layout = [...this.layout, { h: 2, i: id, w: 4, x: 0, y: this.layout.length * 2 }];
    // The new item's own element doesn't exist in the DOM yet at this
    // exact point — Angular's own change detection commits the update
    // asynchronously relative to this call, so a naive synchronous
    // call here would find nothing and do nothing. Scheduling for the
    // next tick gives the new element time to actually mount.
    setTimeout(() => {
      this.grid.scrollToItem(id);
      this.grid.focusItem(id);
    }, 0);
  }

  jumpToFirst(): void {
    this.grid.scrollToItem('0');
    this.grid.focusItem('0');
  }
}
