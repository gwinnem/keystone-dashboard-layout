import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { SaveLoadLayoutDemoComponent } from '../examples/19-save-load-layout.component';

@Component({
  selector: 'app-save-load-layout-page',
  standalone: true,
  imports: [ExampleTryItComponent, SaveLoadLayoutDemoComponent],
  template: `
    <h1>Save/load layout</h1>
    <p>
      <code>layout</code> is a plain, JSON-serializable array &mdash;
      persist it however you like.
    </p>

    <example-try-it filename="19-save-load-layout.component.ts" sourceUrl="/examples-source/19-save-load-layout.component.ts">
      <app-save-load-layout-demo></app-save-load-layout-demo>
    </example-try-it>

    <p>
      <code>layout</code> is already a plain array of plain objects, so
      <code>JSON.stringify</code>/<code>JSON.parse</code> would
      round-trip it correctly on its own &mdash; no special service
      required for the basic case. This example uses the package's own
      <code>GridLayoutStorageService</code> instead, which wraps that
      same pattern (plus the internal <code>moved</code> field
      stripped, and shape validation on load) behind
      <code>load()</code>/<code>save()</code> methods, alongside
      <code>GridLayoutPresetsService</code> for saving/switching
      between several named layouts.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class SaveLoadLayoutPageComponent {}
