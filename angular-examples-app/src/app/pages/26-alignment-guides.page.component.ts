import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { AlignmentGuidesDemoComponent } from '../examples/26-alignment-guides.component';

@Component({
  selector: 'app-alignment-guides-page',
  standalone: true,
  imports: [ExampleTryItComponent, AlignmentGuidesDemoComponent],
  template: `
    <h1>Alignment guides while dragging</h1>
    <p>
      Figma-style guide lines wherever the dragged item's edges align
      with another item's &mdash; purely visual.
    </p>

    <example-try-it filename="26-alignment-guides.component.ts" sourceUrl="/examples-source/26-alignment-guides.component.ts">
      <app-alignment-guides-demo></app-alignment-guides-demo>
    </example-try-it>

    <p>
      Purely visual &mdash; unlike snap to grid, alignment guides never
      change where a dragged item actually lands. Both can be enabled
      together: the guide shows exactly where the magnetic snap is
      about to lock to.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class AlignmentGuidesPageComponent {}
