import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { DragAllowIgnoreElementsDemoComponent } from '../examples/05-drag-allow-ignore-elements.component';

@Component({
  selector: 'app-drag-allow-ignore-elements-page',
  standalone: true,
  imports: [ExampleTryItComponent, DragAllowIgnoreElementsDemoComponent],
  template: `
    <h1>Drag allow / ignore elements</h1>
    <p>
      <code>dragAllowFrom</code> restricts dragging to a specific
      handle; <code>dragIgnoreFrom</code> excludes specific
      descendants.
    </p>

    <example-try-it filename="05-drag-allow-ignore-elements.component.ts" sourceUrl="/examples-source/05-drag-allow-ignore-elements.component.ts">
      <app-drag-allow-ignore-elements-demo></app-drag-allow-ignore-elements-demo>
    </example-try-it>

    <p>
      <code>dragAllowFrom</code>/<code>dragIgnoreFrom</code> live on the
      layout item itself (an <code>ILayoutItem</code> field), the same
      shape the React package uses. <code>dragAllowFrom</code>
      restricts dragging to a specific handle (a CSS selector) — unset,
      the default, allows dragging from anywhere on the item except
      where <code>dragIgnoreFrom</code> matches. <code>dragIgnoreFrom</code>
      defaults to <code>a, button</code>, so buttons and links inside an
      item don't accidentally start a drag — has no effect at all once
      <code>dragAllowFrom</code> is set, since an explicit allow-list
      already restricts the surface to one handle.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class DragAllowIgnoreElementsPageComponent {}
