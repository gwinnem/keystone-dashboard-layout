import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { StaticItemsDemoComponent } from '../examples/17-static-items.component';

@Component({
  selector: 'app-static-items-page',
  standalone: true,
  imports: [ExampleTryItComponent, StaticItemsDemoComponent],
  template: `
    <h1>Static items</h1>
    <p>
      A static item ignores <code>isDraggable</code>/<code>isResizable</code>
      entirely and is excluded from the drag-collision cascade.
    </p>

    <example-try-it filename="17-static-items.component.ts" sourceUrl="/examples-source/17-static-items.component.ts">
      <app-static-items-demo></app-static-items-demo>
    </example-try-it>

    <p>
      Unlike the React package (where a layout item's own
      <code>isStatic</code> field is the only way to set it),
      <code>GridItemComponent</code> here takes <code>isStatic</code>
      as its own direct input &mdash; the same shape Vue uses. A static
      item ignores <code>isDraggable</code>/<code>isResizable</code>
      entirely and is excluded from the drag-collision cascade (other
      items compact around it as a fixed obstacle).
    </p>

    <blockquote class="tip">
      <strong>Common use case: dashboard "anchors".</strong>
      <p>
        A common pattern is a static header or KPI card that should
        never move, surrounded by draggable widgets &mdash; set
        <code>[isStatic]="true"</code> on just that one item.
      </p>
    </blockquote>
  `,
  styles: [`
    .tip { background: var(--kg-ink-2); border-left: 3px solid var(--kg-blueprint); border-radius: 6px; margin: 24px 0 0; padding: 12px 16px; }
    .tip p { margin: 8px 0 0; }
    code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }
  `],
})
export class StaticItemsPageComponent {}
