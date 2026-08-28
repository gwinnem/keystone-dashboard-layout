import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { OutsideDropAcceptPayloadDemoComponent } from '../examples/34-outside-drop-accept-payload.component';

@Component({
  selector: 'app-outside-drop-accept-payload-page',
  standalone: true,
  imports: [ExampleTryItComponent, OutsideDropAcceptPayloadDemoComponent],
  template: `
    <h1>outsideDropAccept & readOutsideDropPayload</h1>
    <p>
      Reject incompatible native drags before the placeholder appears,
      and read a richer, typed payload than the raw
      <code>DataTransfer</code>.
    </p>

    <example-try-it filename="34-outside-drop-accept-payload.component.ts" sourceUrl="/examples-source/34-outside-drop-accept-payload.component.ts">
      <app-outside-drop-accept-payload-demo></app-outside-drop-accept-payload-demo>
    </example-try-it>

    <p>
      <code>readOutsideDropPayload&lt;T&gt;(dataTransfer, mimeType?)</code>
      reads and JSON-parses a <code>DataTransfer</code> payload by MIME
      type &mdash; never throws; a missing MIME type or malformed JSON
      both return <code>null</code> rather than propagating a
      <code>SyntaxError</code>. <code>mimeType</code> defaults to
      <code>'text/plain'</code>, matching
      <code>dataTransfer.setData</code>'s own default. Imported from
      <code>&#64;keystone-dashboard-layout/core</code> directly &mdash;
      this package doesn't re-export it through its own barrel.
    </p>

    <blockquote class="tip">
      <strong>Why this one starts inside a fixed-height frame.</strong>
      <p>
        <code>layout</code> starts empty, and <code>GridLayoutComponent</code>'s
        own <code>autoSize</code> (default <code>true</code>) sizes the
        container to fit its content &mdash; with zero items, that
        collapses to almost nothing, leaving no visible area to drop
        onto at all. <code>heightMode="fit"</code> inside a
        <code>.drop-zone-frame</code> with a real CSS <code>height</code>
        fixes this: the grid fills that frame regardless of how many
        items it currently holds, so there's always a genuine drop
        target.
      </p>
    </blockquote>

    <blockquote class="caution">
      <strong>A real gotcha with native drag-and-drop.</strong>
      <p>
        <code>dataTransfer.getData()</code> only returns real values
        during the <code>drop</code> event itself &mdash; during
        <code>dragenter</code>/<code>dragover</code> (when
        <code>outsideDropAccept</code> is actually called) it always
        returns an empty string, regardless of what the source set.
        This is a genuine, confirmed bug this example had at first:
        <code>outsideDropAccept</code> tried to parse the full JSON
        payload to check its <code>kind</code> field, which silently
        rejected every drag &mdash; real widget or not &mdash; since the
        payload was never readable at that point. The browser showed a
        "not a valid drop target" cursor and the drop never fired.
      </p>
      <p>
        The fix: only <code>dataTransfer.types</code> (the list of MIME
        types present, not their values) is reliably readable during
        <code>dragenter</code>/<code>dragover</code>. This example's
        drag source now sets a second, value-less MIME type
        (<code>'application/x-widget'</code>) only on the real widget,
        and <code>outsideDropAccept</code> checks
        <code>dataTransfer.types.includes('application/x-widget')</code>
        instead of trying to read the actual payload. The full JSON
        payload is still read via <code>readOutsideDropPayload</code>
        &mdash; just at <code>drop</code> time, in
        <code>itemDroppedFromOutside</code>, where
        <code>.getData()</code> genuinely works.
      </p>
    </blockquote>
  `,
  styles: [`
    .tip { background: var(--kg-ink-2); border-left: 3px solid var(--kg-blueprint); border-radius: 6px; margin: 24px 0 0; padding: 12px 16px; }
    .caution { background: var(--kg-ink-2); border-left: 3px solid var(--kg-amber); border-radius: 6px; margin: 24px 0 0; padding: 12px 16px; }
    .tip p, .caution p { margin: 8px 0 0; }
    code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }
  `],
})
export class OutsideDropAcceptPayloadPageComponent {}
