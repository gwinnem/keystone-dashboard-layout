import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { BorderRadiusDemoComponent } from '../examples/14-border-radius.component';

@Component({
  selector: 'app-border-radius-page',
  standalone: true,
  imports: [ExampleTryItComponent, BorderRadiusDemoComponent],
  template: `
    <h1>Border radius</h1>
    <p>
      Setting <code>useBorderRadius</code>/<code>borderRadiusPx</code>
      on <code>GridLayoutComponent</code> cascades to every item that
      doesn't set its own.
    </p>

    <example-try-it filename="14-border-radius.component.ts" sourceUrl="/examples-source/14-border-radius.component.ts">
      <app-border-radius-demo></app-border-radius-demo>
    </example-try-it>

    <p>
      Setting <code>useBorderRadius</code>/<code>borderRadiusPx</code>
      on <code>GridLayoutComponent</code> cascades to every
      <code>GridItemComponent</code> that doesn't set its own (unset,
      the default), the same inherit pattern as
      <code>isDraggable</code>/<code>isResizable</code>. Setting either
      input directly on a specific item overrides that inherited
      default for just that one item.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class BorderRadiusPageComponent {}
