import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { GridDimensionsDemoComponent } from '../examples/44-grid-dimensions.component';

@Component({
  selector: 'app-grid-dimensions-page',
  standalone: true,
  imports: [ExampleTryItComponent, GridDimensionsDemoComponent],
  template: `
    <h1>Grid dimensions (rowHeight, colNum, margin)</h1>
    <p>
      The three core sizing inputs every grid uses, adjustable live.
    </p>

    <example-try-it filename="44-grid-dimensions.component.ts" sourceUrl="/examples-source/44-grid-dimensions.component.ts">
      <app-grid-dimensions-demo></app-grid-dimensions-demo>
    </example-try-it>

    <p>
      All three are fully reactive after mount &mdash; changing any of
      them recomputes every item's pixel position/size live, not just
      for items added afterward. <code>margin</code> is
      <code>[horizontal, vertical]</code>, both in pixels.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class GridDimensionsPageComponent {}
