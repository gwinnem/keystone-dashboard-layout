import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { PluggablePositioningDemoComponent } from '../examples/54-pluggable-positioning.component';

@Component({
  selector: 'app-pluggable-positioning-page',
  standalone: true,
  imports: [ExampleTryItComponent, PluggablePositioningDemoComponent],
  template: `
    <h1>Pluggable positioning</h1>
    <p>
      Switch how items are placed on the page with the
      <code>positionStrategy</code> input: the built-in
      <code>transformStrategy</code> (CSS transforms, the default), the
      built-in <code>topLeftStrategy</code> (plain <code>top</code> /
      <code>left</code>), or a custom strategy that wraps
      <code>topLeftStrategy</code> and adds a dashed outline.
    </p>

    <example-try-it filename="54-pluggable-positioning.component.ts" sourceUrl="/examples-source/54-pluggable-positioning.component.ts">
      <app-pluggable-positioning-demo></app-pluggable-positioning-demo>
    </example-try-it>

    <p>
      A strategy is an object with a <code>type</code>, an optional
      <code>className</code> and a <code>getStyle()</code> function that
      returns the item's inline style. When set, it takes precedence
      over <code>useCssTransforms</code>. Keep <code>width</code> and
      <code>height</code> as <code>'NNpx'</code> strings.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class PluggablePositioningPageComponent {}
