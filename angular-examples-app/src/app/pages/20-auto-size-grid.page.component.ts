import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { AutoSizeGridDemoComponent } from '../examples/20-auto-size-grid.component';

@Component({
  selector: 'app-auto-size-grid-page',
  standalone: true,
  imports: [ExampleTryItComponent, AutoSizeGridDemoComponent],
  template: `
    <h1>Auto-size grid on content</h1>
    <p>
      <code>autoSize</code> is <code>true</code> by default &mdash;
      most consumers never need to think about it, but it's worth
      knowing about for the opposite case.
    </p>

    <example-try-it filename="20-auto-size-grid.component.ts" sourceUrl="/examples-source/20-auto-size-grid.component.ts">
      <app-auto-size-grid-demo></app-auto-size-grid-demo>
    </example-try-it>

    <p>
      <code>autoSize</code> is <code>true</code> by default &mdash;
      most consumers never need to think about it. It's worth knowing
      about mainly for the opposite case: set
      <code>[autoSize]="false"</code> if you want a fixed-height
      scrollable grid instead of one that grows to fit its content.
    </p>

    <blockquote class="tip">
      <strong>Prefer heightMode for finer control.</strong>
      <p>
        <code>autoSize</code> is the original boolean toggle;
        <code>heightMode</code> is the newer, more expressive
        replacement (<code>'auto'</code>/<code>'fixed'</code>/<code>'scroll'</code>/<code>'fit'</code>)
        &mdash; see GridLayoutComponent's own props for the full set of
        modes, including the <code>'scroll'</code>/<code>'fit'</code>
        options this boolean toggle can't express on its own.
      </p>
    </blockquote>
  `,
  styles: [`
    .tip { background: var(--kg-ink-2); border-left: 3px solid var(--kg-blueprint); border-radius: 6px; margin: 24px 0 0; padding: 12px 16px; }
    .tip p { margin: 8px 0 0; }
    code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }
  `],
})
export class AutoSizeGridPageComponent {}
