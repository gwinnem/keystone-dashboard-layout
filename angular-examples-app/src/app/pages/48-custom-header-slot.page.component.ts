import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { CustomHeaderSlotDemoComponent } from '../examples/48-custom-header-slot.component';

@Component({
  selector: 'app-custom-header-slot-page',
  standalone: true,
  imports: [ExampleTryItComponent, CustomHeaderSlotDemoComponent],
  template: `
    <h1>Custom header</h1>
    <p>
      A marker directive (<code>[kdlGridItemHeader]</code>) renders a
      separate region above an item's own main content.
    </p>

    <example-try-it filename="48-custom-header-slot.component.ts" sourceUrl="/examples-source/48-custom-header-slot.component.ts">
      <app-custom-header-slot-demo></app-custom-header-slot-demo>
    </example-try-it>

    <p>
      Unlike the React package's own <code>header</code> render prop,
      Angular has no direct equivalent of a reactive named-slot check,
      so a dedicated marker directive exists purely so
      <code>GridItemComponent</code> can detect whether anything was
      actually projected. Mark your own header content with
      <code>[kdlGridItemHeader]</code> anywhere inside a
      <code>kdl-grid-item</code>'s content &mdash; everything else
      becomes the scrollable body below it.
    </p>

    <p>
      Only affects layout when actually used &mdash; the no-header case
      renders identically to before this directive existed. When used,
      <code>GridItemComponent</code> switches to a vertical flex
      layout: the header shrinks to fit its own content, and the rest
      of the item's content (wrapped in its own scrollable region)
      takes whatever space remains, rather than pushing the item's own
      fixed pixel height (which the grid's layout math depends on
      staying accurate).
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class CustomHeaderSlotPageComponent {}
