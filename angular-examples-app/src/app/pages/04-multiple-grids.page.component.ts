import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { MultipleGridsDemoComponent } from '../examples/04-multiple-grids.component';

@Component({
  selector: 'app-multiple-grids-page',
  standalone: true,
  imports: [ExampleTryItComponent, MultipleGridsDemoComponent],
  template: `
    <h1>Multiple grids</h1>
    <p>
      Each <code>GridLayoutComponent</code> is fully independent —
      grids never share state, so there's nothing to namespace or
      configure.
    </p>

    <example-try-it filename="04-multiple-grids.component.ts" sourceUrl="/examples-source/04-multiple-grids.component.ts">
      <app-multiple-grids-demo></app-multiple-grids-demo>
    </example-try-it>

    <blockquote class="caution">
      <strong>Not the same as dragging between grids.</strong>
      <p>
        This just shows two grids side by side. For actually dragging
        an item <em>from</em> one grid <em>into</em> another, see
        <code>allowCrossGridDrag</code>/<code>disableExternalDrop</code>
        — cross-grid dragging works the same way, using the source
        grid's own drag event and the target grid's layout array.
      </p>
    </blockquote>
  `,
  styles: [`
    .caution { background: var(--kg-ink-2); border-left: 3px solid var(--kg-amber); border-radius: 6px; margin: 24px 0 0; padding: 12px 16px; }
    .caution p { margin: 8px 0 0; }
    code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }
  `],
})
export class MultipleGridsPageComponent {}
