import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { ResponsivePredefinedLayoutsDemoComponent } from '../examples/09-responsive-predefined-layouts.component';

@Component({
  selector: 'app-responsive-predefined-layouts-page',
  standalone: true,
  imports: [ExampleTryItComponent, ResponsivePredefinedLayoutsDemoComponent],
  template: `
    <h1>Responsive predefined layouts</h1>
    <p>
      Pre-define exactly what each breakpoint's layout looks like,
      instead of relying on auto-generation.
    </p>

    <example-try-it filename="09-responsive-predefined-layouts.component.ts" sourceUrl="/examples-source/09-responsive-predefined-layouts.component.ts">
      <app-responsive-predefined-layouts-demo></app-responsive-predefined-layouts-demo>
    </example-try-it>

    <p>
      Every key is optional &mdash; a breakpoint with no explicit entry
      still gets an auto-generated layout the first time it's entered,
      same as without <code>responsiveLayouts</code> at all. This is
      useful when a narrower breakpoint needs a genuinely different
      arrangement (a different reading order, a deliberately different
      item grouping), not just a reflowed version of the wider one
      auto-generation would produce.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class ResponsivePredefinedLayoutsPageComponent {}
