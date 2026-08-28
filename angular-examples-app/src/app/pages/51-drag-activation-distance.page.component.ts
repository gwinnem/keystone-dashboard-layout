import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { DragActivationDistanceDemoComponent } from '../examples/51-drag-activation-distance.component';

@Component({
  selector: 'app-drag-activation-distance-page',
  standalone: true,
  imports: [ExampleTryItComponent, DragActivationDistanceDemoComponent],
  template: `
    <h1>Drag activation distance</h1>
    <p>
      Minimum pointer movement, in pixels, before a pointerdown is
      treated as a drag rather than a click.
    </p>

    <example-try-it filename="51-drag-activation-distance.component.ts" sourceUrl="/examples-source/51-drag-activation-distance.component.ts">
      <app-drag-activation-distance-demo></app-drag-activation-distance-demo>
    </example-try-it>

    <p>
      Either a single fixed value for every pointer type, or distinct
      values per type via an object (<code>{{ '{ mouse: 3, touch: 12, pen: 3 }' }}</code>),
      set as <code>GridItemComponent</code>'s own direct
      <code>dragActivationDistance</code> input &mdash; unlike the React
      package, this doesn't live on the layout item. <code>null</code>/unset
      (the default) uses a fixed 3px threshold for every pointer type. A
      pointer type left unset in the object form falls back to that
      same 3px default, not <code>0</code>. Useful for touch
      specifically, where a finger's own contact-point jitter is larger
      than a mouse's &mdash; a small, unintentional finger movement
      shouldn't start a drag the way it reasonably can for a precise
      mouse pointer.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class DragActivationDistancePageComponent {}
