import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { PerItemZIndexDemoComponent } from '../examples/49-per-item-z-index.component';

@Component({
  selector: 'app-per-item-z-index-page',
  standalone: true,
  imports: [ExampleTryItComponent, PerItemZIndexDemoComponent],
  template: `
    <h1>Per-item zIndex override</h1>
    <p>
      An explicit stacking-order override that wins over the library's
      own implicit static/dragging/resizing rules.
    </p>

    <example-try-it filename="49-per-item-z-index.component.ts" sourceUrl="/examples-source/49-per-item-z-index.component.ts">
      <app-per-item-z-index-demo></app-per-item-z-index-demo>
    </example-try-it>

    <p>
      <code>null</code>/unset (the default) means no override at all
      &mdash; the item falls back to the library's own implicit
      handling (static items sit at <code>-1</code>, an actively
      resizing item briefly rises to <code>3</code>, everything else
      uses normal DOM-order stacking). An explicit value set on the
      layout item always wins over both of those, regardless of the
      item's current static/resizing state &mdash; useful for pinning
      one panel permanently above every other, including while others
      are mid-drag or mid-resize.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class PerItemZIndexPageComponent {}
