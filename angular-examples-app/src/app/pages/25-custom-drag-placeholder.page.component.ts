import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { CustomDragPlaceholderDemoComponent } from '../examples/25-custom-drag-placeholder.component';

@Component({
  selector: 'app-custom-drag-placeholder-page',
  standalone: true,
  imports: [ExampleTryItComponent, CustomDragPlaceholderDemoComponent],
  template: `
    <h1>Custom drag-placeholder content</h1>
    <p>
      <code>&lt;ng-template #placeholder let-placeholder&gt;</code>
      renders fully custom content at the drop target during any drag
      or resize, in-grid or outside-drop.
    </p>

    <example-try-it filename="25-custom-drag-placeholder.component.ts" sourceUrl="/examples-source/25-custom-drag-placeholder.component.ts">
      <app-custom-drag-placeholder-demo></app-custom-drag-placeholder-demo>
    </example-try-it>

    <p>
      Matches Vue's own <code>#placeholder</code> scoped slot, expressed
      as Angular's own template-projection idiom &mdash; a plain
      <code>&lt;ng-template #placeholder&gt;</code> declared anywhere
      inside a <code>kdl-grid-layout</code>'s own projected content
      (it doesn't need to live inside any particular
      <code>kdl-grid-item</code>). Falls back to the existing plain,
      dashed-outline box when no template is provided, so every
      existing consumer's rendering is completely unaffected.
    </p>

    <p>
      The template receives the current placeholder's own grid-unit
      <code>x</code>/<code>y</code>/<code>w</code>/<code>h</code> both
      as the implicit context value and as a named
      <code>placeholder</code> property, plus an
      <code>isDragging</code> boolean &mdash; the same three values
      Vue's own slot scope exposes. Positioning/sizing itself is still
      handled automatically (the template's own content is placed
      inside the already-correctly-positioned wrapper); only the
      content shown inside that box is customizable.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class CustomDragPlaceholderPageComponent {}
