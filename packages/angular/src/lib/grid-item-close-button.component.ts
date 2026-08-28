import { Component, Input, Output, EventEmitter } from '@angular/core';

/**
 * The default close button rendered inside `GridItemComponent` when
 * `showCloseButton` is true. Also exported standalone from the
 * package's own public entry point, for a consumer who wants to render
 * the same button elsewhere (e.g. inside a custom header) and wire it
 * to their own removal logic manually.
 *
 * A direct port of Vue's own `CustomCloseButton.vue` (confirmed via a
 * direct source read), with one deliberate, justified deviation: Vue's
 * own `i` prop defaults to a `-1` "no item" sentinel (needed because
 * Vue's `withDefaults` requires *some* default value for every prop).
 * Angular has first-class support for a required input with no default
 * at all — `i` is `@Input({ required: true })` here instead, which is
 * strictly safer (a consumer genuinely cannot render this component
 * without supplying a real id) rather than blindly copying a workaround
 * Angular doesn't need.
 */
@Component({
  selector: 'kdl-custom-close-button',
  standalone: true,
  template: `
    <button type="button" class="kdl-custom-close-button" aria-label="Close" (click)="onClick()">
      <span aria-hidden="true" class="kdl-custom-close-button-icon"></span>
    </button>
  `,
})
export class GridItemCloseButtonComponent {
  /** The id of the `GridItemComponent` (or any other layout item) this button removes when clicked. */
  @Input({ required: true }) i!: string | number;
  /** Emitted with `i` when clicked — matches Vue's own `EGridItemEvent.REMOVE_ITEM` (kebab-cased as `remove-grid-item` in Vue templates); named `removeGridItem` here, distinct from `GridItemComponent`'s own local `removeItem` output, since this component has no relationship to any specific parent item at all — it's a standalone utility a consumer wires up manually. */
  @Output() readonly removeGridItem = new EventEmitter<string | number>();

  onClick(): void {
    this.removeGridItem.emit(this.i);
  }
}
