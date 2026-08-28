import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { SpacingIndicatorsDemoComponent } from '../examples/47-spacing-indicators.component';

@Component({
  selector: 'app-spacing-indicators-page',
  standalone: true,
  imports: [ExampleTryItComponent, SpacingIndicatorsDemoComponent],
  template: `
    <h1>Spacing indicators</h1>
    <p>
      A labeled distance badge in the gap to the nearest neighbor on
      each side &mdash; an independently toggleable sibling to
      alignment guides.
    </p>

    <example-try-it filename="47-spacing-indicators.component.ts" sourceUrl="/examples-source/47-spacing-indicators.component.ts">
      <app-spacing-indicators-demo></app-spacing-indicators-demo>
    </example-try-it>

    <p>
      Distinct from alignment guides: that feature visualizes edges
      lining up between two items, purely visually. This one labels
      the size of a gap (e.g. "2 cols") between the item currently
      being dragged/resized and its nearest neighbor on each side
      &mdash; a different concept, independently toggleable, and can be
      combined with alignment guides at the same time.
    </p>

    <p>
      Only the nearest neighbor per side is labeled, not every item on
      that side &mdash; a distance label to everything nearby would be
      visual noise, not useful feedback.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class SpacingIndicatorsPageComponent {}
