import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { HorizontalShiftDemoComponent } from '../examples/15-horizontal-shift.component';

@Component({
  selector: 'app-horizontal-shift-page',
  standalone: true,
  imports: [ExampleTryItComponent, HorizontalShiftDemoComponent],
  template: `
    <h1>Horizontal shift</h1>
    <p>
      Pushes colliding items left/right instead of down, during an
      active drag/resize.
    </p>

    <example-try-it filename="15-horizontal-shift.component.ts" sourceUrl="/examples-source/15-horizontal-shift.component.ts">
      <app-horizontal-shift-demo></app-horizontal-shift-demo>
    </example-try-it>

    <p>
      The default collision behavior compacts vertically (colliding
      items get pushed down). <code>horizontalShift</code> changes that
      to push left/right instead &mdash; useful for layouts that read
      more naturally as a single row or a small number of rows.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class HorizontalShiftPageComponent {}
