import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { AddRemoveItemsDemoComponent } from '../examples/10-add-remove-items.component';

@Component({
  selector: 'app-add-remove-items-page',
  standalone: true,
  imports: [ExampleTryItComponent, AddRemoveItemsDemoComponent],
  template: `
    <h1>Add or remove items</h1>
    <p>
      A real first-fit bin-pack &mdash; removing an item from the middle
      of the grid opens a gap the next added item actually reuses.
    </p>

    <example-try-it filename="10-add-remove-items.component.ts" sourceUrl="/examples-source/10-add-remove-items.component.ts">
      <app-add-remove-items-demo></app-add-remove-items-demo>
    </example-try-it>

    <p>
      Where a newly-added item actually lands is entirely up to the
      consumer &mdash; the library only places it wherever <code>x</code>/<code>y</code>
      say to, then compacts around it. Appending with <code>x:0, y:0</code>
      (or <code>y: Infinity</code>, placed at the very bottom instead)
      and letting compaction settle it is the simplest convention, but
      it never <em>reuses a gap</em> left by a removed item &mdash; a new
      item always lands in a fresh row even when there's clearly room
      higher up.
    </p>
    <p>
      This demo's own <code>addItem</code> does a real first-fit bin-pack
      instead, via this package's own exported <code>findFirstFitSlot</code>
      (from <code>&#64;keystone-dashboard-layout/core</code>): remove an
      item from the middle of the grid, then add a new one, and it
      lands in the gap left behind. The toggle demonstrates a second
      placement strategy &mdash; appending to the end of the first row
      specifically, falling back to the general bin-pack once that row
      is full.
    </p>
    <p>
      The two strategies only produce a <em>visibly different</em> result
      once there's an actual gap for them to disagree about &mdash; on a
      fresh, packed layout, both fill the first row left-to-right and
      wrap to a new row the same way, so toggling it on or off looks
      identical. To see the difference: remove item <code>1</code>
      (opening a gap at <code>x:3</code>), leave the toggle on, then add
      an item &mdash; it skips that gap and lands past the row's own
      rightmost occupied edge instead, rather than filling it the way
      the general bin-pack would.
    </p>
    <p>
      The close button's <code>(removeItem)</code> output fires when
      clicked (<code>showCloseButton</code> is on) &mdash; pair it with a
      <code>.filter()</code> the same way as above; it deliberately
      doesn't remove anything from <code>layout</code> itself.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class AddRemoveItemsPageComponent {}
