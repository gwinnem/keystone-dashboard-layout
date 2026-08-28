import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { NamedPresetsDemoComponent } from '../examples/35-named-presets.component';

@Component({
  selector: 'app-named-presets-page',
  standalone: true,
  imports: [ExampleTryItComponent, NamedPresetsDemoComponent],
  template: `
    <h1>Named layout presets</h1>
    <p>
      Save and switch between several named arrangements of the same
      items.
    </p>

    <example-try-it filename="35-named-presets.component.ts" sourceUrl="/examples-source/35-named-presets.component.ts">
      <app-named-presets-demo></app-named-presets-demo>
    </example-try-it>

    <p>
      Layers on top of the same <code>serializeLayout</code>/<code>deserializeLayout</code>
      building blocks <code>GridLayoutStorageService</code> uses,
      rather than replacing them &mdash; reach for
      <code>GridLayoutStorageService</code> directly for the simpler
      single-saved-layout case, and <code>GridLayoutPresetsService</code>
      when a consumer specifically needs several named arrangements of
      the same items. <code>loadPreset</code> returns the loaded layout
      for you to apply via your own field assignment, matching this
      package's own "plain values in and out" convention. Every preset
      for a given key is stored together as one object under one
      storage key &mdash; one read/write per operation, not one per
      preset.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class NamedPresetsPageComponent {}
