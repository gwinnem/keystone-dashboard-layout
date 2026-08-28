import type { JSX } from 'react';

export interface IGridItemDragHandleProps {
  /** Label rendered inside the handle's button. Default `'x'`, matching Vue's own `CustomDragElement.vue` default exactly. */
  text?: string;
}

/**
 * A small drag-handle widget — the React port of Vue's own
 * `CustomDragElement.vue` (confirmed via a direct source read, not
 * re-derived). Not used internally by `GridItem`/`GridLayout`
 * themselves; a standalone, opt-in utility a consumer places inside a
 * `GridItem`'s own `children` when they want dragging restricted to a
 * single handle rather than the whole item — pair it with a layout
 * item's own `dragAllowFrom` field (e.g.
 * `dragAllowFrom: '.kdl-draggable-handle'`) so only this element starts
 * a drag.
 *
 * A real, confirmed structural detail from Vue's own source, not the
 * visible `<button>` alone: the actual draggable hit-area is a
 * separate, empty, absolutely-positioned `<span>` with a circle-icon
 * background (`.kdl-draggable-handle`), rendered as a *sibling* of the
 * button, not a wrapper around it or a child of it — clicking the
 * visible button does nothing on its own; dragging from the small
 * circle icon is what actually starts a drag. Positioned at 14px (not
 * flush against a corner) so it doesn't overlap the native resize
 * engine's own ~10px edge-proximity margin — matching Vue's own
 * identical positioning and its own documented rationale for that
 * specific offset.
 */
export function GridItemDragHandle({ text = `x` }: IGridItemDragHandleProps): JSX.Element {
  return (
    <span className="kdl-drag-element-text">
      <button type="button">{text}</button>
      <span className="kdl-draggable-handle" />
    </span>
  );
}
