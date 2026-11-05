import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { AutoScrollDemoComponent } from '../examples/39-auto-scroll.component';

@Component({
  selector: 'app-auto-scroll-page',
  standalone: true,
  imports: [ExampleTryItComponent, AutoScrollDemoComponent],
  template: `
    <h1>autoScroll</h1>
    <p>
      Dragging or resizing near the edge of a scrollable container
      scrolls it automatically.
    </p>

    <example-try-it filename="39-auto-scroll.component.ts" sourceUrl="/examples-source/39-auto-scroll.component.ts">
      <app-auto-scroll-demo></app-auto-scroll-demo>
    </example-try-it>

    <p>
      <code>autoScroll</code> is an input on both
      <code>GridItemComponent</code> and <code>GridLayoutComponent</code>:
      the grid-wide value is inherited by every item that leaves its own
      value <code>null</code>, and an item's own value overrides it.
      Scrolls the item's nearest scrollable ancestor, not necessarily
      the whole page. Off by default, since a plain page-level grid usually has
      nothing to scroll; turn it on for items living inside a
      fixed-height, overflow-scrolling container.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class AutoScrollPageComponent {}
