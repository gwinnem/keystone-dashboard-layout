import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { CloseButtonDemoComponent } from '../examples/13-close-button.component';

@Component({
  selector: 'app-close-button-page',
  standalone: true,
  imports: [ExampleTryItComponent, CloseButtonDemoComponent],
  template: `
    <h1>Show close button</h1>
    <p>
      Setting <code>showCloseButton</code> on
      <code>GridLayoutComponent</code> controls the default for every
      item that doesn't set its own.
    </p>

    <example-try-it filename="13-close-button.component.ts" sourceUrl="/examples-source/13-close-button.component.ts">
      <app-close-button-demo></app-close-button-demo>
    </example-try-it>

    <p>
      Setting <code>showCloseButton</code> on
      <code>GridLayoutComponent</code> (rather than on every individual
      <code>GridItemComponent</code>) controls the default for every
      item that doesn't set its own &mdash; a specific item's own
      <code>showCloseButton</code> input always overrides it, same as
      <code>isDraggable</code>/<code>isResizable</code>/<code>isBounded</code>.
      Toggling the control above demonstrates exactly this: no item in
      this example sets its own <code>showCloseButton</code>, so all
      three follow the grid's default at once.
    </p>

    <p>
      There's no separate exported close-button component to swap
      in &mdash; the <code>(removeItem)</code> output deliberately
      doesn't remove anything from <code>layout</code> itself, so
      pairing it with your own <code>.filter()</code> (as this example
      does) is the whole customization surface.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class CloseButtonPageComponent {}
