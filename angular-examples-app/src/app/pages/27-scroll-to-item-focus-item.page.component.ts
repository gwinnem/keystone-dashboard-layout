import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { ScrollToItemFocusItemDemoComponent } from '../examples/27-scroll-to-item-focus-item.component';

@Component({
  selector: 'app-scroll-to-item-focus-item-page',
  standalone: true,
  imports: [ExampleTryItComponent, ScrollToItemFocusItemDemoComponent],
  template: `
    <h1>scrollToItem & focusItem</h1>
    <p>
      Scroll a possibly off-screen item into view, or move keyboard
      focus straight to it.
    </p>

    <example-try-it filename="27-scroll-to-item-focus-item.component.ts" sourceUrl="/examples-source/27-scroll-to-item-focus-item.component.ts">
      <app-scroll-to-item-focus-item-demo></app-scroll-to-item-focus-item-demo>
    </example-try-it>

    <p>
      Both methods are public members on <code>GridLayoutComponent</code>,
      reached through a template reference variable (<code>#grid</code>)
      &mdash; the Angular equivalent of Vue's template-ref methods or
      React's imperative handle. <code>scrollToItem</code> scrolls the
      item's nearest scrollable ancestor; <code>focusItem</code>
      additionally moves keyboard focus to it, useful for jumping
      straight into keyboard move/resize on a specific item without
      tabbing through everything before it.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class ScrollToItemFocusItemPageComponent {}
