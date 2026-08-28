import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { CrossGridDropRestrictionsDemoComponent } from '../examples/22-cross-grid-drop-restrictions.component';

@Component({
  selector: 'app-cross-grid-drop-restrictions-page',
  standalone: true,
  imports: [ExampleTryItComponent, CrossGridDropRestrictionsDemoComponent],
  template: `
    <h1>Cross-grid drop restrictions</h1>
    <p>
      <code>disableExternalDrop</code> rejects an incoming cross-grid
      drop &mdash; items can still leave, just not arrive.
    </p>

    <example-try-it filename="22-cross-grid-drop-restrictions.component.ts" sourceUrl="/examples-source/22-cross-grid-drop-restrictions.component.ts">
      <app-cross-grid-drop-restrictions-demo></app-cross-grid-drop-restrictions-demo>
    </example-try-it>

    <p>
      <code>disableExternalDrop</code> has no effect unless
      <code>allowCrossGridDrag</code> is also set &mdash; it only
      restricts the <em>incoming</em> direction. An item can still be
      dragged <em>out</em> of a grid with both set, into any other
      <code>allowCrossGridDrag</code> grid that doesn't reject it.
      <code>crossGridDropRejected</code> emits on the target grid with
      the rejected item's id and the <code>layoutId</code> it came
      from.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class CrossGridDropRestrictionsPageComponent {}
