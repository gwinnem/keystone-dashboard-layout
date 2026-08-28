import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { ResponsiveBreakpointsDemoComponent } from '../examples/07-responsive-breakpoints.component';

@Component({
  selector: 'app-responsive-breakpoints-page',
  standalone: true,
  imports: [ExampleTryItComponent, ResponsiveBreakpointsDemoComponent],
  template: `
    <h1>Responsive breakpoints</h1>
    <p>
      Auto-generate a layout per breakpoint, based on container-width
      thresholds.
    </p>

    <example-try-it filename="07-responsive-breakpoints.component.ts" sourceUrl="/examples-source/07-responsive-breakpoints.component.ts">
      <app-responsive-breakpoints-demo></app-responsive-breakpoints-demo>
    </example-try-it>

    <p>
      <code>responsive</code> enables breakpoint switching using the
      <code>breakpoints</code>/<code>cols</code> inputs (both default to
      a standard 7-tier scale &mdash; <code>xxl</code>/<code>xl</code>/<code>lg</code>/<code>md</code>/<code>sm</code>/<code>xs</code>/<code>xxs</code>).
      When the container's measured width crosses a threshold, the
      layout regenerates for the new breakpoint's column count, and
      <code>breakpointChanged</code> emits the new breakpoint name.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class ResponsiveBreakpointsPageComponent {}
