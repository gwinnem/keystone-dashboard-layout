import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { ResizeHintAppearanceDemoComponent } from '../examples/33-resize-hint-appearance.component';

@Component({
  selector: 'app-resize-hint-appearance-page',
  standalone: true,
  imports: [ExampleTryItComponent, ResizeHintAppearanceDemoComponent],
  template: `
    <h1>Configurable resize-hint appearance</h1>
    <p>
      <code>showResizeHandles</code> renders a visible resize affordance
      instead of only a cursor change on hover.
    </p>

    <example-try-it filename="33-resize-hint-appearance.component.ts" sourceUrl="/examples-source/33-resize-hint-appearance.component.ts">
      <app-resize-hint-appearance-demo></app-resize-hint-appearance-demo>
    </example-try-it>

    <p>
      Both inputs cascade from <code>GridLayoutComponent</code> to
      every item that doesn't set its own &mdash; the same inherit
      pattern as <code>isDraggable</code>/<code>showCloseButton</code>.
      For a fully custom look beyond just a color, see
      <code>&lt;ng-template #resizeHandle let-edge&gt;</code>, which
      renders arbitrary content (an icon, not just a colored dot) per
      handle instead &mdash; demonstrated in
      <a href="/examples/37-multi-select-group-move-resize">Multi-select & group move/resize</a>.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class ResizeHintAppearancePageComponent {}
