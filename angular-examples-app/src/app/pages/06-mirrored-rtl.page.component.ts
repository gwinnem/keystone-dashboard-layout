import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { MirroredRtlDemoComponent } from '../examples/06-mirrored-rtl.component';

@Component({
  selector: 'app-mirrored-rtl-page',
  standalone: true,
  imports: [ExampleTryItComponent, MirroredRtlDemoComponent],
  template: `
    <h1>Mirrored (RTL)</h1>
    <p>
      <code>isMirrored</code> flips the entire grid for right-to-left
      locales &mdash; anchor edges, resize direction, and drag math all
      reverse together.
    </p>

    <example-try-it filename="06-mirrored-rtl.component.ts" sourceUrl="/examples-source/06-mirrored-rtl.component.ts">
      <app-mirrored-rtl-demo></app-mirrored-rtl-demo>
    </example-try-it>

    <p>
      A layout item can also opt out individually with its own
      <code>isMirrored</code> field (default <code>true</code>, meaning
      it participates), if you want most of a layout mirrored but a
      specific item to stay pinned to its literal <code>x</code>
      position.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class MirroredRtlPageComponent {}
