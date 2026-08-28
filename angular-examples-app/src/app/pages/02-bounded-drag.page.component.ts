import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { BoundedDragDemoComponent } from '../examples/02-bounded-drag.component';

@Component({
  selector: 'app-bounded-drag-page',
  standalone: true,
  imports: [ExampleTryItComponent, BoundedDragDemoComponent],
  template: `
    <h1>Bounded drag to container</h1>
    <p>
      With <code>isBounded</code> enabled, items can't be dragged past
      the edges of the grid container.
    </p>

    <example-try-it filename="02-bounded-drag.component.ts" sourceUrl="/examples-source/02-bounded-drag.component.ts">
      <app-bounded-drag-demo></app-bounded-drag-demo>
    </example-try-it>

    <blockquote class="tip">
      <strong>Per-item override.</strong>
      <p>
        <code>isBounded</code> can also be set on an individual layout
        item's own <code>isBounded</code> field to bound just that item
        regardless of <code>GridLayoutComponent</code>'s own default —
        leave it unset (the default) to inherit from
        <code>GridLayoutComponent</code>.
      </p>
    </blockquote>
  `,
  styles: [`
    .tip { background: var(--kg-ink-2); border-left: 3px solid var(--kg-blueprint); border-radius: 6px; margin: 24px 0 0; padding: 12px 16px; }
    .tip p { margin: 8px 0 0; }
    code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }
  `],
})
export class BoundedDragPageComponent {}
