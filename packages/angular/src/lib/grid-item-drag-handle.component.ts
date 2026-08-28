import { Component, Input } from '@angular/core';

/**
 * A small drag-handle widget, exported for consumers to place inside a
 * `GridItemComponent`'s projected content when they want dragging
 * restricted to a single handle rather than the whole item — pair it
 * with `dragAllowFrom` (e.g. `[dragAllowFrom]="'.kdl-draggable-handle'"`)
 * so only this element starts a drag.
 *
 * A direct port of Vue's own `CustomDragElement.vue` (confirmed via a
 * direct source read, not assumed from usage sites alone) — including a
 * real structural detail an assumption from the example site alone would
 * have missed: the actual draggable hit-area is a *separate*, empty,
 * absolutely-positioned span with a circle-icon background — not the
 * visible `<button>` displaying `text`. The button is purely a labeled,
 * inline affordance; `.kdl-draggable-handle` (renamed from Vue's own
 * `.vue-draggable-handle`, matching this port's own `kdl-` prefix
 * convention throughout) is what `dragAllowFrom` should actually target.
 *
 * Not used anywhere internally in this library — a standalone opt-in
 * utility component, exported from the package's own public entry point
 * alongside `GridItemCloseButtonComponent`.
 */
@Component({
  selector: 'kdl-custom-drag-element',
  standalone: true,
  template: `
    <span class="kdl-drag-element-text">
      <button type="button">{{ text }}</button>
      <span class="kdl-draggable-handle"></span>
    </span>
  `,
})
export class GridItemDragHandleComponent {
  /** Label rendered inside the handle's button. Default `'x'`, matching Vue's own default exactly (not a more "sensible-looking" glyph an assumption from the example site alone might have guessed). */
  @Input() text = 'x';
}
