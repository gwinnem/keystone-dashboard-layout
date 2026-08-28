import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { SizeConstraintsAspectRatioDemoComponent } from '../examples/38-size-constraints-aspect-ratio.component';

@Component({
  selector: 'app-size-constraints-aspect-ratio-page',
  standalone: true,
  imports: [ExampleTryItComponent, SizeConstraintsAspectRatioDemoComponent],
  template: `
    <h1>Size constraints & aspect ratio</h1>
    <p>
      <code>minW</code>/<code>maxW</code>/<code>minH</code>/<code>maxH</code>
      clamp resize bounds; <code>preserveAspectRatio</code> locks the
      width/height ratio while resizing.
    </p>

    <example-try-it filename="38-size-constraints-aspect-ratio.component.ts" sourceUrl="/examples-source/38-size-constraints-aspect-ratio.component.ts">
      <app-size-constraints-aspect-ratio-demo></app-size-constraints-aspect-ratio-demo>
    </example-try-it>

    <p>
      The four size-constraint fields live on the layout item itself
      and default to <code>1</code>/<code>Infinity</code> respectively
      (effectively unconstrained), applying during both mouse/touch
      resize and keyboard resize.
      <code>preserveAspectRatio</code> &mdash; a direct
      <code>GridItemComponent</code> input, unlike the constraint
      fields above &mdash; locks the width/height ratio at whatever it
      was when the resize started; resizing from any handle keeps that
      ratio, not just the corner handles.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class SizeConstraintsAspectRatioPageComponent {}
