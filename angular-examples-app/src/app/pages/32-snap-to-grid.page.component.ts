import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { SnapToGridDemoComponent } from '../examples/32-snap-to-grid.component';

@Component({
  selector: 'app-snap-to-grid-page',
  standalone: true,
  imports: [ExampleTryItComponent, SnapToGridDemoComponent],
  template: `
    <h1>Snap to grid</h1>
    <p>
      Magnetic snapping during drag &mdash; distinct from alignment
      guides, which never change where an item lands.
    </p>

    <example-try-it filename="32-snap-to-grid.component.ts" sourceUrl="/examples-source/32-snap-to-grid.component.ts">
      <app-snap-to-grid-demo></app-snap-to-grid-demo>
    </example-try-it>

    <p>
      <code>snapThreshold</code> is how close, in grid units, a dragged
      item's edge needs to be to another item's edge before it snaps
      &mdash; default <code>1</code>. Unlike alignment guides
      (<code>showAlignmentGuides</code>, purely visual), this actually
      changes where the item lands: once the pointer's dragged-to
      position is within threshold of an edge alignment, the position
      adjusts to match it exactly, both live while dragging and in the
      final committed position on drop.
    </p>

    <p>
      Both features can be on at the same time &mdash; the visual guide
      showing exactly where the magnetic snap is about to lock to.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class SnapToGridPageComponent {}
