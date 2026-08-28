import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { EditModeToggleDemoComponent } from '../examples/21-edit-mode-toggle.component';

@Component({
  selector: 'app-edit-mode-toggle-page',
  standalone: true,
  imports: [ExampleTryItComponent, EditModeToggleDemoComponent],
  template: `
    <h1>Edit mode toggle (view-only dashboard)</h1>
    <p>
      <code>enableEditMode</code> is a master switch &mdash; off, an
      item can't be dragged, resized, or closed regardless of its own
      inputs.
    </p>

    <example-try-it filename="21-edit-mode-toggle.component.ts" sourceUrl="/examples-source/21-edit-mode-toggle.component.ts">
      <app-edit-mode-toggle-demo></app-edit-mode-toggle-demo>
    </example-try-it>

    <p>
      <code>enableEditMode</code> cascades to every
      <code>GridItemComponent</code> that doesn't set its own override
      &mdash; a "view mode" toggle for the whole grid without needing to
      set the input on every item individually. A specific item can
      still set its own <code>enableEditMode</code> input to override
      the grid-wide default for just itself, the same inherit pattern
      <code>isDraggable</code>/<code>isResizable</code>/<code>showCloseButton</code>
      use.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class EditModeTogglePageComponent {}
