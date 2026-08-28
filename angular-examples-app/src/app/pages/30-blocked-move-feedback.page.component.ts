import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { BlockedMoveFeedbackDemoComponent } from '../examples/30-blocked-move-feedback.component';

@Component({
  selector: 'app-blocked-move-feedback-page',
  standalone: true,
  imports: [ExampleTryItComponent, BlockedMoveFeedbackDemoComponent],
  template: `
    <h1>Blocked-move feedback</h1>
    <p>
      <code>moveBlockedByCollision</code> emits the moment
      <code>preventCollision</code> blocks a drag or resize.
    </p>

    <example-try-it filename="30-blocked-move-feedback.component.ts" sourceUrl="/examples-source/30-blocked-move-feedback.component.ts">
      <app-blocked-move-feedback-demo></app-blocked-move-feedback-demo>
    </example-try-it>

    <p>
      Without this output, <code>preventCollision</code> alone gives no
      feedback about <em>why</em> a drag stopped short &mdash; the item
      just doesn't move, which can look like a bug rather than
      intentional collision blocking. Use the output to drive a flash,
      a shake animation, or a toast, so the block reads as deliberate.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class BlockedMoveFeedbackPageComponent {}
