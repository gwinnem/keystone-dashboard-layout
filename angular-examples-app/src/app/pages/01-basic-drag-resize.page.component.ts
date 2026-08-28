import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { BasicDragResizeDemoComponent } from '../examples/01-basic-drag-resize.component';

/**
 * Routed page for "01 — Basic drag & resize" — title/description
 * prose + the ExampleTryIt shell wrapping the real demo, matching the
 * shape of astro-docs's own basic-drag-resize.mdx page (Vue/React).
 */
@Component({
  selector: 'app-basic-drag-resize-page',
  standalone: true,
  imports: [ExampleTryItComponent, BasicDragResizeDemoComponent],
  template: `
    <h1>Basic drag & resize</h1>
    <p>
      The simplest possible setup: a <code>kdl-grid-layout</code> bound
      to a <code>layout</code> array via <code>[layout]</code>/<code>(layoutChange)</code>,
      and a <code>kdl-grid-item</code> for each entry.
    </p>

    <example-try-it filename="01-basic-drag-resize.component.ts" sourceUrl="/examples-source/01-basic-drag-resize.component.ts">
      <app-basic-drag-resize-demo></app-basic-drag-resize-demo>
    </example-try-it>

    <blockquote class="tip">
      <strong>Every item is draggable and resizable by default.</strong>
      <p>
        <code>GridLayoutComponent</code>'s <code>isDraggable</code>/<code>isResizable</code>
        inputs (both default <code>true</code>) apply to every item unless
        a specific <code>GridItemComponent</code> overrides them with its
        own input of the same name.
      </p>
    </blockquote>
  `,
  styles: [`
    .tip {
      background: var(--kg-ink-2);
      border-left: 3px solid var(--kg-blueprint);
      border-radius: 6px;
      margin: 24px 0 0;
      padding: 12px 16px;
    }
    .tip p {
      margin: 8px 0 0;
    }
    code {
      background: var(--kg-ink-3);
      border-radius: 4px;
      font-family: var(--kg-font-mono);
      font-size: 0.9em;
      padding: 2px 5px;
    }
  `],
})
export class BasicDragResizePageComponent {}
