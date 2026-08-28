import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { RestrictResizeHandlesDemoComponent } from '../examples/52-restrict-resize-handles.component';

@Component({
  selector: 'app-restrict-resize-handles-page',
  standalone: true,
  imports: [ExampleTryItComponent, RestrictResizeHandlesDemoComponent],
  template: `
    <h1>Restricting resize handles to specific edges</h1>
    <p>
      <code>resizeHandles</code> restricts which of the 8 edges/corners
      actually resize &mdash; distinct from
      <code>showResizeHandles</code>'s show/hide visibility toggle.
    </p>

    <example-try-it filename="52-restrict-resize-handles.component.ts" sourceUrl="/examples-source/52-restrict-resize-handles.component.ts">
      <app-restrict-resize-handles-demo></app-restrict-resize-handles-demo>
    </example-try-it>

    <p>
      Distinct from the earlier resize-hint appearance example
      (<code>showResizeHandles</code>, an all-or-nothing show/hide
      toggle for the visible affordance): this restricts which handles
      actually activate at all, as
      <code>GridItemComponent</code>'s own direct
      <code>resizeHandles</code> input. Default all 8
      (<code>'n'</code>/<code>'s'</code>/<code>'e'</code>/<code>'w'</code>/<code>'ne'</code>/<code>'nw'</code>/<code>'se'</code>/<code>'sw'</code>).
      An empty array (<code>[]</code>) is a deliberate, valid "no
      handle-driven resize for this item" value, distinct from
      <code>isResizable: false</code> &mdash; keyboard arrow-key resize
      still works with <code>[]</code>; it doesn't with
      <code>isResizable: false</code>.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class RestrictResizeHandlesPageComponent {}
