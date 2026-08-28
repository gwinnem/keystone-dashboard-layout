import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { AriaLabelsDemoComponent } from '../examples/36-aria-labels.component';

@Component({
  selector: 'app-aria-labels-page',
  standalone: true,
  imports: [ExampleTryItComponent, AriaLabelsDemoComponent],
  template: `
    <h1>Localizable ARIA strings</h1>
    <p>
      Every user-facing string &mdash; the close button's label,
      role description, and keyboard instructions &mdash; is
      overridable.
    </p>

    <example-try-it filename="36-aria-labels.component.ts" sourceUrl="/examples-source/36-aria-labels.component.ts">
      <app-aria-labels-demo></app-aria-labels-demo>
    </example-try-it>

    <p>
      Deliberately a small, fixed set of overridable strings, not a
      full i18n system &mdash; no pluralization, no locale negotiation.
      Wire your own translation function's output into
      <code>ariaLabels</code> for real i18n integration; this just
      makes the strings <em>reachable</em> instead of a hardcoded
      English literal. Three layers merge, each only overriding the
      keys it actually sets: built-in English defaults &larr;
      <code>GridLayoutComponent</code>'s own <code>ariaLabels</code>
      (grid-wide) &larr; a specific <code>GridItemComponent</code>'s
      own <code>ariaLabels</code> input (per-item) &mdash; override
      just one string grid-wide, or just one string on one item,
      without re-supplying every other key.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class AriaLabelsPageComponent {}
