import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { ResizeDirectionTogglesDemoComponent } from '../examples/53-resize-direction-toggles.component';

@Component({
  selector: 'app-resize-direction-toggles-page',
  standalone: true,
  imports: [ExampleTryItComponent, ResizeDirectionTogglesDemoComponent],
  template: `
    <h1>Resize direction toggles</h1>
    <p>
      Toggle any of the 8 resize edges/corners live and watch
      <code>GridItemComponent</code>'s own <code>resizeHandles</code>
      input update in real time &mdash; the same array
      <a href="/angular/examples/">example 52</a> sets once, fixed,
      but here every direction is independently switchable.
    </p>

    <example-try-it filename="53-resize-direction-toggles.component.ts" sourceUrl="/examples-source/53-resize-direction-toggles.component.ts">
      <app-resize-direction-toggles-demo></app-resize-direction-toggles-demo>
    </example-try-it>

    <p>
      Unchecking every direction leaves <code>resizeHandles</code> as
      an empty array (<code>[]</code>) &mdash; a deliberate, valid "no
      handle-driven resize for this item" value, distinct from
      <code>isResizable: false</code>. Keyboard arrow-key resize still
      works with <code>[]</code>; it doesn't with
      <code>isResizable: false</code>.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class ResizeDirectionTogglesPageComponent {}
