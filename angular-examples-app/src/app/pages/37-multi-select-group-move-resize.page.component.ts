import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { MultiSelectGroupMoveResizeDemoComponent } from '../examples/37-multi-select-group-move-resize.component';

@Component({
  selector: 'app-multi-select-group-move-resize-page',
  standalone: true,
  imports: [ExampleTryItComponent, MultiSelectGroupMoveResizeDemoComponent],
  template: `
    <h1>Multi-select & group move/resize</h1>
    <p>
      Select multiple items and drag or resize any of them &mdash; the
      rest of the selection moves or resizes by the same delta.
    </p>

    <example-try-it filename="37-multi-select-group-move-resize.component.ts" sourceUrl="/examples-source/37-multi-select-group-move-resize.component.ts">
      <app-multi-select-group-move-resize-demo></app-multi-select-group-move-resize-demo>
    </example-try-it>

    <p>
      Reach selection methods via a template reference variable:
      <code>grid.selectItem('a')</code>,
      <code>grid.toggleItemSelection('b')</code>,
      <code>grid.deselectItem('a')</code>,
      <code>grid.clearSelection()</code>. <code>grid.selectedItems</code>
      is a plain field snapshot, not reactive &mdash; reading it
      directly in a template binding won't automatically re-render when
      selection changes on its own. <code>selectionChanged</code> (as
      this example uses) is the reliable way to mirror the current
      selection into your own component state instead.
    </p>

    <h2>Multi-select</h2>
    <p>
      Off by default (<code>multiSelect: false</code>) &mdash; every
      prior behavior is completely unaffected when this stays off.
      When on: click selects only that item, replacing any prior
      selection; Shift+click or Ctrl/Cmd+click adds/removes it from the
      current selection additively; clicking empty grid background
      clears the selection entirely.
    </p>

    <p>
      Dragging or resizing any selected item while more than one item
      is selected moves/resizes every other selected item by the same
      delta &mdash; also works from the keyboard (arrow keys/Shift+arrow
      on a focused, selected item), not just mouse/touch drag.
    </p>

    <p>
      A passenger that's static, or has
      <code>isDraggable</code>/<code>isResizable</code> explicitly
      <code>false</code> on its own item, never moves or resizes as
      part of a group gesture. A passenger's own
      <code>minW</code>/<code>maxW</code>/<code>minH</code>/<code>maxH</code>
      are also respected individually during group resize &mdash; see
      item "d" in the demo above, which stops at its own
      <code>maxW</code> of 3 even while the other, unconstrained items
      keep growing.
    </p>

    <blockquote class="caution">
      <strong>Deliberately scoped, not fully collision-aware.</strong>
      <p>
        The delta is applied directly to every other selected item's
        position or size &mdash; there's no per-passenger collision
        detection against non-selected items during the gesture itself.
        Compaction (per <code>compactType</code>) still runs normally
        once the gesture ends.
      </p>
    </blockquote>

    <p>
      Custom resize-handle content, via <code>&lt;ng-template #resizeHandle let-edge&gt;</code>
      inside a <code>kdl-grid-item</code>'s own projected content &mdash;
      matching React's own <code>renderResizeHandle</code> render prop /
      Vue's own <code>#resize-handle</code> scoped slot, expressed as
      Angular's own template-projection idiom. Rendered inside the same
      small hit-area <code>showResizeHandles</code>/<code>resizeHandleColor</code>
      already use; both mechanisms can be combined, or the template used
      alone for a fully custom look (as this example does, replacing
      the plain colored dot with a diagonal-arrow glyph). The template
      receives the edge identifier (<code>'n'</code>/<code>'s'</code>/<code>'e'</code>/<code>'w'</code>/<code>'ne'</code>/<code>'nw'</code>/<code>'se'</code>/<code>'sw'</code>)
      both as the implicit context value and as a named <code>edge</code>
      property.
    </p>
  `,
  styles: [`
    .caution { background: var(--kg-ink-2); border-left: 3px solid var(--kg-amber); border-radius: 6px; margin: 24px 0 0; padding: 12px 16px; }
    .caution p { margin: 8px 0 0; }
    h2 { font-family: var(--kg-font-display); font-size: 18px; margin: 28px 0 8px; }
    code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }
  `],
})
export class MultiSelectGroupMoveResizePageComponent {}
