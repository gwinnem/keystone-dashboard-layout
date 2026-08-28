import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { TransitionDurationEasingDemoComponent } from '../examples/24-transition-duration-easing.component';

@Component({
  selector: 'app-transition-duration-easing-page',
  standalone: true,
  imports: [ExampleTryItComponent, TransitionDurationEasingDemoComponent],
  template: `
    <h1>Configurable transition duration & easing</h1>
    <p>
      <code>transitionDurationMs</code> and
      <code>transitionTimingFunction</code> control the CSS transition
      applied to position/size changes.
    </p>

    <example-try-it filename="24-transition-duration-easing.component.ts" sourceUrl="/examples-source/24-transition-duration-easing.component.ts">
      <app-transition-duration-easing-demo></app-transition-duration-easing-demo>
    </example-try-it>

    <p>
      Applies to item position/size changes and the container's own
      <code>autoSize</code>-driven height changes &mdash; both default
      to <code>200</code>ms / <code>'ease'</code>. Set
      <code>[transitionDurationMs]="0"</code> to disable transitions
      entirely (useful while dragging live data-driven layouts where
      every frame's position should snap immediately, not animate).
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class TransitionDurationEasingPageComponent {}
