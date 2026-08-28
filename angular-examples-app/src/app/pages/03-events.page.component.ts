import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { EventsDemoComponent } from '../examples/03-events.component';

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [ExampleTryItComponent, EventsDemoComponent],
  template: `
    <h1>Events</h1>
    <p>
      Per-item <code>(itemMoved)</code>/<code>(itemResized)</code>
      outputs on <code>GridItemComponent</code>, alongside
      <code>GridLayoutComponent</code>'s own broader output set.
    </p>

    <example-try-it filename="03-events.component.ts" sourceUrl="/examples-source/03-events.component.ts">
      <app-events-demo></app-events-demo>
    </example-try-it>

    <p>
      <code>(itemMoved)</code>/<code>(itemResized)</code> fire directly
      on the <code>GridItemComponent</code> that moved or resized, with
      its own final grid-unit position/size &mdash; matching Vue's own
      <code>&#64;item-moved</code>/<code>&#64;resized</code> shape. Emitted at
      the moment that item's own drag/resize commits, using its own
      locally-computed, pre-compaction value &mdash; a convenience for
      "just tell me when <em>this</em> item moved," not a replacement
      for <code>GridLayoutComponent</code>'s own <code>layoutChange</code>,
      which remains the source of truth for the fully-compacted result
      (including any knock-on repositioning of other items).
    </p>

    <p>
      <code>GridLayoutComponent</code> itself exposes a broader set of
      outputs too &mdash; <code>layoutChange</code>,
      <code>dragStart</code>/<code>dragMove</code>/<code>dragEnd</code>,
      <code>moveBlockedByCollision</code>, and more &mdash; for anyone
      who wants layout-level granularity instead of per-item.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class EventsPageComponent {}
