import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { GridLinesDemoComponent } from '../examples/16-grid-lines.component';

@Component({
  selector: 'app-grid-lines-page',
  standalone: true,
  imports: [ExampleTryItComponent, GridLinesDemoComponent],
  template: `
    <h1>Show grid lines</h1>
    <p>
      Toggles a visible column/row grid guide behind every item, useful
      while building a layout or as a permanent visual aid.
    </p>

    <example-try-it filename="16-grid-lines.component.ts" sourceUrl="/examples-source/16-grid-lines.component.ts">
      <app-grid-lines-demo></app-grid-lines-demo>
    </example-try-it>

    <p>
      <code>showGridLines</code> toggles a <code>kdl-grid-lines</code>
      class on the container, sized via two CSS custom properties this
      package computes from the grid's actual
      <code>colNum</code>/<code>rowHeight</code>/<code>margin</code> at
      render time &mdash; not a fixed pattern, so the lines always line
      up with the real column/row boundaries regardless of how the grid
      is configured.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class GridLinesPageComponent {}
