import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { UndoRedoDemoComponent } from '../examples/43-undo-redo.component';

@Component({
  selector: 'app-undo-redo-page',
  standalone: true,
  imports: [ExampleTryItComponent, UndoRedoDemoComponent],
  template: `
    <h1>Undo/redo (enableUndoRedo)</h1>
    <p>
      Opt-in history at committed-change granularity, not per
      intermediate drag-move frame.
    </p>

    <example-try-it filename="43-undo-redo.component.ts" sourceUrl="/examples-source/43-undo-redo.component.ts">
      <app-undo-redo-demo></app-undo-redo-demo>
    </example-try-it>

    <p>
      <code>undo()</code>/<code>redo()</code>/<code>canUndo</code>/<code>canRedo</code>
      are all exposed as public members on <code>GridLayoutComponent</code>,
      reached through a template reference variable &mdash; the same
      pattern as <code>compactNow()</code>/<code>scrollToItem()</code>.
      A snapshot is captured at the start of a drag/resize and
      committed at its end &mdash; not per intermediate frame &mdash;
      so one undo reverts a whole gesture at once, not one step per
      pixel moved. <code>undoHistoryLimit</code> (default
      <code>50</code>) caps how many snapshots <code>undo()</code> can
      step back through.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class UndoRedoPageComponent {}
