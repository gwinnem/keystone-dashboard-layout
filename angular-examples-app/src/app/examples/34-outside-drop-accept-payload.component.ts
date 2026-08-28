import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import { readOutsideDropPayload } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';

interface IWidgetPayload {
  kind: string;
  label: string;
}

@Component({
  selector: 'app-outside-drop-accept-payload-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent],
  template: `
    <div class="demo-controls">
      <div class="outside-source outside-source--accepted" draggable="true" (dragstart)="handleDragStart(true, $event)">
        widget (accepted)
      </div>
      <div class="outside-source outside-source--rejected" draggable="true" (dragstart)="handleDragStart(false, $event)">
        not-a-widget (rejected)
      </div>
    </div>

    <div class="drop-zone-frame">
      <kdl-grid-layout
        [allowOutsideDrop]="true"
        [colNum]="12"
        heightMode="fit"
        [layout]="layout"
        (layoutChange)="layout = $event"
        (itemDroppedFromOutside)="handleOutsideDrop($event)"
        [outsideDropAccept]="outsideDropAccept"
        [rowHeight]="60"
        [showGridLines]="true"
      >
        @for (item of layout; track item.i) {
          <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
            <div class="example-item">{{ item.i }}</div>
          </kdl-grid-item>
        }
      </kdl-grid-layout>
    </div>

    <p class="demo-description">Last payload: {{ lastPayload ?? 'none yet' }}</p>
  `,
  styles: [`
    .outside-source {
      border-radius: 6px;
      cursor: grab;
      display: inline-block;
      font-family: var(--kg-font-mono);
      font-size: 12px;
      padding: 6px 12px;
    }
    .drop-zone-frame {
      border: 1px dashed var(--kg-line-light);
      height: 200px;
    }
    .outside-source--accepted {
      background: var(--kg-amber);
      color: #2b1b02;
    }
    .outside-source--rejected {
      background: var(--kg-paper-3);
      border: 1px dashed var(--kg-line-light);
      color: var(--kg-text-lo-light);
      margin-left: 8px;
    }
    .demo-description {
      color: var(--kg-text-lo-light);
      font-size: 12.5px;
      font-family: var(--kg-font-mono);
      margin-top: 12px;
    }
  `],
})
export class OutsideDropAcceptPayloadDemoComponent {
  layout: TLayout = [];
  lastPayload: string | null = null;
  private nextId = 0;

  handleDragStart(isWidget: boolean, event: DragEvent): void {
    const payload: IWidgetPayload = isWidget
      ? { kind: 'widget', label: 'A real widget' }
      : { kind: 'not-a-widget', label: 'Should be rejected' };
    event.dataTransfer?.setData('application/json', JSON.stringify(payload));
    // A second, marker-only MIME type carrying no value of its own —
    // `dataTransfer.types` (unlike `.getData()`) is readable during
    // dragenter/dragover, so this is what `outsideDropAccept` below
    // actually checks. Only the real widget sets it. This mirrors a
    // real bug fix confirmed earlier against a live browser: checking
    // the payload itself here (instead of `.types`) silently rejects
    // every drag, since `.getData()` only returns real values at drop
    // time, not during dragenter/dragover.
    if (isWidget) {
      event.dataTransfer?.setData('application/x-widget', '');
    }
  }

  outsideDropAccept = (dataTransfer: DataTransfer | null): boolean => {
    return !!dataTransfer?.types.includes('application/x-widget');
  };

  handleOutsideDrop({ x, y, w, h, dataTransfer }: { x: number; y: number; w: number; h: number; dataTransfer: DataTransfer | null }): void {
    const payload = readOutsideDropPayload<IWidgetPayload>(dataTransfer, 'application/json');
    this.lastPayload = JSON.stringify(payload);
    this.layout = [...this.layout, { h, i: String(this.nextId), w, x, y }];
    this.nextId += 1;
  }
}
