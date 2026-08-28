import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { LayoutBoundsRenderingOptionsDemoComponent } from '../examples/41-layout-bounds-rendering-options.component';

@Component({
  selector: 'app-layout-bounds-rendering-options-page',
  standalone: true,
  imports: [ExampleTryItComponent, LayoutBoundsRenderingOptionsDemoComponent],
  template: `
    <h1>Layout bounds & rendering options</h1>
    <p>
      <code>maxRows</code> caps growth; <code>distributeEvenly</code>
      spreads overflow items instead of clamping; <code>useCssTransforms</code>
      toggles the positioning strategy.
    </p>

    <example-try-it filename="41-layout-bounds-rendering-options.component.ts" sourceUrl="/examples-source/41-layout-bounds-rendering-options.component.ts">
      <app-layout-bounds-rendering-options-demo></app-layout-bounds-rendering-options-demo>
    </example-try-it>

    <p>
      <code>useCssTransforms</code> (default <code>true</code>)
      positions items via CSS <code>transform</code> instead of
      <code>top</code>/<code>left</code> &mdash; reactive after mount,
      toggling it live re-applies to every already-mounted item, not
      just ones rendered after the change.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class LayoutBoundsRenderingOptionsPageComponent {}
