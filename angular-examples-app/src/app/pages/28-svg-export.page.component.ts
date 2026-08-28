import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { SvgExportDemoComponent } from '../examples/28-svg-export.component';

@Component({
  selector: 'app-svg-export-page',
  standalone: true,
  imports: [ExampleTryItComponent, SvgExportDemoComponent],
  template: `
    <h1>Export layout as SVG</h1>
    <p>
      A dependency-free utility producing a standalone SVG snapshot of
      the current layout.
    </p>

    <example-try-it filename="28-svg-export.component.ts" sourceUrl="/examples-source/28-svg-export.component.ts">
      <app-svg-export-demo></app-svg-export-demo>
    </example-try-it>

    <p>
      Unlike the Vue package, this isn't a standalone importable
      function &mdash; it's a public method on
      <code>GridLayoutComponent</code>, reached through a template
      reference variable, pre-filled with this grid's own actual
      <code>colNum</code>/<code>rowHeight</code>/<code>margin</code>/measured
      width, so there's nothing to re-supply for the common case. Any
      field in the options object you pass still overrides its
      corresponding pre-filled one.
    </p>

    <p>
      Deliberately draws each item as a labeled rectangle from the
      layout data alone, not a snapshot of whatever's actually rendered
      inside each <code>GridItemComponent</code> &mdash; good for a
      structural thumbnail of the layout itself, not a substitute for a
      real screenshot of custom content (a chart, an image). The
      returned string is a complete, standalone <code>&lt;svg&gt;</code>
      document &mdash; render it directly, download it as a
      <code>.svg</code> file via a <code>Blob</code>, or draw it onto a
      <code>&lt;canvas&gt;</code> first if a raster PNG/JPEG is
      specifically needed instead.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class SvgExportPageComponent {}
