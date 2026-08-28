import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { PreventCollisionDemoComponent } from '../examples/08-prevent-collision.component';

@Component({
  selector: 'app-prevent-collision-page',
  standalone: true,
  imports: [ExampleTryItComponent, PreventCollisionDemoComponent],
  template: `
    <h1>Prevent collision</h1>
    <p>
      Blocks a drag/resize from overlapping another item entirely,
      rather than pushing it out of the way.
    </p>

    <example-try-it filename="08-prevent-collision.component.ts" sourceUrl="/examples-source/08-prevent-collision.component.ts">
      <app-prevent-collision-demo></app-prevent-collision-demo>
    </example-try-it>

    <blockquote class="caution">
      <strong>Interacts with compaction.</strong>
      <p>
        <code>preventCollision</code> stops an item from overlapping
        another &mdash; it doesn't disable compaction. If you want
        items to stay exactly where they're put with no automatic
        repositioning at all, also set
        <code>[compactType]="ECompactType.NONE"</code>.
      </p>
    </blockquote>
  `,
  styles: [`
    .caution { background: var(--kg-ink-2); border-left: 3px solid var(--kg-amber); border-radius: 6px; margin: 24px 0 0; padding: 12px 16px; }
    .caution p { margin: 8px 0 0; }
    code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }
  `],
})
export class PreventCollisionPageComponent {}
