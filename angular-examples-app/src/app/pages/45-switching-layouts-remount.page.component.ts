import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { SwitchingLayoutsRemountDemoComponent } from '../examples/45-switching-layouts-remount.component';

@Component({
  selector: 'app-switching-layouts-remount-page',
  standalone: true,
  imports: [ExampleTryItComponent, SwitchingLayoutsRemountDemoComponent],
  template: `
    <h1>Switching layouts & forcing a remount</h1>
    <p>
      A plain field reassignment handles switching layouts &mdash; a
      structural <code>&#64;if</code> toggle forces a genuine remount
      when internal state needs resetting too.
    </p>

    <example-try-it filename="45-switching-layouts-remount.component.ts" sourceUrl="/examples-source/45-switching-layouts-remount.component.ts">
      <app-switching-layouts-remount-demo></app-switching-layouts-remount-demo>
    </example-try-it>

    <p>
      Switching between entirely different layouts is just a normal
      field reassignment &mdash; no remount needed, and the component
      correctly reacts to the wholesale replacement. Angular has no
      literal <code>key</code> prop for a single element the way React
      does; toggling a structural <code>&#64;if</code> off then back on
      is this package's own equivalent, genuinely destroying and
      recreating the component (running its lifecycle hooks again)
      rather than just updating its inputs in place &mdash; useful for
      resetting internal component state (an in-progress drag, measured
      width, undo history) that a data change alone wouldn't touch, not
      something to reach for by default just to change what's
      displayed.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class SwitchingLayoutsRemountPageComponent {}
