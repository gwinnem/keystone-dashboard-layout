import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { HeightModesDemoComponent } from '../examples/50-height-modes.component';

@Component({
  selector: 'app-height-modes-page',
  standalone: true,
  imports: [ExampleTryItComponent, HeightModesDemoComponent],
  template: `
    <h1>Height modes (heightMode)</h1>
    <p>
      The modern replacement for <code>autoSize</code>, with two modes
      (<code>'scroll'</code>/<code>'fit'</code>) a boolean couldn't
      express at all.
    </p>

    <example-try-it filename="50-height-modes.component.ts" sourceUrl="/examples-source/50-height-modes.component.ts">
      <app-height-modes-demo></app-height-modes-demo>
    </example-try-it>

    <table class="mode-table">
      <thead>
        <tr><th>Mode</th><th>Behavior</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><code>'auto'</code> (default when unset)</td>
          <td>Grows/shrinks to fit content &mdash; same as the older <code>autoSize: true</code>. In the demo above, this deliberately overflows the dashed frame, since nothing here constrains it.</td>
        </tr>
        <tr>
          <td><code>'fixed'</code></td>
          <td>No explicit height applied at all &mdash; the consumer's own CSS decides. Same as <code>autoSize: false</code>.</td>
        </tr>
        <tr>
          <td><code>'scroll'</code></td>
          <td>Same as <code>'fixed'</code>, but also applies an inline <code>overflow-y: auto</code>, so content taller than whatever height your own CSS gives it scrolls internally instead of overflowing.</td>
        </tr>
        <tr>
          <td><code>'fit'</code></td>
          <td>Height locked to <code>100%</code> of the parent container, with the same <code>overflow-y: auto</code> as <code>'scroll'</code> &mdash; for a grid meant to fill a fixed-size panel exactly.</td>
        </tr>
      </tbody>
    </table>

    <p>
      <code>null</code> (the actual input default) defers entirely to
      the older <code>autoSize</code> boolean &mdash; set
      <code>heightMode</code> explicitly to opt into any of these, no
      behavior change for existing consumers who only use
      <code>autoSize</code>.
    </p>
  `,
  styles: [`
    .mode-table { border-collapse: collapse; margin: 16px 0; width: 100%; }
    .mode-table th, .mode-table td { border: 1px solid var(--kg-line-dark); padding: 8px 12px; text-align: left; vertical-align: top; }
    .mode-table th { color: var(--kg-text-hi-dark); }
    code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }
  `],
})
export class HeightModesPageComponent {}
