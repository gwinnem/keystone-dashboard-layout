import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { CompactNowRearrangeDuplicateItemDemoComponent } from '../examples/29-compact-now-rearrange-duplicate-item.component';

@Component({
  selector: 'app-compact-now-rearrange-duplicate-item-page',
  standalone: true,
  imports: [ExampleTryItComponent, CompactNowRearrangeDuplicateItemDemoComponent],
  template: `
    <h1>compactNow, rearrange & duplicateItem</h1>
    <p>
      On-demand layout tidying and item duplication, exposed as public
      methods on <code>GridLayoutComponent</code>.
    </p>

    <example-try-it filename="29-compact-now-rearrange-duplicate-item.component.ts" sourceUrl="/examples-source/29-compact-now-rearrange-duplicate-item.component.ts">
      <app-compact-now-rearrange-duplicate-item-demo></app-compact-now-rearrange-duplicate-item-demo>
    </example-try-it>

    <p>
      <code>compactNow()</code> always forces compaction, regardless of
      the ambient <code>compactType</code> setting &mdash; the entire
      point of a manual "tidy up" trigger is that it works even when
      auto-compaction is otherwise disabled. <code>rearrange()</code>
      is the same underlying operation under a different name for call
      sites that read more naturally that way. <code>duplicateItem(id)</code>
      clones an existing layout entry into the first available free
      slot &mdash; collision-safe, no manual position math needed, the
      same convention <code>y: Infinity</code> uses for adding items.
      Both <code>compactNow</code>/<code>duplicateItem</code> report
      their result through the same <code>layoutChange</code> output
      used everywhere else &mdash; no extra glue needed to keep local
      state in sync.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class CompactNowRearrangeDuplicateItemPageComponent {}
