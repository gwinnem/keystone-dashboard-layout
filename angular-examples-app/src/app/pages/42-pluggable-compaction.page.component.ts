import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { PluggableCompactionDemoComponent } from '../examples/42-pluggable-compaction.component';

@Component({
  selector: 'app-pluggable-compaction-page',
  standalone: true,
  imports: [ExampleTryItComponent, PluggableCompactionDemoComponent],
  template: `
    <h1>Pluggable compaction (compactType & compactor)</h1>
    <p>
      Five built-in strategies via <code>compactType</code>, or replace
      the algorithm entirely with a custom <code>ICompactor</code>.
    </p>

    <example-try-it filename="42-pluggable-compaction.component.ts" sourceUrl="/examples-source/42-pluggable-compaction.component.ts">
      <app-pluggable-compaction-demo></app-pluggable-compaction-demo>
    </example-try-it>

    <p>
      <code>compactor</code> is a purely additive override &mdash;
      <code>null</code> (the default) means "use whichever built-in
      strategy <code>compactType</code> selects," so the two inputs are
      never in conflict. A custom compactor's
      <code>compact(layout, cols, context)</code> must return a new
      array, never mutate <code>layout</code> or its items in place.
      Runs at every trigger point the built-in strategies already run
      at: drag/resize end, item add/remove, mount, breakpoint change,
      and <code>compactNow()</code>/<code>rearrange()</code>.
    </p>

    <p>
      Both <code>ECompactType</code> and <code>ICompactor</code> come
      from <code>&#64;keystone-dashboard-layout/core</code> &mdash;
      this package doesn't re-export them through its own barrel.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class PluggableCompactionPageComponent {}
