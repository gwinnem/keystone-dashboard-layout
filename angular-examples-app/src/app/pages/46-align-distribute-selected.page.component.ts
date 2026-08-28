import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { AlignDistributeSelectedDemoComponent } from '../examples/46-align-distribute-selected.component';

@Component({
  selector: 'app-align-distribute-selected-page',
  standalone: true,
  imports: [ExampleTryItComponent, AlignDistributeSelectedDemoComponent],
  template: `
    <h1>Align & distribute selected items</h1>
    <p>
      <code>alignSelected</code>/<code>distributeSelected</code>
      &mdash; align a multi-selection to an edge, or evenly distribute
      the ones between the outermost two.
    </p>

    <example-try-it filename="46-align-distribute-selected.component.ts" sourceUrl="/examples-source/46-align-distribute-selected.component.ts">
      <app-align-distribute-selected-demo></app-align-distribute-selected-demo>
    </example-try-it>

    <p>
      Both are public members on <code>GridLayoutComponent</code>,
      reached through a template reference variable, only meaningful
      with <code>multiSelect</code> on. <code>alignSelected</code>
      treats the first-selected item (insertion order, not an
      arbitrary one) as the anchor &mdash; it never moves; every other
      selected item aligns to its edge or center. Needs at least 2
      selected items to do anything.
    </p>

    <p>
      <code>distributeSelected</code> needs at least 3 &mdash; the two
      outermost items (by actual position, not selection order) stay
      exactly where they are, and only what's "in between" spaces out
      evenly across the span those two already define, the standard
      design-tool "distribute" behavior.
    </p>

    <p>
      Both respect <code>preventCollision</code> when it's on &mdash;
      an adjustment that would land an item on top of a non-selected
      item is skipped for that one item; landing on another item that's
      also part of the same align/distribute batch isn't treated as a
      collision at all, since that's frequently the whole point of the
      command.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class AlignDistributeSelectedPageComponent {}
