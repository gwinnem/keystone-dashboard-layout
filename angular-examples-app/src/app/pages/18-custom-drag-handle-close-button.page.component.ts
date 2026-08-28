import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { CustomDragHandleCloseButtonDemoComponent } from '../examples/18-custom-drag-handle-close-button.component';

@Component({
  selector: 'app-custom-drag-handle-close-button-page',
  standalone: true,
  imports: [ExampleTryItComponent, CustomDragHandleCloseButtonDemoComponent],
  template: `
    <h1>Custom drag handle & close button</h1>
    <p>
      Any element can be a drag handle via <code>dragAllowFrom</code>;
      <code>GridItemDragHandleComponent</code>/<code>GridItemCloseButtonComponent</code>
      are ready-made ones for this exact pattern.
    </p>

    <example-try-it filename="18-custom-drag-handle-close-button.component.ts" sourceUrl="/examples-source/18-custom-drag-handle-close-button.component.ts">
      <app-custom-drag-handle-close-button-demo></app-custom-drag-handle-close-button-demo>
    </example-try-it>

    <p>
      <code>GridItemDragHandleComponent</code> (<code>kdl-custom-drag-element</code>)
      renders a labeled <code>&lt;button&gt;</code> plus a separate,
      empty <code>.kdl-draggable-handle</code> span with a circle-icon
      background &mdash; that span, not the button itself, is the
      actual draggable hit-area, matching Vue's own
      <code>CustomDragElement</code> structure exactly.
      <code>GridItemCloseButtonComponent</code> (<code>kdl-custom-close-button</code>)
      takes an <code>i</code> input and emits <code>(removeGridItem)</code>
      when clicked. Neither is used internally by
      <code>GridItemComponent</code> itself &mdash; they're standalone,
      opt-in utilities, and a plain
      <code>&lt;span&gt;</code>/<code>&lt;button&gt;</code> styled
      however you like still works exactly as well, if you'd rather
      build your own.
    </p>

    <p>
      Pairing <code>dragAllowFrom</code> with <code>resizeIgnoreFrom</code>
      on the same selector matters here too: without it, the handle can
      end up fighting the resize engine's own edge-proximity detection
      near a corner.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class CustomDragHandleCloseButtonPageComponent {}
