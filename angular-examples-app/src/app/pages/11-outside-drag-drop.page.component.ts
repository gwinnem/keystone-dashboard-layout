import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { OutsideDragDropDemoComponent } from '../examples/11-outside-drag-drop.component';

@Component({
  selector: 'app-outside-drag-drop-page',
  standalone: true,
  imports: [ExampleTryItComponent, OutsideDragDropDemoComponent],
  template: `
    <h1>Drag, drop from outside</h1>
    <p>
      <code>allowOutsideDrop</code> accepts native HTML5 drag-and-drop
      from anywhere outside the grid system entirely.
    </p>

    <example-try-it filename="11-outside-drag-drop.component.ts" sourceUrl="/examples-source/11-outside-drag-drop.component.ts">
      <app-outside-drag-drop-demo></app-outside-drag-drop-demo>
    </example-try-it>

    <p>
      The source element just needs <code>draggable="true"</code> and a
      real <code>dragstart</code> handler setting some
      <code>dataTransfer</code> payload &mdash; no special integration
      with the grid required on that side.
      <code>itemDroppedFromOutside</code> emits with the grid
      position/size the drop landed at; it's up to your own handler to
      actually push a new layout entry (the library doesn't assume what
      you want to do with the drop).
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class OutsideDragDropPageComponent {}
