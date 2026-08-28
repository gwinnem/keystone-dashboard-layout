import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { ExampleToggleComponent } from '../harness/example-toggle.component';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: (TLayout[number] & { label: string })[] = [
  { h: 1, i: '0', label: 'Revenue', w: 4, x: 0, y: 0 },
  { h: 1, i: '1', label: 'Active users', w: 4, x: 4, y: 0 },
  { h: 1, i: '2', label: 'Signups', w: 4, x: 8, y: 0 },
  { h: 3, i: '3', label: 'Traffic over time', w: 8, x: 0, y: 1 },
  { h: 3, i: '4', label: 'Top referrers', w: 4, x: 8, y: 1 },
];

@Component({
  selector: 'app-edit-mode-toggle-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleToggleComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <example-toggle [checked]="editMode" (checkedChange)="editMode = $event" label="Edit mode"></example-toggle>
    </div>

    <kdl-grid-layout [colNum]="12" [enableEditMode]="editMode" [layout]="layout" (layoutChange)="onLayoutChange($event)" [rowHeight]="60" [showCloseButton]="editMode" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" (removeItem)="removeItem($event)">
          <div class="example-item" [class.example-item--static]="!editMode">{{ item.label }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .example-item--static {
      background: var(--kg-paper-3);
    }
  `],
})
export class EditModeToggleDemoComponent {
  editMode = false;
  layout = initialLayout;

  // (layoutChange) emits a plain TLayout — the library itself never
  // reads or writes consumer-defined extra fields like `label`, so a
  // plain reassignment here would lose them type-wise. Merging the
  // incoming x/y/w/h back onto the existing, label-carrying items is
  // what keeps both in sync.
  onLayoutChange(next: TLayout): void {
    this.layout = next.map((item) => ({ ...item, label: this.layout.find((existing) => existing.i === item.i)?.label ?? String(item.i) }));
  }

  // Bug fix: this used to render a fully-working, clickable close
  // button once edit mode was on, but nothing was listening for
  // (removeItem) at all — the click handler fired every time,
  // correctly gated on edit mode being on, but the item was never
  // actually removed from layout, since there was no listener to do
  // that removal.
  removeItem(id: string | number): void {
    this.layout = this.layout.filter((item) => item.i !== id);
  }
}
