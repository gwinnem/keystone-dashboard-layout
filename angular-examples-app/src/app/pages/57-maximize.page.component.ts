import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { MaximizeDemoComponent } from '../examples/57-maximize.component';

@Component({
  selector: 'app-maximize-page',
  standalone: true,
  imports: [ExampleTryItComponent, MaximizeDemoComponent],
  template: `
    <h1>Maximize &amp; restore</h1>
    <p>
      Click the button in a card's corner to make it fill the grid; click it again, or press
      Escape, to put everything back. The other cards are hidden but stay mounted, so
      whatever is inside them keeps its state. Add an item while one is maximized: nothing is
      compacted until you restore.
    </p>

    <example-try-it filename="57-maximize.component.ts" sourceUrl="/examples-source/57-maximize.component.ts">
      <app-maximize-demo></app-maximize-demo>
    </example-try-it>

    <p>
      Set <code>showMaximizeButton</code> on the grid (or on a single item) for the built-in
      button, or drive it yourself with <code>[(maximizedItem)]</code> and the
      <code>maximize(id)</code>, <code>restore()</code> and <code>toggleMaximize(id)</code>
      methods. <code>layout</code> is never changed by maximizing, so restoring is exact.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class MaximizePageComponent {}
