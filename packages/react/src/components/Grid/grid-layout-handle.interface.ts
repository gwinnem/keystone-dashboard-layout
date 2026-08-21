import type { IExportLayoutAsSvgOptions, TAlignEdge, TDistributeAxis } from '@keystone-dashboard-layout/core';

/**
 * The imperative API `GridLayout` exposes via `ref` — the React
 * equivalent of the Vue package's own `defineExpose`'d template-ref
 * methods (see `docs/IMPLEMENTATION_PLAN.md` item 2.1 for the full
 * rationale). Grows additively as later phases land — never
 * restructured, only extended.
 */
export interface IGridLayoutHandle {
  /**
   * Re-runs compaction on the current layout on demand. Unlike the
   * automatic per-tick compaction that already runs during drag/
   * resize, this forces real compaction even when `compactType` is
   * `NONE` — a manual "Tidy up" trigger should always actually tidy
   * up, regardless of the ambient auto-compact setting (matching the
   * Vue package's own `compactNow()` fix — see its own doc comment).
   */
  compactNow: () => void;
  /** Alias for `compactNow()` — same operation, offered under the name the Vue package's own docs originally suggested it under. */
  rearrange: () => void;
  /**
   * Clones the item with the given id, placing the copy directly below
   * the source item (`x` unchanged, `y: source.y + source.h`) and
   * letting the next compaction pass resolve any overlap. Copies every
   * field except `i` (given a new, collision-safe id: `${id}-copy`,
   * `${id}-copy-2`, etc.) and `moved`. Returns the new item's id, or
   * `null` if `id` doesn't match any item currently in `layout`.
   */
  duplicateItem: (id: string | number) => string | number | null;
  /** The currently-selected item ids (`multiSelect`), in selection order. */
  selectedItems: (string | number)[];
  /** Adds an item to the current selection, without clearing the rest of it. A no-op when `multiSelect` is off. */
  selectItem: (id: string | number) => void;
  /** Removes an item from the current selection, if present. */
  deselectItem: (id: string | number) => void;
  /** Adds the item to the selection if absent, removes it if present. */
  toggleItemSelection: (id: string | number) => void;
  /** Empties the current selection entirely. */
  clearSelection: () => void;
  /** Reverts to the layout as it was before the most recent undo-tracked action (drag start, resize start, `duplicateItem`, `compactNow`, or an externally-driven `layout` length change). A no-op when nothing is available to undo, including when `enableUndoRedo` is off. */
  undo: () => void;
  /** Re-applies the most recently undone action. A no-op when nothing is available to redo, including right after any new undo-tracked action (redo history is cleared the moment a fresh action is committed). */
  redo: () => void;
  /** Whether `undo()` would currently do anything. */
  canUndo: boolean;
  /** Whether `redo()` would currently do anything. */
  canRedo: boolean;
  /**
   * Aligns every currently-selected item (`multiSelect`) to the given
   * edge/center of the *anchor* — the first item in `selectedItems`'
   * own order (a `Set`'s insertion order, so "first selected," not an
   * arbitrary one), which itself never moves. A no-op when fewer than
   * 2 items are selected. When `preventCollision` is on, an adjustment
   * that would land an item on top of a *non-selected* item is skipped
   * for that one item only (colliding with another item also being
   * aligned isn't treated as a collision here — that's frequently the
   * point of the command). Undo-tracked, same as a drag/resize.
   */
  alignSelected: (edge: TAlignEdge) => void;
  /**
   * Evenly spaces the currently-selected items (`multiSelect`) along
   * the given axis — the two outermost selected items (by actual
   * position, not selection order) stay fixed; only what's "in
   * between" moves to close uneven gaps. A no-op with fewer than 3
   * items selected. Same `preventCollision` guard and undo-tracking as
   * `alignSelected`.
   */
  distributeSelected: (axis: TDistributeAxis) => void;
  /**
   * Renders the current layout as a standalone SVG string — pre-filled
   * with this grid's own actual `colNum`/`rowHeight`/`margin`/
   * measured container width, so you don't need to re-supply values
   * already known here; any field in `options` still overrides its
   * corresponding pre-filled one. See `IExportLayoutAsSvgOptions`
   * (`@keystone-dashboard-layout/core`) for the full option list and
   * `exportLayoutAsSvg`'s own doc comment for what the output looks
   * like and how to use it (download as `.svg`, `innerHTML` directly,
   * etc.).
   */
  exportLayoutAsSvg: (options?: IExportLayoutAsSvgOptions) => string;
  /**
   * Scrolls the item with the given id into view, if it's currently
   * rendered — a no-op (not a throw) when the id doesn't match any
   * rendered item, e.g. right after removing that same item. The
   * returned `Promise` resolves once the scroll has actually been
   * requested — deliberately deferred past the current task (matching
   * the Vue package's own `nextTick()`-deferred version), since the
   * documented, intended use ("jump to the widget you just added") is
   * calling this immediately after adding a new item to your own
   * `layout` state in the very same handler, before that new item's
   * element has actually committed to the DOM yet. `await`ing this
   * call isn't required for it to work — the deferral happens inside
   * the method itself — but is available if you want to know once it's
   * done. `block: 'nearest'` avoids yanking the whole page's scroll
   * position for an item that's already fully visible.
   */
  scrollToItem: (id: string | number) => Promise<void>;
  /**
   * Moves keyboard focus to the item with the given id, if it's
   * currently rendered and focusable (draggable/resizable/non-static
   * items get `tabIndex={0}`; a purely static, non-interactive item
   * never does, so focusing it wouldn't do anything meaningful even if
   * this tried). Same no-op-on-missing-id behavior and same
   * next-task deferral rationale as `scrollToItem` above — restoring
   * focus after a keyboard-driven remove/relocate is exactly the case
   * where the previously-focused item may no longer be the one you're
   * now trying to focus.
   */
  focusItem: (id: string | number) => Promise<void>;
}
