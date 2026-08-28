import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { LayoutLifecycleEventsDemoComponent } from '../examples/40-layout-lifecycle-events.component';

@Component({
  selector: 'app-layout-lifecycle-events-page',
  standalone: true,
  imports: [ExampleTryItComponent, LayoutLifecycleEventsDemoComponent],
  template: `
    <h1>Layout lifecycle events</h1>
    <p>
      <code>layoutReady</code> fires once, after every item's size has
      stabilized; <code>layoutChange</code> fires on every subsequent
      change.
    </p>

    <example-try-it filename="40-layout-lifecycle-events.component.ts" sourceUrl="/examples-source/40-layout-lifecycle-events.component.ts">
      <app-layout-lifecycle-events-demo></app-layout-lifecycle-events-demo>
    </example-try-it>

    <p>
      <code>layoutReady</code> is the one worth knowing about
      specifically: it fires exactly once, after the container's width
      is actually known and every item has had a chance to settle its
      own size &mdash; the first point where inspecting final
      positions/sizes is reliable, rather than reading values that are
      still mid-measurement. Every subsequent change is reported
      through the same <code>layoutChange</code> output used
      everywhere else &mdash; there's no separate "mount" event to
      distinguish it from an ordinary update, since
      <code>layoutChange</code> itself isn't called at all until
      something actually changes.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class LayoutLifecycleEventsPageComponent {}
