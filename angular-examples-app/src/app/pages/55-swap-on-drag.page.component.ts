import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { SwapOnDragDemoComponent } from '../examples/55-swap-on-drag.component';

@Component({
  selector: 'app-swap-on-drag-page',
  standalone: true,
  imports: [ExampleTryItComponent, SwapOnDragDemoComponent],
  template: `
    <h1>Swap on drag</h1>
    <p>
      Drag one tile onto another. With <code>collisionMode="swap"</code>
      the two trade places; with the default <code>'push'</code> the tile
      underneath is shoved out of the way instead.
    </p>

    <example-try-it filename="55-swap-on-drag.component.ts" sourceUrl="/examples-source/55-swap-on-drag.component.ts">
      <app-swap-on-drag-demo></app-swap-on-drag-demo>
    </example-try-it>

    <p>
      A swap happens when the dragged tile lands on exactly one other
      non-static tile that fits into the dragged tile's starting cell.
      Anything else (several tiles, a static tile, or the other tile not fitting
      the starting cell) falls back to <code>'push'</code>. It only affects dragging,
      and is ignored while <code>preventCollision</code> is on.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class SwapOnDragPageComponent {}
