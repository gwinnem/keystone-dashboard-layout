import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { PerItemAutoHeightDemoComponent } from '../examples/31-per-item-auto-height.component';

@Component({
  selector: 'app-per-item-auto-height-page',
  standalone: true,
  imports: [ExampleTryItComponent, PerItemAutoHeightDemoComponent],
  template: `
    <h1>Per-item autoHeight</h1>
    <p>
      A real <code>ResizeObserver</code> on the item's own content, not
      a one-time measurement.
    </p>

    <example-try-it filename="31-per-item-auto-height.component.ts" sourceUrl="/examples-source/31-per-item-auto-height.component.ts">
      <app-per-item-auto-height-demo></app-per-item-auto-height-demo>
    </example-try-it>

    <p>
      Unlike the React package (where <code>autoHeight</code> is set on
      the layout item itself, since <code>GridItem</code> only takes
      <code>i</code>), <code>autoHeight</code> here is
      <code>GridItemComponent</code>'s own direct input &mdash; the
      same shape Vue uses. Live-resyncing &mdash; it keeps watching the
      item's own content via a real <code>ResizeObserver</code>, so an
      item grows or shrinks automatically as its content changes after
      mount, not just once when it first renders. Pairs naturally with
      dynamic content whose size isn't known upfront (a loaded chart,
      an expanding text block, an async list).
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class PerItemAutoHeightPageComponent {}
