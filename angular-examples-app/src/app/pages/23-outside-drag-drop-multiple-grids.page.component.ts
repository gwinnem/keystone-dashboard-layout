import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { OutsideDragDropMultipleGridsDemoComponent } from '../examples/23-outside-drag-drop-multiple-grids.component';

@Component({
  selector: 'app-outside-drag-drop-multiple-grids-page',
  standalone: true,
  imports: [ExampleTryItComponent, OutsideDragDropMultipleGridsDemoComponent],
  template: `
    <h1>Drag, drop from outside into multiple grids</h1>
    <p>
      Each grid independently decides whether to accept a native drag
      released over it.
    </p>

    <example-try-it filename="23-outside-drag-drop-multiple-grids.component.ts" sourceUrl="/examples-source/23-outside-drag-drop-multiple-grids.component.ts">
      <app-outside-drag-drop-multiple-grids-demo></app-outside-drag-drop-multiple-grids-demo>
    </example-try-it>

    <p>
      No coordination is needed between the two grids &mdash; each
      independently listens for a drop over its own root element and
      emits its own <code>itemDroppedFromOutside</code> only if the
      release actually happened over it. Releasing between them, or
      over neither, drops nothing on either side.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class OutsideDragDropMultipleGridsPageComponent {}
