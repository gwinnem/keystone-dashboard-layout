import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { CrossGridDragDropDemoComponent } from '../examples/12-cross-grid-drag-drop.component';

@Component({
  selector: 'app-cross-grid-drag-drop-page',
  standalone: true,
  imports: [ExampleTryItComponent, CrossGridDragDropDemoComponent],
  template: `
    <h1>Drag, drop from grid to grid</h1>
    <p>
      Both grids set <code>allowCrossGridDrag</code> &mdash; drag an
      item from one into the other.
    </p>

    <example-try-it filename="12-cross-grid-drag-drop.component.ts" sourceUrl="/examples-source/12-cross-grid-drag-drop.component.ts">
      <app-cross-grid-drag-drop-demo></app-cross-grid-drag-drop-demo>
    </example-try-it>

    <blockquote class="caution">
      <strong>Must be set on both grids.</strong>
      <p>
        A drop onto a grid that doesn't have <code>allowCrossGridDrag</code>
        set is indistinguishable from dropping on empty space.
        <code>layoutId</code> gives each grid a stable identifier used
        in the <code>crossGridItemDropped</code>/<code>crossGridDropRejected</code>
        payloads to say which grid an item came from &mdash; omit it and
        one is auto-generated. Each grid removes/inserts the moved item
        from its own <code>layout</code> state internally &mdash; no
        extra glue code needed on either side beyond the inputs shown
        here.
      </p>
    </blockquote>
  `,
  styles: [`
    .caution { background: var(--kg-ink-2); border-left: 3px solid var(--kg-amber); border-radius: 6px; margin: 24px 0 0; padding: 12px 16px; }
    .caution p { margin: 8px 0 0; }
    code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }
  `],
})
export class CrossGridDragDropPageComponent {}
